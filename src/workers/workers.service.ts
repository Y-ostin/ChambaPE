import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WorkerProfileEntity } from '../users/infrastructure/persistence/relational/entities/worker-profile.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { UserProfileEntity } from '../users/infrastructure/persistence/relational/entities/user-profile.entity';
import { ServiceCategoryEntity } from '../services/infrastructure/persistence/relational/entities/service-category.entity';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { FindNearbyWorkersDto } from './dto/find-nearby-workers.dto';
import { ManageWorkerServicesDto } from './dto/manage-worker-services.dto';
import { WorkerDto } from './dto/worker.dto';
import { RoleEnum } from '../roles/roles.enum';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(WorkerProfileEntity)
    private readonly workerProfileRepository: Repository<WorkerProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(ServiceCategoryEntity)
    private readonly serviceCategoryRepository: Repository<ServiceCategoryEntity>,
  ) {}

  async create(
    userId: number,
    createWorkerDto: CreateWorkerDto,
  ): Promise<WorkerDto> {
    console.log('🔧 WorkersService.create - userId:', userId);
    console.log('🔧 WorkersService.create - createWorkerDto:', createWorkerDto);
    console.log('🔧 WorkersService.create - radiusKm tipo:', typeof createWorkerDto.radiusKm);
    console.log('🔧 WorkersService.create - radiusKm valor:', createWorkerDto.radiusKm);
    
    // Verificar si el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si ya tiene perfil de trabajador
    const existingWorker = await this.workerProfileRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingWorker) {
      throw new ConflictException(
        'El usuario ya está registrado como trabajador',
      );
    }

    // Verificar categorías de servicio si se proporcionan
    if (createWorkerDto.serviceCategories?.length) {
      const categories = await this.serviceCategoryRepository.findBy({
        id: In(createWorkerDto.serviceCategories),
        isActive: true,
      });

      if (categories.length !== createWorkerDto.serviceCategories.length) {
        throw new BadRequestException(
          'Una o más categorías de servicio no son válidas',
        );
      }
    }

    // Crear perfil de trabajador
    console.log('🔧 Creando perfil de trabajador con radiusKm:', createWorkerDto.radiusKm || 10);
    const workerProfile = this.workerProfileRepository.create({
      user,
      description: createWorkerDto.description,
      radiusKm: createWorkerDto.radiusKm || 10,
      certificatePdfUrl: createWorkerDto.certificatePdfUrl,
      dniNumber: createWorkerDto.dniNumber,
      criminalRecordUrl: createWorkerDto.criminalRecordUrl,
      certificatesUrls: createWorkerDto.certificatesUrls,
      dniFrontalUrl: createWorkerDto.dniFrontalUrl,
      dniPosteriorUrl: createWorkerDto.dniPosteriorUrl,
    });

    await this.workerProfileRepository.save(workerProfile);

    // Crear o actualizar perfil de usuario con ubicación si se proporciona
    if (createWorkerDto.latitude && createWorkerDto.longitude) {
      let userProfile = await this.userProfileRepository.findOne({
        where: { user: { id: userId } },
      });

      if (userProfile) {
        // Actualizar perfil existente
        userProfile.address = createWorkerDto.address || userProfile.address;
        userProfile.latitude = createWorkerDto.latitude;
        userProfile.longitude = createWorkerDto.longitude;
      } else {
        // Crear nuevo perfil
        userProfile = this.userProfileRepository.create({
          user,
          address: createWorkerDto.address || 'Dirección no especificada',
          latitude: createWorkerDto.latitude,
          longitude: createWorkerDto.longitude,
        });
      }

      await this.userProfileRepository.save(userProfile);
    }

    // Actualizar rol del usuario a worker
    user.role = { id: RoleEnum.worker } as any;
    await this.userRepository.save(user);

    return this.findByUserId(userId);
  }

  async findNearby(findNearbyDto: FindNearbyWorkersDto): Promise<WorkerDto[]> {
    const {
      latitude,
      longitude,
      radiusKm = 50,
      verifiedOnly,
      activeToday,
    } = findNearbyDto;

    let query = this.workerProfileRepository
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .where('user.roleId = :roleId', { roleId: RoleEnum.worker })
      .andWhere('user.deletedAt IS NULL');

    // Filtro geográfico con UserProfile
    if (latitude && longitude) {
      query = query
        .andWhere('userProfile.latitude IS NOT NULL')
        .andWhere('userProfile.longitude IS NOT NULL')
        .andWhere(
          `(
            6371 * acos(
              cos(radians(:latitude)) * 
              cos(radians(userProfile.latitude)) * 
              cos(radians(userProfile.longitude) - radians(:longitude)) + 
              sin(radians(:latitude)) * 
              sin(radians(userProfile.latitude))
            )
          ) <= :radiusKm`,
          { latitude, longitude, radiusKm },
        );

      // Agregar cálculo de distancia
      query = query.addSelect(
        `(
          6371 * acos(
            cos(radians(:latitude)) * 
            cos(radians(userProfile.latitude)) * 
            cos(radians(userProfile.longitude) - radians(:longitude)) + 
            sin(radians(:latitude)) * 
            sin(radians(userProfile.latitude))
          )
        )`,
        'distance',
      );

      query = query.orderBy('distance', 'ASC');
    } else {
      query = query.orderBy('worker.createdAt', 'DESC');
    }

    if (verifiedOnly) {
      query = query.andWhere('worker.isVerified = :verified', {
        verified: true,
      });
    }

    if (activeToday) {
      query = query.andWhere('worker.isActiveToday = :active', {
        active: true,
      });
    }

    const workers = await query.getRawAndEntities();

    return workers.entities.map((worker, index) => ({
      ...this.mapToDto(worker),
      distance:
        latitude && longitude
          ? parseFloat(workers.raw[index]?.distance || '0')
          : 0,
    }));
  }

  async findByUserId(userId: number): Promise<WorkerDto> {
    const worker = await this.workerProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'user.role', 'serviceCategories'],
    });

    if (!worker) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    return this.mapToDto(worker);
  }

  async findOne(id: number): Promise<WorkerDto> {
    const worker = await this.workerProfileRepository.findOne({
      where: { id },
      relations: ['user', 'user.role', 'serviceCategories'],
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    return this.mapToDto(worker);
  }

  async findAll(): Promise<WorkerDto[]> {
    const workers = await this.workerProfileRepository.find({
      relations: ['user', 'user.role', 'serviceCategories'],
      order: { createdAt: 'DESC' },
    });

    return workers.map((worker) => this.mapToDto(worker));
  }

  async update(
    userId: number,
    updateWorkerDto: UpdateWorkerDto,
  ): Promise<WorkerDto> {
    const worker = await this.workerProfileRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!worker) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    // Separar las categorías de servicios del resto de datos
    const { serviceCategories, ...updateData } = updateWorkerDto;

    // Actualizar datos básicos del trabajador
    await this.workerProfileRepository.update(worker.id, updateData);

    // Si se especificaron categorías de servicios, actualizarlas por separado
    if (serviceCategories && serviceCategories.length > 0) {
      await this.updateWorkerServices(worker.id, {
        serviceCategoryIds: serviceCategories,
      });
    }

    return this.findByUserId(userId);
  }

  async toggleActiveToday(userId: number): Promise<WorkerDto> {
    const worker = await this.workerProfileRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!worker) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    await this.workerProfileRepository.update(worker.id, {
      isActiveToday: !worker.isActiveToday,
    });

    return this.findByUserId(userId);
  }

  async updateLocation(
    userId: number,
    latitude: number,
    longitude: number,
  ): Promise<WorkerDto> {
    console.log('📍 WorkersService.updateLocation - userId:', userId);
    console.log('📍 WorkersService.updateLocation - latitude:', latitude);
    console.log('📍 WorkersService.updateLocation - longitude:', longitude);
    console.log('📍 WorkersService.updateLocation - tipo latitude:', typeof latitude);
    console.log('📍 WorkersService.updateLocation - tipo longitude:', typeof longitude);
    
    const worker = await this.workerProfileRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!worker) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    await this.workerProfileRepository.update(worker.id, {
      latitude,
      longitude,
    });

    return this.findByUserId(userId);
  }

  async verifyWorker(id: number): Promise<WorkerDto> {
    const worker = await this.workerProfileRepository.findOne({
      where: { id },
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    await this.workerProfileRepository.update(id, {
      isVerified: true,
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const worker = await this.workerProfileRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // Cambiar rol del usuario de vuelta a user
    worker.user.role = { id: RoleEnum.user } as any;
    await this.userRepository.save(worker.user);

    // Eliminar perfil de trabajador
    await this.workerProfileRepository.delete(id);
  }

  async addWorkerServices(
    workerId: number,
    manageServicesDto: ManageWorkerServicesDto,
  ): Promise<WorkerDto> {
    const worker = await this.workerProfileRepository.findOne({
      where: { id: workerId },
      relations: ['serviceCategories', 'user'],
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // Verificar que las categorías existen
    const categories = await this.serviceCategoryRepository.find({
      where: { id: In(manageServicesDto.serviceCategoryIds) },
    });

    if (categories.length !== manageServicesDto.serviceCategoryIds.length) {
      throw new BadRequestException(
        'Una o más categorías de servicio no existen',
      );
    }

    // Agregar nuevas categorías (evitar duplicados)
    const existingCategoryIds = worker.serviceCategories.map((cat) => cat.id);
    const newCategories = categories.filter(
      (cat) => !existingCategoryIds.includes(cat.id),
    );

    worker.serviceCategories.push(...newCategories);
    await this.workerProfileRepository.save(worker);

    return this.mapToDto(worker);
  }

  async updateWorkerServices(
    workerId: number,
    manageServicesDto: ManageWorkerServicesDto,
  ): Promise<WorkerDto> {
    const worker = await this.workerProfileRepository.findOne({
      where: { id: workerId },
      relations: ['serviceCategories', 'user'],
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // Verificar que las categorías existen
    const categories = await this.serviceCategoryRepository.find({
      where: { id: In(manageServicesDto.serviceCategoryIds) },
    });

    if (categories.length !== manageServicesDto.serviceCategoryIds.length) {
      throw new BadRequestException(
        'Una o más categorías de servicio no existen',
      );
    }

    // Reemplazar todas las categorías
    worker.serviceCategories = categories;
    await this.workerProfileRepository.save(worker);

    return this.mapToDto(worker);
  }

  async removeWorkerServices(
    workerId: number,
    manageServicesDto: ManageWorkerServicesDto,
  ): Promise<WorkerDto> {
    const worker = await this.workerProfileRepository.findOne({
      where: { id: workerId },
      relations: ['serviceCategories', 'user'],
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // Remover las categorías especificadas
    worker.serviceCategories = worker.serviceCategories.filter(
      (cat) => !manageServicesDto.serviceCategoryIds.includes(cat.id),
    );

    await this.workerProfileRepository.save(worker);

    return this.mapToDto(worker);
  }

  async getWorkerServices(workerId: number): Promise<ServiceCategoryEntity[]> {
    const worker = await this.workerProfileRepository.findOne({
      where: { id: workerId },
      relations: ['serviceCategories'],
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    return worker.serviceCategories;
  }

  async findByDniNumber(dniNumber: string): Promise<WorkerDto | null> {
    const worker = await this.workerProfileRepository.findOne({
      where: { dniNumber },
      relations: ['user', 'user.role', 'serviceCategories'],
    });

    return worker ? this.mapToDto(worker) : null;
  }

  private mapToDto(worker: WorkerProfileEntity): WorkerDto {
    return {
      id: worker.id,
      user: worker.user,
      description: worker.description || undefined,
      radiusKm: worker.radiusKm,
      ratingAverage: parseFloat(worker.ratingAverage.toString()),
      totalJobsCompleted: worker.totalJobsCompleted,
      isVerified: worker.isVerified,
      isActiveToday: worker.isActiveToday,
      monthlySubscriptionStatus: worker.monthlySubscriptionStatus,
      subscriptionExpiresAt: worker.subscriptionExpiresAt || undefined,
      certificatesUrls: worker.certificatesUrls,
      serviceCategories: worker.serviceCategories?.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || undefined,
        iconUrl: cat.iconUrl || undefined,
        isActive: cat.isActive,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    };
  }
}
