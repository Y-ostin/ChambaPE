import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferEntity } from './infrastructure/persistence/relational/entities/offer.entity';
import { JobEntity } from '../jobs/infrastructure/persistence/relational/entities/job.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { WorkerProfileEntity } from '../users/infrastructure/persistence/relational/entities/worker-profile.entity';
import { MatchingService } from '../matching/matching.service';
import { OfferStatus } from './enums/offer-status.enum';
import { OfferDto } from './dto/offer.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(OfferEntity)
    private readonly offerRepository: Repository<OfferEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkerProfileEntity)
    private readonly workerProfileRepository: Repository<WorkerProfileEntity>,
    private readonly matchingService: MatchingService,
  ) {}

  /**
   * Crear oferta automática para el worker más apto
   * Este método se llama cuando un cliente publica un trabajo
   */
  async createAutomaticOffer(jobId: number): Promise<OfferDto | null> {
    // Buscar el trabajo
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['user', 'serviceCategory'],
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    // Buscar workers compatibles usando el servicio de matching
    const matches = await this.matchingService.findMatchesForJob(jobId, {
      radiusKm: 50,
      minScore: 50,
      limit: 10,
    });

    if (matches.length === 0) {
      // No hay workers disponibles
      return null;
    }

    // Ordenar por score descendente (ya viene ordenado del matching)
    const bestMatch = matches[0];

    // Verificar si ya existe una oferta pendiente para este trabajo
    const existingOffer = await this.offerRepository.findOne({
      where: {
        job: { id: jobId },
        status: OfferStatus.PENDING,
      },
    });

    if (existingOffer) {
      // Ya hay una oferta pendiente
      return this.mapToDto(existingOffer);
    }

    // Crear nueva oferta
    const offer = this.offerRepository.create({
      job,
      worker: { id: bestMatch.worker.id } as UserEntity,
      status: OfferStatus.PENDING,
      proposedBudget: job.estimatedBudget,
      message: `¡Hola! Te ofrecemos el trabajo "${job.title}". ¿Te interesa?`,
      matchingScore: bestMatch.score,
      distance: bestMatch.distance,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    });

    const savedOffer = await this.offerRepository.save(offer);

    // TODO: Enviar notificación al worker
    
    return this.mapToDto(savedOffer);
  }

  /**
   * Worker acepta una oferta
   */
  async acceptOffer(
    offerId: number,
    workerId: number,
    acceptDto: AcceptOfferDto,
  ): Promise<OfferDto> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: ['job', 'worker'],
    });

    if (!offer) {
      throw new NotFoundException('Oferta no encontrada');
    }

    if (offer.worker.id !== workerId) {
      throw new ForbiddenException('No tienes permiso para aceptar esta oferta');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Esta oferta ya no está disponible');
    }

    if (offer.expiresAt && new Date() > offer.expiresAt) {
      // Marcar como expirada
      offer.status = OfferStatus.EXPIRED;
      await this.offerRepository.save(offer);
      throw new BadRequestException('Esta oferta ha expirado');
    }

    // Aceptar la oferta
    offer.status = OfferStatus.ACCEPTED;
    offer.respondedAt = new Date();
    if (acceptDto.message) {
      offer.message = acceptDto.message;
    }

    // Actualizar el estado del trabajo a "en progreso"
    offer.job.status = 'in_progress';
    await this.jobRepository.save(offer.job);

    const savedOffer = await this.offerRepository.save(offer);

    // TODO: Notificar al cliente que se aceptó la oferta
    
    return this.mapToDto(savedOffer);
  }

  /**
   * Worker rechaza una oferta
   */
  async rejectOffer(
    offerId: number,
    workerId: number,
    rejectDto: RejectOfferDto,
  ): Promise<void> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: ['job', 'worker'],
    });

    if (!offer) {
      throw new NotFoundException('Oferta no encontrada');
    }

    if (offer.worker.id !== workerId) {
      throw new ForbiddenException('No tienes permiso para rechazar esta oferta');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Esta oferta ya no está disponible');
    }

    // Rechazar la oferta
    offer.status = OfferStatus.REJECTED;
    offer.respondedAt = new Date();
    offer.rejectionReason = rejectDto.reason;

    await this.offerRepository.save(offer);

    // TODO: Buscar al siguiente worker más apto y enviarle la oferta
    await this.createOfferForNextWorker(offer.job.id);
  }

  /**
   * Buscar al siguiente worker y enviarle la oferta
   */
  private async createOfferForNextWorker(jobId: number): Promise<void> {
    // Buscar workers ya rechazados para este trabajo
    const rejectedWorkerIds = await this.offerRepository
      .createQueryBuilder('offer')
      .select('offer.worker.id', 'workerId')
      .where('offer.job.id = :jobId', { jobId })
      .andWhere('offer.status IN (:...statuses)', {
        statuses: [OfferStatus.REJECTED, OfferStatus.EXPIRED],
      })
      .getRawMany();

    const excludedWorkerIds = rejectedWorkerIds.map(r => r.workerId);

    // Buscar matches excluyendo workers ya contactados
    const matches = await this.matchingService.findMatchesForJob(jobId, {
      radiusKm: 50,
      minScore: 50,
      limit: 20,
    });

    // Filtrar workers ya contactados
    const availableMatches = matches.filter(
      match => !excludedWorkerIds.includes(match.worker.id)
    );

    if (availableMatches.length > 0) {
      const nextWorker = availableMatches[0];
      
      const job = await this.jobRepository.findOne({
        where: { id: jobId },
        relations: ['user', 'serviceCategory'],
      });

      // Crear oferta para el siguiente worker
      const offer = this.offerRepository.create({
        job,
        worker: { id: nextWorker.worker.id } as UserEntity,
        status: OfferStatus.PENDING,
        proposedBudget: job.estimatedBudget,
        message: `¡Hola! Te ofrecemos el trabajo "${job.title}". ¿Te interesa?`,
        matchingScore: nextWorker.score,
        distance: nextWorker.distance,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await this.offerRepository.save(offer);
      
      // TODO: Enviar notificación al worker
    }
  }

  /**
   * Obtener ofertas de un worker
   */
  async getWorkerOffers(
    workerId: number,
    status?: OfferStatus,
  ): Promise<OfferDto[]> {
    const queryBuilder = this.offerRepository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.job', 'job')
      .leftJoinAndSelect('job.user', 'client')
      .leftJoinAndSelect('job.serviceCategory', 'serviceCategory')
      .leftJoinAndSelect('offer.worker', 'worker')
      .where('offer.worker.id = :workerId', { workerId })
      .orderBy('offer.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('offer.status = :status', { status });
    }

    const offers = await queryBuilder.getMany();
    return offers.map(offer => this.mapToDto(offer));
  }

  /**
   * Marcar oferta como completada (cuando el trabajo termina)
   */
  async completeOffer(offerId: number): Promise<OfferDto> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: ['job', 'worker'],
    });

    if (!offer) {
      throw new NotFoundException('Oferta no encontrada');
    }

    if (offer.status !== OfferStatus.ACCEPTED) {
      throw new BadRequestException('Solo se pueden completar ofertas aceptadas');
    }

    offer.status = OfferStatus.COMPLETED;
    offer.job.status = 'completed';

    await this.offerRepository.save(offer);
    await this.jobRepository.save(offer.job);

    return this.mapToDto(offer);
  }

  private mapToDto(offer: OfferEntity): OfferDto {
    return {
      id: offer.id,
      jobId: offer.job.id,
      jobTitle: offer.job.title,
      jobDescription: offer.job.description,
      workerId: offer.worker.id,
      workerName: `${offer.worker.firstName} ${offer.worker.lastName}`,
      status: offer.status,
      proposedBudget: offer.proposedBudget,
      message: offer.message,
      rejectionReason: offer.rejectionReason,
      matchingScore: offer.matchingScore,
      distance: offer.distance,
      createdAt: offer.createdAt,
      respondedAt: offer.respondedAt,
      expiresAt: offer.expiresAt,
    };
  }
}
