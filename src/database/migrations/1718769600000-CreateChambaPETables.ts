import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChambaPETables1718769600000 implements MigrationInterface {
  name = 'CreateChambaPETables1718769600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla service_category
    await queryRunner.query(
      `CREATE TABLE "service_category" (
        "id" SERIAL NOT NULL, 
        "name" character varying(100) NOT NULL, 
        "description" text, 
        "iconUrl" character varying(500), 
        "isActive" boolean NOT NULL DEFAULT true, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        CONSTRAINT "PK_service_category" PRIMARY KEY ("id")
      )`,
    );

    // Crear tabla user_profile
    await queryRunner.query(
      `CREATE TABLE "user_profile" (
        "id" SERIAL NOT NULL, 
        "address" character varying(500) NOT NULL, 
        "latitude" decimal(10,8) NOT NULL, 
        "longitude" decimal(11,8) NOT NULL, 
        "ratingAverage" decimal(3,2) NOT NULL DEFAULT 0, 
        "totalJobsPosted" integer NOT NULL DEFAULT 0, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "userId" integer NOT NULL, 
        CONSTRAINT "PK_user_profile" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_profile_userId" UNIQUE ("userId")
      )`,
    );

    // Crear tabla worker_profile
    await queryRunner.query(
      `CREATE TABLE "worker_profile" (
        "id" SERIAL NOT NULL, 
        "isVerified" boolean NOT NULL DEFAULT false, 
        "isActiveToday" boolean NOT NULL DEFAULT false, 
        "ratingAverage" decimal(3,2) NOT NULL DEFAULT 0, 
        "totalJobsCompleted" integer NOT NULL DEFAULT 0, 
        "radiusKm" integer NOT NULL DEFAULT 10, 
        "monthlySubscriptionStatus" character varying NOT NULL DEFAULT 'pending_payment', 
        "subscriptionExpiresAt" TIMESTAMP, 
        "dniDocumentUrl" character varying(500), 
        "criminalRecordUrl" character varying(500), 
        "certificatesUrls" json, 
        "dniNumber" character varying(20), 
        "description" text, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "userId" integer NOT NULL, 
        CONSTRAINT "PK_worker_profile" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_worker_profile_userId" UNIQUE ("userId")
      )`,
    );

    // Crear tabla job
    await queryRunner.query(
      `CREATE TABLE "job" (
        "id" SERIAL NOT NULL, 
        "title" character varying(200) NOT NULL, 
        "description" text NOT NULL, 
        "locationAddress" character varying(500) NOT NULL, 
        "latitude" decimal(10,8) NOT NULL, 
        "longitude" decimal(11,8) NOT NULL, 
        "photosUrls" json, 
        "estimatedHours" integer NOT NULL, 
        "budgetMin" decimal(10,2) NOT NULL, 
        "budgetMax" decimal(10,2) NOT NULL, 
        "status" character varying NOT NULL DEFAULT 'pending', 
        "scheduledDate" TIMESTAMP NOT NULL, 
        "finalPrice" decimal(10,2), 
        "startedAt" TIMESTAMP, 
        "completedAt" TIMESTAMP, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "userId" integer NOT NULL, 
        "workerId" integer, 
        "serviceCategoryId" integer NOT NULL, 
        CONSTRAINT "PK_job" PRIMARY KEY ("id")
      )`,
    );

    // Crear tabla job_match
    await queryRunner.query(
      `CREATE TABLE "job_match" (
        "id" SERIAL NOT NULL, 
        "distanceKm" decimal(5,2) NOT NULL, 
        "compatibilityScore" integer NOT NULL, 
        "notifiedAt" TIMESTAMP NOT NULL, 
        "responseStatus" character varying NOT NULL DEFAULT 'pending', 
        "expiresAt" TIMESTAMP NOT NULL, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "jobId" integer NOT NULL, 
        "workerId" integer NOT NULL, 
        CONSTRAINT "PK_job_match" PRIMARY KEY ("id")
      )`,
    );

    // Crear tabla rating
    await queryRunner.query(
      `CREATE TABLE "rating" (
        "id" SERIAL NOT NULL, 
        "rating" integer NOT NULL, 
        "comment" text, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "jobId" integer NOT NULL, 
        "fromUserId" integer NOT NULL, 
        "toUserId" integer NOT NULL, 
        CONSTRAINT "PK_rating" PRIMARY KEY ("id")
      )`,
    );

    // Crear tabla payment
    await queryRunner.query(
      `CREATE TABLE "payment" (
        "id" SERIAL NOT NULL, 
        "amount" decimal(10,2) NOT NULL, 
        "commissionPercentage" decimal(5,2) NOT NULL, 
        "commissionAmount" decimal(10,2) NOT NULL, 
        "paymentMethod" character varying NOT NULL, 
        "transactionId" character varying(100) NOT NULL, 
        "status" character varying NOT NULL DEFAULT 'pending', 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "jobId" integer NOT NULL, 
        "fromUserId" integer NOT NULL, 
        "toUserId" integer NOT NULL, 
        CONSTRAINT "PK_payment" PRIMARY KEY ("id")
      )`,
    );

    // Crear índices para optimización
    await queryRunner.query(
      `CREATE INDEX "IDX_user_profile_location" ON "user_profile" ("latitude", "longitude")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_profile_userId" ON "user_profile" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_worker_profile_userId" ON "worker_profile" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_location" ON "job" ("latitude", "longitude")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_userId" ON "job" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_workerId" ON "job" ("workerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_serviceCategoryId" ON "job" ("serviceCategoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_status" ON "job" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_match_jobId" ON "job_match" ("jobId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_match_workerId" ON "job_match" ("workerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_match_responseStatus" ON "job_match" ("responseStatus")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rating_jobId" ON "rating" ("jobId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rating_fromUserId" ON "rating" ("fromUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rating_toUserId" ON "rating" ("toUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_jobId" ON "payment" ("jobId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_status" ON "payment" ("status")`,
    );

    // Crear foreign keys
    await queryRunner.query(
      `ALTER TABLE "user_profile" ADD CONSTRAINT "FK_user_profile_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD CONSTRAINT "FK_worker_profile_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_job_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_job_workerId" FOREIGN KEY ("workerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_job_serviceCategoryId" FOREIGN KEY ("serviceCategoryId") REFERENCES "service_category"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_match" ADD CONSTRAINT "FK_job_match_jobId" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_match" ADD CONSTRAINT "FK_job_match_workerId" FOREIGN KEY ("workerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_rating_jobId" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_rating_fromUserId" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_rating_toUserId" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_jobId" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_fromUserId" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_toUserId" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_payment_toUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_payment_fromUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_payment_jobId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_rating_toUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_rating_fromUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_rating_jobId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT "FK_job_match_workerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT "FK_job_match_jobId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_job_serviceCategoryId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_job_workerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_job_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" DROP CONSTRAINT "FK_worker_profile_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile" DROP CONSTRAINT "FK_user_profile_userId"`,
    );

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE "payment"`);
    await queryRunner.query(`DROP TABLE "rating"`);
    await queryRunner.query(`DROP TABLE "job_match"`);
    await queryRunner.query(`DROP TABLE "job"`);
    await queryRunner.query(`DROP TABLE "worker_profile"`);
    await queryRunner.query(`DROP TABLE "user_profile"`);
    await queryRunner.query(`DROP TABLE "service_category"`);
  }
}
