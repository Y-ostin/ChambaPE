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
import { JobEntity } from '../../../../../jobs/infrastructure/persistence/relational/entities/job.entity';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  YAPE = 'yape',
  PLIN = 'plin',
  BANK_TRANSFER = 'bank_transfer',
}

@Entity({
  name: 'payment',
})
export class PaymentEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobEntity, {
    eager: true,
  })
  @JoinColumn()
  @Index()
  job: JobEntity;

  @ManyToOne(() => UserEntity, {
    eager: false,
  })
  @JoinColumn()
  @Index()
  fromUser: UserEntity;

  @ManyToOne(() => UserEntity, {
    eager: false,
  })
  @JoinColumn()
  @Index()
  toUser: UserEntity;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionPercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 100 })
  transactionId: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @Index()
  status: PaymentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
