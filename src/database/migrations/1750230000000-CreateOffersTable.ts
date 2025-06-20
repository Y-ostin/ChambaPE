import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOffersTable1750230000000 implements MigrationInterface {
  name = 'CreateOffersTable1750230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."offers_status_enum" AS ENUM(
        'pending', 
        'accepted', 
        'rejected', 
        'expired', 
        'completed', 
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "offers" (
        "id" SERIAL NOT NULL,
        "job_id" integer NOT NULL,
        "worker_id" integer NOT NULL,
        "status" "public"."offers_status_enum" NOT NULL DEFAULT 'pending',
        "proposedBudget" numeric(10,2) NOT NULL,
        "message" text,
        "rejectionReason" text,
        "respondedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "matchingScore" integer NOT NULL DEFAULT '0',
        "distance" numeric(5,2),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offers_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offers_job_worker" ON "offers" ("job_id", "worker_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offers_status_created" ON "offers" ("status", "createdAt")
    `);
    await queryRunner.query(`
      ALTER TABLE "offers" 
      ADD CONSTRAINT "FK_offers_job_id" 
      FOREIGN KEY ("job_id") 
      REFERENCES "job"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "offers" 
      ADD CONSTRAINT "FK_offers_worker_id" 
      FOREIGN KEY ("worker_id") 
      REFERENCES "user"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_offers_worker_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_offers_job_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_offers_status_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_offers_job_worker"`);
    await queryRunner.query(`DROP TABLE "offers"`);
    await queryRunner.query(`DROP TYPE "public"."offers_status_enum"`);
  }
}
