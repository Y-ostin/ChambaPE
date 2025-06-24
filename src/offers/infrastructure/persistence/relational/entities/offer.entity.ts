import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { JobEntity } from '../../../../../jobs/infrastructure/persistence/relational/entities/job.entity';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { OfferStatus } from '../../../../enums/offer-status.enum';

@Entity({ name: 'offers' })
@Index(['job', 'worker'])
@Index(['status', 'createdAt'])
export class OfferEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: JobEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker: UserEntity;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.PENDING,
  })
  status: OfferStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  proposedBudget: number;

  @Column('text', { nullable: true })
  message: string;

  @Column('text', { nullable: true })
  rejectionReason: string;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column('int', {
    default: 0,
    comment: 'Score de matching cuando se envió la oferta',
  })
  matchingScore: number;

  @Column('decimal', {
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Distancia en km',
  })
  distance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
