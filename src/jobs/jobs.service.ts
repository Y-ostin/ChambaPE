import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity } from './infrastructure/persistence/relational/entities/job.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { ServiceCategoryEntity } from '../services/infrastructure/persistence/relational/entities/service-category.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { FindAllJobsDto } from './dto/find-all-jobs.dto';
import { JobDto } from './dto/job.dto';
import { JobStatus } from './enums/job-status.enum';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ServiceCategoryEntity)
    private readonly serviceCategoryRepository: Repository<ServiceCategoryEntity>,
  ) {}

  async create(userId: number, createJobDto: CreateJobDto): Promise<JobDto> {
    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que la categoría de servicio existe y está activa
    const serviceCategory = await this.serviceCategoryRepository.findOne({
      where: { id: createJobDto.serviceCategoryId },
    });

    if (!serviceCategory) {
      throw new NotFoundException('Categoría de servicio no encontrada');
    }

    if (!serviceCategory.isActive) {
      throw new BadRequestException('La categoría de servicio no está activa');
    }

    // Crear el trabajo
    const job = this.jobRepository.create({
      title: createJobDto.title,
      description: createJobDto.description,
      address: createJobDto.address,
      latitude: createJobDto.latitude,
      longitude: createJobDto.longitude,
      estimatedBudget: createJobDto.estimatedBudget || null,
      preferredDateTime: createJobDto.preferredDateTime
        ? new Date(createJobDto.preferredDateTime)
        : null,
      imageUrls: createJobDto.imageUrls || [],
      notes: createJobDto.notes || null,
      user,
      serviceCategory,
      status: JobStatus.PENDING,
    });

    await this.jobRepository.save(job);

    return this.mapToDto(job);
  }

  async findAll(queryDto: FindAllJobsDto): Promise<{
    data: JobDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      serviceCategoryId,
      search,
      latitude,
      longitude,
      radiusKm = 10,
    } = queryDto;

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.user', 'user')
      .leftJoinAndSelect('job.worker', 'worker')
      .leftJoinAndSelect('job.serviceCategory', 'serviceCategory');

    // Filtros
    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    if (serviceCategoryId) {
      queryBuilder.andWhere('job.serviceCategoryId = :serviceCategoryId', {
        serviceCategoryId,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(job.title ILIKE :search OR job.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Búsqueda geográfica
    if (latitude && longitude) {
      queryBuilder.addSelect(
        `(6371 * acos(cos(radians(:latitude)) * cos(radians(job.latitude)) * cos(radians(job.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(job.latitude))))`,
        'distance',
      );
      queryBuilder.andWhere(
        `(6371 * acos(cos(radians(:latitude)) * cos(radians(job.latitude)) * cos(radians(job.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(job.latitude)))) <= :radiusKm`,
        { latitude, longitude, radiusKm },
      );
      queryBuilder.orderBy('distance', 'ASC');
    } else {
      queryBuilder.orderBy('job.createdAt', 'DESC');
    }

    // Paginación
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return {
      data: jobs.map((job) => this.mapToDto(job)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<JobDto> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['user', 'worker', 'serviceCategory'],
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    return this.mapToDto(job);
  }

  async findByUserId(
    userId: number,
    queryDto: FindAllJobsDto,
  ): Promise<{
    data: JobDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status } = queryDto;

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.user', 'user')
      .leftJoinAndSelect('job.worker', 'worker')
      .leftJoinAndSelect('job.serviceCategory', 'serviceCategory')
      .where('job.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    queryBuilder.orderBy('job.createdAt', 'DESC');

    // Paginación
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return {
      data: jobs.map((job) => this.mapToDto(job)),
      total,
      page,
      limit,
    };
  }

  async update(
    id: number,
    userId: number,
    updateJobDto: UpdateJobDto,
  ): Promise<JobDto> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['user', 'serviceCategory'],
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    // Solo el propietario puede actualizar el trabajo
    if (job.user.id !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este trabajo',
      );
    }

    // No permitir actualizaciones si el trabajo ya está completado o cancelado
    if (
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'No se puede actualizar un trabajo completado o cancelado',
      );
    }

    // Si se actualiza la categoría de servicio, verificar que existe y está activa
    if (updateJobDto.serviceCategoryId) {
      const serviceCategory = await this.serviceCategoryRepository.findOne({
        where: { id: updateJobDto.serviceCategoryId },
      });

      if (!serviceCategory) {
        throw new NotFoundException('Categoría de servicio no encontrada');
      }

      if (!serviceCategory.isActive) {
        throw new BadRequestException(
          'La categoría de servicio no está activa',
        );
      }
    }

    // Actualizar fechas si se proporcionan
    if (updateJobDto.preferredDateTime) {
      updateJobDto.preferredDateTime = new Date(
        updateJobDto.preferredDateTime,
      ) as any;
    }

    await this.jobRepository.update(id, updateJobDto);

    return this.findOne(id);
  }

  async assignWorker(jobId: number, workerId: number): Promise<JobDto> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['user', 'worker'],
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    if (job.status !== JobStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden asignar trabajadores a trabajos pendientes',
      );
    }

    const worker = await this.userRepository.findOne({
      where: { id: workerId },
      relations: ['role'],
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // Verificar que el usuario tiene rol de trabajador (user puede ser trabajador)
    if (!worker.role || worker.role.name !== 'user') {
      throw new BadRequestException('El usuario debe tener rol de trabajador');
    }

    job.worker = worker;
    job.status = JobStatus.ASSIGNED;

    await this.jobRepository.save(job);

    return this.findOne(jobId);
  }

  async updateStatus(jobId: number, status: JobStatus): Promise<JobDto> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    // Validar transiciones de estado
    const validTransitions = this.getValidStatusTransitions(job.status);
    if (!validTransitions.includes(status)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de ${job.status} a ${status}`,
      );
    }

    job.status = status;
    await this.jobRepository.save(job);

    return this.findOne(jobId);
  }

  async remove(id: number, userId: number): Promise<void> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    // Solo el propietario puede eliminar el trabajo
    if (job.user.id !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este trabajo',
      );
    }

    // Solo se pueden eliminar trabajos pendientes
    if (job.status !== JobStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden eliminar trabajos pendientes',
      );
    }

    await this.jobRepository.delete(id);
  }

  private getValidStatusTransitions(currentStatus: JobStatus): JobStatus[] {
    const transitions = {
      [JobStatus.PENDING]: [JobStatus.ASSIGNED, JobStatus.CANCELLED],
      [JobStatus.ASSIGNED]: [JobStatus.IN_PROGRESS, JobStatus.CANCELLED],
      [JobStatus.IN_PROGRESS]: [JobStatus.COMPLETED, JobStatus.DISPUTED],
      [JobStatus.COMPLETED]: [],
      [JobStatus.CANCELLED]: [],
      [JobStatus.DISPUTED]: [JobStatus.COMPLETED, JobStatus.CANCELLED],
    };

    return transitions[currentStatus] || [];
  }

  private mapToDto(job: JobEntity): JobDto {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      latitude: job.latitude,
      longitude: job.longitude,
      address: job.address,
      estimatedBudget: job.estimatedBudget || undefined,
      preferredDateTime: job.preferredDateTime || undefined,
      imageUrls: job.imageUrls,
      notes: job.notes || undefined,
      user: job.user,
      worker: job.worker || undefined,
      serviceCategory: job.serviceCategory
        ? {
            id: job.serviceCategory.id,
            name: job.serviceCategory.name,
            description: job.serviceCategory.description || undefined,
            iconUrl: job.serviceCategory.iconUrl || undefined,
            isActive: job.serviceCategory.isActive,
            createdAt: job.serviceCategory.createdAt,
            updatedAt: job.serviceCategory.updatedAt,
          }
        : ({} as any),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
