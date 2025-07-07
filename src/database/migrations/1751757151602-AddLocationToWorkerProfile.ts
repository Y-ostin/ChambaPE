import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationToWorkerProfile1751757151602
  implements MigrationInterface
{
  name = 'AddLocationToWorkerProfile1751757151602';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar campos de ubicación al worker_profile
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD "latitude" numeric(10,8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD "longitude" numeric(11,8)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover campos de ubicación del worker_profile
    await queryRunner.query(`ALTER TABLE "worker_profile" DROP COLUMN "longitude"`);
    await queryRunner.query(`ALTER TABLE "worker_profile" DROP COLUMN "latitude"`);
  }
} 