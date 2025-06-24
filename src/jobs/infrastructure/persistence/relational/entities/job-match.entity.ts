import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { JobEntity } from './job.entity';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

export enum JobMatchStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity({
  name: 'job_match',
})
export class JobMatchEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobEntity, {
    eager: true,
  })
  @JoinColumn()
  @Index()
  job: JobEntity;

  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  @JoinColumn()
  @Index()
  worker: UserEntity;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  distanceKm: number;

  @Column({ type: 'integer' })
  compatibilityScore: number;

  @Column({ type: 'timestamp' })
  notifiedAt: Date;

  @Column({
    type: 'enum',
    enum: JobMatchStatus,
    default: JobMatchStatus.PENDING,
  })
  @Index()
  responseStatus: JobMatchStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
