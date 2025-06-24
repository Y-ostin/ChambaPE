import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobMatchTable1750223950000 implements MigrationInterface {
  name = 'CreateJobMatchTable1750223950000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla job_match solo si no existe (compatible con la entidad actual)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_match" (
        "id" SERIAL NOT NULL,
        "score" numeric(5,2) NOT NULL,
        "distance" numeric(10,2) NOT NULL,
        "isApplied" boolean NOT NULL DEFAULT false,
        "appliedAt" TIMESTAMP NULL,
        "applicationMessage" text NULL,
        "proposedBudget" numeric(10,2) NULL,
        "job_id" integer NULL,
        "worker_id" integer NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_match" PRIMARY KEY ("id")
      )
    `);

    // Crear foreign keys (solo si no existen)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_job_match_job'
        ) THEN
          ALTER TABLE "job_match" ADD CONSTRAINT "FK_job_match_job" 
          FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE CASCADE;
        END IF;
      END$$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_job_match_worker'
        ) THEN
          ALTER TABLE "job_match" ADD CONSTRAINT "FK_job_match_worker" 
          FOREIGN KEY ("worker_id") REFERENCES "user"("id") ON DELETE CASCADE;
        END IF;
      END$$
    `);

    // Crear índice único para evitar duplicados job-worker (solo si no existe)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_job_worker_unique'
        ) THEN
          CREATE UNIQUE INDEX "IDX_job_worker_unique" ON "job_match" ("job_id", "worker_id");
        END IF;
      END$$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT IF EXISTS "FK_job_match_worker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT IF EXISTS "FK_job_match_job"`,
    );

    // Eliminar índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_worker_unique"`);

    // Eliminar tabla
    await queryRunner.query(`DROP TABLE IF EXISTS "job_match"`);
  }
}
