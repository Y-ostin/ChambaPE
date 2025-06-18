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

@Entity({
  name: 'rating',
})
export class RatingEntity extends EntityRelationalHelper {
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

  @Column({ type: 'integer', width: 1 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
