import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobMatchTable1750223950000 implements MigrationInterface {
  name = 'CreateJobMatchTable1750223950000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum para responseStatus solo si no existe
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_match_responsestatus_enum') THEN
          CREATE TYPE "job_match_responsestatus_enum" AS ENUM('pending', 'accepted', 'rejected', 'expired');
        END IF;
      END$$
    `);

    // Crear tabla job_match solo si no existe
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_match" (
        "id" SERIAL NOT NULL,
        "distanceKm" numeric(5,2) NOT NULL,
        "compatibilityScore" integer NOT NULL,
        "notifiedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "responseStatus" "job_match_responsestatus_enum" NOT NULL DEFAULT 'pending',
        "expiresAt" TIMESTAMP NOT NULL,
        "message" character varying(500),
        "job_id" integer,
        "worker_id" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_match" PRIMARY KEY ("id")
      )
    `);

    // Crear índice único para evitar duplicados job-worker (solo si no existe)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_job_worker_unique" ON "job_match" ("job_id", "worker_id")
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT "FK_job_match_worker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT "FK_job_match_job"`,
    );

    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_job_worker_unique"`);

    // Eliminar tabla
    await queryRunner.query(`DROP TABLE "job_match"`);

    // Eliminar enum
    await queryRunner.query(`DROP TYPE "job_match_responsestatus_enum"`);
  }
}
