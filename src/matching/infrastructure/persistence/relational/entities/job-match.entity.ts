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
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { JobEntity } from '../../../../../jobs/infrastructure/persistence/relational/entities/job.entity';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Entity({
  name: 'job_match',
})
@Index(['job', 'worker'], { unique: true })
export class JobMatchEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'job_id' })
  job: JobEntity;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'worker_id' })
  worker: UserEntity;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distance: number;

  @Column({ type: 'boolean', default: false })
  isApplied: boolean;

  @Column({ type: 'timestamp', nullable: true })
  appliedAt?: Date;

  @Column({ type: 'text', nullable: true })
  applicationMessage?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  proposedBudget?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
