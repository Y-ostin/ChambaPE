import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'user_profile',
})
export class UserProfileEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => UserEntity, {
    eager: true,
  })
  @JoinColumn()
  @Index()
  user: UserEntity;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  @Index()
  longitude: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAverage: number;

  @Column({ type: 'integer', default: 0 })
  totalJobsPosted: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
