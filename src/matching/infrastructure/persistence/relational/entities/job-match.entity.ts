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
  // Usamos nombre camelCase para coincidir con la columna existente en la DB ("jobId")
  @JoinColumn({ name: 'jobId' })
  job: JobEntity;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  // Nombre camelCase para coincidir con la columna "workerId" en la tabla
  @JoinColumn({ name: 'workerId' })
  worker: UserEntity;

  // La columna real en la tabla es "compatibilityScore"
  @Column({
    name: 'compatibilityScore',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  score: number;

  // La columna real es "distanceKm"
  @Column({ name: 'distanceKm', type: 'decimal', precision: 10, scale: 2 })
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
