import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobMatchEntity } from './infrastructure/persistence/relational/entities/job-match.entity';
import { JobEntity } from '../jobs/infrastructure/persistence/relational/entities/job.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { WorkerProfileEntity } from '../users/infrastructure/persistence/relational/entities/worker-profile.entity';
import { FindMatchesDto } from './dto/find-matches.dto';
import { ApplyToJobDto } from './dto/apply-to-job.dto';
import { JobMatchDto } from './dto/job-match.dto';
import { JobStatus } from '../jobs/enums/job-status.enum';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(JobMatchEntity)
    private readonly jobMatchRepository: Repository<JobMatchEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkerProfileEntity)
    private readonly workerProfileRepository: Repository<WorkerProfileEntity>,
  ) {}

  async findMatchesForWorker(
    workerId: number,
    queryDto: FindMatchesDto,
  ): Promise<JobMatchDto[]> {
    const {
      radiusKm = 10,
      minScore = 60,
      limit = 20,
      jobStatus = JobStatus.PENDING,
    } = queryDto;

    // Verificar que el trabajador existe
    const worker = await this.userRepository.findOne({
      where: { id: workerId },
      relations: ['role'],
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // Obtener perfil del trabajador
    const workerProfile = await this.workerProfileRepository.findOne({
      where: { user: { id: workerId } },
      relations: ['user', 'serviceCategories'],
    });

    if (!workerProfile) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    // Buscar trabajos compatibles
    const matches = await this.findCompatibleJobs(workerProfile, {
      radiusKm,
      minScore,
      limit,
      jobStatus,
    });

    return matches;
  }

  async findMatchesForJob(
    jobId: number,
    queryDto: FindMatchesDto,
  ): Promise<JobMatchDto[]> {
    const { radiusKm = 10, minScore = 60, limit = 20 } = queryDto;

    // Verificar que el trabajo existe
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['user', 'serviceCategory'],
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    // Buscar trabajadores compatibles
    const matches = await this.findCompatibleWorkers(job, {
      radiusKm,
      minScore,
      limit,
    });

    return matches;
  }

  async applyToJob(
    workerId: number,
    jobId: number,
    applyDto: ApplyToJobDto,
  ): Promise<JobMatchDto> {
    // Verificar que el trabajador existe
    const worker = await this.userRepository.findOne({
      where: { id: workerId },
    });

    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    // Verificar que el trabajo existe y está disponible
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['user', 'serviceCategory'],
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    if (job.status !== JobStatus.PENDING) {
      throw new BadRequestException(
        'El trabajo no está disponible para aplicaciones',
      );
    }

    // Verificar que el trabajador no sea el mismo usuario que creó el trabajo
    if (job.user.id === workerId) {
      throw new BadRequestException('No puedes aplicar a tu propio trabajo');
    }

    // Buscar si ya existe un match
    const existingMatch = await this.jobMatchRepository.findOne({
      where: { job: { id: jobId }, worker: { id: workerId } },
      relations: ['job', 'worker'],
    });

    if (existingMatch) {
      if (existingMatch.isApplied) {
        throw new BadRequestException('Ya has aplicado a este trabajo');
      }

      // Actualizar match existente
      existingMatch.isApplied = true;
      existingMatch.appliedAt = new Date();
      existingMatch.applicationMessage = applyDto.message;
      existingMatch.proposedBudget = applyDto.proposedBudget;

      await this.jobMatchRepository.save(existingMatch);
      return this.mapToDto(existingMatch);
    }

    // Crear nuevo match si no existe
    const workerProfile = await this.workerProfileRepository.findOne({
      where: { user: { id: workerId } },
      relations: ['serviceCategories'],
    });

    if (!workerProfile) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    const { score, distance } = await this.calculateMatchScore(
      job,
      workerProfile,
    );

    const newMatch = this.jobMatchRepository.create({
      job,
      worker,
      score,
      distance,
      isApplied: true,
      appliedAt: new Date(),
      applicationMessage: applyDto.message,
      proposedBudget: applyDto.proposedBudget,
    });

    await this.jobMatchRepository.save(newMatch);
    return this.mapToDto(newMatch);
  }

  private async findCompatibleJobs(
    workerProfile: WorkerProfileEntity,
    options: {
      radiusKm: number;
      minScore: number;
      limit: number;
      jobStatus: JobStatus;
    },
  ): Promise<JobMatchDto[]> {
    const { minScore, limit, jobStatus } = options;

    // Obtener IDs de categorías de servicios del trabajador
    const serviceCategoryIds = workerProfile.serviceCategories.map(
      (sc) => sc.id,
    );

    if (serviceCategoryIds.length === 0) {
      return [];
    }

    // Buscar trabajos compatibles con consulta geográfica
    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.user', 'user')
      .leftJoinAndSelect('job.serviceCategory', 'serviceCategory')
      .where('job.status = :status', { status: jobStatus })
      .andWhere('job.serviceCategoryId IN (:...categoryIds)', {
        categoryIds: serviceCategoryIds,
      })
      .andWhere('job.userId != :workerId', { workerId: workerProfile.user.id })
      // TODO: Agregar filtro geográfico cuando las coordenadas estén disponibles
      // .andWhere(
      //   `ST_DWithin(
      //     ST_MakePoint(job.longitude, job.latitude)::geography,
      //     ST_MakePoint(:longitude, :latitude)::geography,
      //     :radius
      //   )`,
      //   {
      //     longitude: 0, // TODO: workerProfile.user.longitude,
      //     latitude: 0, // TODO: workerProfile.user.latitude,
      //     radius: radiusKm * 1000, // Convertir a metros
      //   },
      // )
      .limit(limit * 2) // Obtenemos más para filtrar por score después
      .getMany();

    // Calcular scores y crear matches
    const matches: JobMatchDto[] = [];

    for (const job of jobs) {
      const { score, distance } = await this.calculateMatchScore(
        job,
        workerProfile,
      );

      if (score >= minScore) {
        // Verificar si ya existe aplicación
        const existingMatch = await this.jobMatchRepository.findOne({
          where: { job: { id: job.id }, worker: { id: workerProfile.user.id } },
        });

        const match: JobMatchDto = {
          id: existingMatch?.id || 0,
          job: this.mapJobToDto(job),
          worker: this.mapUserToDto(workerProfile.user),
          score,
          distance,
          isApplied: existingMatch?.isApplied || false,
          appliedAt: existingMatch?.appliedAt,
          createdAt: existingMatch?.createdAt || new Date(),
          updatedAt: existingMatch?.updatedAt || new Date(),
        };

        matches.push(match);
      }
    }

    // Ordenar por score descendente
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit);
  }

  private async findCompatibleWorkers(
    job: JobEntity,
    options: { radiusKm: number; minScore: number; limit: number },
  ): Promise<JobMatchDto[]> {
    const { radiusKm, minScore, limit } = options;

    // Buscar trabajadores que ofrecen la categoría de servicio del trabajo
    const workerProfiles = await this.workerProfileRepository
      .createQueryBuilder('workerProfile')
      .leftJoinAndSelect('workerProfile.user', 'user')
      .leftJoinAndSelect('workerProfile.serviceCategories', 'serviceCategories')
      .where('serviceCategories.id = :categoryId', {
        categoryId: job.serviceCategory.id,
      })
      .andWhere('workerProfile.isActive = true')
      .andWhere('user.id != :userId', { userId: job.user.id })
      .andWhere(
        `ST_DWithin(
          ST_MakePoint(workerProfile.longitude, workerProfile.latitude)::geography,
          ST_MakePoint(:longitude, :latitude)::geography,
          :radius
        )`,
        {
          longitude: job.longitude,
          latitude: job.latitude,
          radius: radiusKm * 1000, // Convertir a metros
        },
      )
      .limit(limit * 2)
      .getMany();

    // Calcular scores y crear matches
    const matches: JobMatchDto[] = [];

    for (const workerProfile of workerProfiles) {
      const { score, distance } = await this.calculateMatchScore(
        job,
        workerProfile,
      );

      if (score >= minScore) {
        // Verificar si ya existe aplicación
        const existingMatch = await this.jobMatchRepository.findOne({
          where: { job: { id: job.id }, worker: { id: workerProfile.user.id } },
        });

        const match: JobMatchDto = {
          id: existingMatch?.id || 0,
          job: this.mapJobToDto(job),
          worker: this.mapUserToDto(workerProfile.user),
          score,
          distance,
          isApplied: existingMatch?.isApplied || false,
          appliedAt: existingMatch?.appliedAt,
          createdAt: existingMatch?.createdAt || new Date(),
          updatedAt: existingMatch?.updatedAt || new Date(),
        };

        matches.push(match);
      }
    }

    // Ordenar por score descendente
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit);
  }

  private async calculateMatchScore(
    job: JobEntity,
    workerProfile: WorkerProfileEntity,
  ): Promise<{ score: number; distance: number }> {
    // Calcular distancia usando PostGIS
    const result = await this.jobRepository.query(
      `SELECT ST_Distance(
        ST_MakePoint($1, $2)::geography,
        ST_MakePoint($3, $4)::geography
      ) / 1000 as distance_km`,
      [
        job.longitude || 0,
        job.latitude || 0,
        0, // TODO: workerProfile.user.longitude,
        0, // TODO: workerProfile.user.latitude,
      ],
    );

    const distance = parseFloat(result[0].distance_km);

    // Algoritmo de scoring
    let score = 0;

    // 1. Compatibilidad de servicio (40 puntos)
    const hasMatchingService = workerProfile.serviceCategories.some(
      (sc) => sc.id === job.serviceCategory.id,
    );
    if (hasMatchingService) {
      score += 40;
    }

    // 2. Proximidad geográfica (30 puntos)
    if (distance <= 2) {
      score += 30;
    } else if (distance <= 5) {
      score += 25;
    } else if (distance <= 10) {
      score += 20;
    } else if (distance <= 20) {
      score += 10;
    }

    // 3. Disponibilidad del trabajador (15 puntos)
    if (workerProfile.isActiveToday && workerProfile.isVerified) {
      score += 15;
    }

    // 4. Calificación del trabajador (15 puntos)
    // Usamos ratingAverage que existe en WorkerProfileEntity
    score += Math.min(workerProfile.ratingAverage * 3, 15);

    return {
      score: Math.round(score),
      distance: Math.round(distance * 100) / 100,
    };
  }

  private mapToDto(jobMatch: JobMatchEntity): JobMatchDto {
    return {
      id: jobMatch.id,
      job: this.mapJobToDto(jobMatch.job),
      worker: this.mapUserToDto(jobMatch.worker),
      score: jobMatch.score,
      distance: jobMatch.distance,
      isApplied: jobMatch.isApplied,
      appliedAt: jobMatch.appliedAt,
      createdAt: jobMatch.createdAt,
      updatedAt: jobMatch.updatedAt,
    };
  }

  private mapJobToDto(job: JobEntity): any {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      address: job.address,
      latitude: job.latitude,
      longitude: job.longitude,
      estimatedBudget: job.estimatedBudget,
      status: job.status,
      createdAt: job.createdAt,
      serviceCategory: job.serviceCategory,
    };
  }

  private mapUserToDto(user: UserEntity): any {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      photo: user.photo,
    };
  }
}
