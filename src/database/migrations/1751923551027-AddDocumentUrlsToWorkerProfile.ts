import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentUrlsToWorkerProfile1751923551027
  implements MigrationInterface
{
  name = 'AddDocumentUrlsToWorkerProfile1751923551027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD "certificatePdfUrl" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD "dniFrontalUrl" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD "dniPosteriorUrl" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_profile" DROP COLUMN "dniPosteriorUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" DROP COLUMN "dniFrontalUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" DROP COLUMN "certificatePdfUrl"`,
    );
  }
}
