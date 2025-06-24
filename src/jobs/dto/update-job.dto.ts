import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { JobStatus } from '../enums/job-status.enum';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({
    description: 'Estado del trabajo',
    enum: JobStatus,
    example: JobStatus.ASSIGNED,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
