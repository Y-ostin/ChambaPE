import { Allow } from 'class-validator';
import { Job } from '../../jobs/domain/job';
import { User } from '../../users/domain/user';

export class JobMatch {
  @Allow()
  id: number;

  @Allow()
  job: Job;

  @Allow()
  worker: User;

  @Allow()
  score: number; // Puntaje de matching (0-100)

  @Allow()
  distance: number; // Distancia en km

  @Allow()
  isApplied: boolean; // Si el trabajador ya aplicó

  @Allow()
  appliedAt?: Date;

  @Allow()
  createdAt: Date;

  @Allow()
  updatedAt: Date;
}
