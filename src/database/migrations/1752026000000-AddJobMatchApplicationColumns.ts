import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobMatchApplicationColumns1752026000000
  implements MigrationInterface
{
  name = 'AddJobMatchApplicationColumns1752026000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Añadir columnas que el código ya utiliza pero que no existen en la tabla job_match
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD "isApplied" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD "appliedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD "applicationMessage" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD "proposedBudget" decimal(10,2)`,
    );
    // Índices útiles para consultas posteriores
    await queryRunner.query(
      `CREATE INDEX "IDX_job_match_isApplied" ON "job_match" ("isApplied")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambios
    await queryRunner.query(`DROP INDEX "public"."IDX_job_match_isApplied"`);
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP COLUMN "proposedBudget"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP COLUMN "applicationMessage"`,
    );
    await queryRunner.query(`ALTER TABLE "job_match" DROP COLUMN "appliedAt"`);
    await queryRunner.query(`ALTER TABLE "job_match" DROP COLUMN "isApplied"`);
  }
}
