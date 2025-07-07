import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ServiceCategoryEntity } from '../../../../../services/infrastructure/persistence/relational/entities/service-category.entity';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

export enum WorkerSubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  PENDING_PAYMENT = 'pending_payment',
}

@Entity({
  name: 'worker_profile',
})
export class WorkerProfileEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => UserEntity, {
    eager: true,
  })
  @JoinColumn()
  @Index()
  user: UserEntity;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isActiveToday: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAverage: number;

  @Column({ type: 'integer', default: 0 })
  totalJobsCompleted: number;

  @Column({ type: 'integer', default: 10 })
  radiusKm: number;

  @Column({
    type: 'enum',
    enum: WorkerSubscriptionStatus,
    default: WorkerSubscriptionStatus.PENDING_PAYMENT,
  })
  monthlySubscriptionStatus: WorkerSubscriptionStatus;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionExpiresAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  certificatePdfUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  criminalRecordUrl: string | null;

  @Column({ type: 'json', nullable: true })
  certificatesUrls: string[];

  @Column({ type: 'varchar', length: 20, nullable: true })
  dniNumber: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany(() => ServiceCategoryEntity)
  @JoinTable({
    name: 'worker_service_categories',
    joinColumn: {
      name: 'worker_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'service_category_id',
      referencedColumnName: 'id',
    },
  })
  serviceCategories: ServiceCategoryEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  dniFrontalUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  dniPosteriorUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;
}
