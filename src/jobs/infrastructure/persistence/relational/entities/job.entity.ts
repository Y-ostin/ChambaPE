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
import { ServiceCategoryEntity } from '../../../../../services/infrastructure/persistence/relational/entities/service-category.entity';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

export enum JobStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

@Entity({
  name: 'job',
})
@Index(['latitude', 'longitude'])
export class JobEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  @JoinColumn()
  @Index()
  user: UserEntity;

  @ManyToOne(() => UserEntity, {
    eager: false,
    nullable: true,
  })
  @JoinColumn()
  @Index()
  worker: UserEntity | null;

  @ManyToOne(() => ServiceCategoryEntity, {
    eager: true,
  })
  @JoinColumn()
  @Index()
  serviceCategory: ServiceCategoryEntity;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 300 })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  @Index()
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedBudget: number | null;

  @Column({ type: 'timestamp', nullable: true })
  preferredDateTime: Date | null;

  @Column({ type: 'json', nullable: true })
  imageUrls: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  @Index()
  status: JobStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
