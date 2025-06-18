import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkerProfileEntity } from '../../../../../users/infrastructure/persistence/relational/entities/worker-profile.entity';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'service_category',
})
export class ServiceCategoryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToMany(() => WorkerProfileEntity, (worker) => worker.serviceCategories)
  workers: WorkerProfileEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
