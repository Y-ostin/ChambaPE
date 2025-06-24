import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkerServiceCategoriesRelation1750221811636
  implements MigrationInterface
{
  name = 'AddWorkerServiceCategoriesRelation1750221811636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_profile" DROP CONSTRAINT "FK_worker_profile_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_job_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_job_workerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_job_serviceCategoryId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_payment_jobId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_payment_fromUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_payment_toUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_rating_jobId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_rating_fromUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_rating_toUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile" DROP CONSTRAINT "FK_user_profile_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT "FK_job_match_jobId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT "FK_job_match_workerId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_worker_profile_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_job_location"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_job_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_job_workerId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_job_serviceCategoryId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_job_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_jobId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_rating_jobId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_rating_fromUserId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_rating_toUserId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_profile_location"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_profile_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_job_match_jobId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_job_match_workerId"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_job_match_responseStatus"`,
    );
    await queryRunner.query(
      `CREATE TABLE "unnamed" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e9d1bf2de5917ce02b58842c16b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "worker_service_categories" ("worker_id" integer NOT NULL, "service_category_id" integer NOT NULL, CONSTRAINT "PK_a1ced1fbf21729c3ef087430d30" PRIMARY KEY ("worker_id", "service_category_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ae20d394ed5efb826a1cccff7b" ON "worker_service_categories" ("worker_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4249f8d3b70fe864005113aeb" ON "worker_service_categories" ("service_category_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" DROP COLUMN "monthlySubscriptionStatus"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."worker_profile_monthlysubscriptionstatus_enum" AS ENUM('active', 'expired', 'suspended', 'pending_payment')`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD "monthlySubscriptionStatus" "public"."worker_profile_monthlysubscriptionstatus_enum" NOT NULL DEFAULT 'pending_payment'`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."job_status_enum" AS ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD "status" "public"."job_status_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ALTER COLUMN "serviceCategoryId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN "paymentMethod"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_paymentmethod_enum" AS ENUM('credit_card', 'debit_card', 'yape', 'plin', 'bank_transfer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "paymentMethod" "public"."payment_paymentmethod_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."payment_status_enum" AS ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "status" "public"."payment_status_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "jobId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "fromUserId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "toUserId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ALTER COLUMN "jobId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ALTER COLUMN "fromUserId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ALTER COLUMN "toUserId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP COLUMN "responseStatus"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_match_responsestatus_enum" AS ENUM('pending', 'accepted', 'rejected', 'expired')`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD "responseStatus" "public"."job_match_responsestatus_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ALTER COLUMN "jobId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ALTER COLUMN "workerId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35fd367ad9582e171a1e81e1e4" ON "worker_profile" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_308fb0752c2ea332cb79f52cea" ON "job" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da98239d7276ae3f4bf09f028a" ON "job" ("workerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10ab8d291a5191feddc285b370" ON "job" ("serviceCategoryId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22daa2fc9ed0b5111808e23861" ON "job" ("latitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_94b7e0bad0a4788cc7bdf0aad6" ON "job" ("longitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bac37f13b06c08534012dc3607" ON "job" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d6dfd5c39a84b03a74a12e99aa" ON "job" ("latitude", "longitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0724e7cf953fd0c4b1ff39e8ca" ON "payment" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dfe1791b6523512235fe2d64de" ON "payment" ("fromUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_618e0b75ee5e4a344d84f1f6b4" ON "payment" ("toUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3af0086da18f32ac05a52e5639" ON "payment" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_208704c8aaaa46c54cd9141456" ON "rating" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_56498248d0a34c261f6adc6784" ON "rating" ("fromUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8066e4e2a89a0fde9f4eb054c" ON "rating" ("toUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_51cb79b5555effaf7d69ba1cff" ON "user_profile" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f504af04b3288cbf8e378ffa4a" ON "user_profile" ("latitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f549f9322a2b98b1aa8e8cf013" ON "user_profile" ("longitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bad75eec2b70c80c5e624c4cd9" ON "job_match" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2a95f7237906cc9ae3b382547" ON "job_match" ("workerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9738cd50932b6454f0ad2f139d" ON "job_match" ("responseStatus") `,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD CONSTRAINT "FK_35fd367ad9582e171a1e81e1e4d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_308fb0752c2ea332cb79f52ceaa" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_da98239d7276ae3f4bf09f028a9" FOREIGN KEY ("workerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_10ab8d291a5191feddc285b3705" FOREIGN KEY ("serviceCategoryId") REFERENCES "service_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_0724e7cf953fd0c4b1ff39e8cab" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_dfe1791b6523512235fe2d64de4" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_618e0b75ee5e4a344d84f1f6b4d" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_208704c8aaaa46c54cd9141456c" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_56498248d0a34c261f6adc6784d" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_c8066e4e2a89a0fde9f4eb054c9" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile" ADD CONSTRAINT "FK_51cb79b5555effaf7d69ba1cff9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD CONSTRAINT "FK_bad75eec2b70c80c5e624c4cd9b" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD CONSTRAINT "FK_a2a95f7237906cc9ae3b382547b" FOREIGN KEY ("workerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_service_categories" ADD CONSTRAINT "FK_ae20d394ed5efb826a1cccff7bf" FOREIGN KEY ("worker_id") REFERENCES "worker_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_service_categories" ADD CONSTRAINT "FK_e4249f8d3b70fe864005113aebe" FOREIGN KEY ("service_category_id") REFERENCES "service_category"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_service_categories" DROP CONSTRAINT "FK_e4249f8d3b70fe864005113aebe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_service_categories" DROP CONSTRAINT "FK_ae20d394ed5efb826a1cccff7bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT "FK_a2a95f7237906cc9ae3b382547b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP CONSTRAINT "FK_bad75eec2b70c80c5e624c4cd9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile" DROP CONSTRAINT "FK_51cb79b5555effaf7d69ba1cff9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_c8066e4e2a89a0fde9f4eb054c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_56498248d0a34c261f6adc6784d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" DROP CONSTRAINT "FK_208704c8aaaa46c54cd9141456c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_618e0b75ee5e4a344d84f1f6b4d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_dfe1791b6523512235fe2d64de4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_0724e7cf953fd0c4b1ff39e8cab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_10ab8d291a5191feddc285b3705"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_da98239d7276ae3f4bf09f028a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" DROP CONSTRAINT "FK_308fb0752c2ea332cb79f52ceaa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" DROP CONSTRAINT "FK_35fd367ad9582e171a1e81e1e4d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9738cd50932b6454f0ad2f139d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2a95f7237906cc9ae3b382547"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bad75eec2b70c80c5e624c4cd9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f549f9322a2b98b1aa8e8cf013"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f504af04b3288cbf8e378ffa4a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_51cb79b5555effaf7d69ba1cff"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8066e4e2a89a0fde9f4eb054c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_56498248d0a34c261f6adc6784"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_208704c8aaaa46c54cd9141456"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3af0086da18f32ac05a52e5639"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_618e0b75ee5e4a344d84f1f6b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dfe1791b6523512235fe2d64de"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0724e7cf953fd0c4b1ff39e8ca"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d6dfd5c39a84b03a74a12e99aa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bac37f13b06c08534012dc3607"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_94b7e0bad0a4788cc7bdf0aad6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22daa2fc9ed0b5111808e23861"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_10ab8d291a5191feddc285b370"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da98239d7276ae3f4bf09f028a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_308fb0752c2ea332cb79f52cea"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35fd367ad9582e171a1e81e1e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ALTER COLUMN "workerId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ALTER COLUMN "jobId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" DROP COLUMN "responseStatus"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."job_match_responsestatus_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD "responseStatus" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ALTER COLUMN "toUserId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ALTER COLUMN "fromUserId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ALTER COLUMN "jobId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "toUserId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "fromUserId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "jobId" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN "paymentMethod"`,
    );
    await queryRunner.query(`DROP TYPE "public"."payment_paymentmethod_enum"`);
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "paymentMethod" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ALTER COLUMN "serviceCategoryId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."job_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "job" ADD "status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" DROP COLUMN "monthlySubscriptionStatus"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."worker_profile_monthlysubscriptionstatus_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD "monthlySubscriptionStatus" character varying NOT NULL DEFAULT 'pending_payment'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4249f8d3b70fe864005113aeb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ae20d394ed5efb826a1cccff7b"`,
    );
    await queryRunner.query(`DROP TABLE "worker_service_categories"`);
    await queryRunner.query(`DROP TABLE "unnamed"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_job_match_responseStatus" ON "job_match" ("responseStatus") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_match_workerId" ON "job_match" ("workerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_match_jobId" ON "job_match" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_profile_userId" ON "user_profile" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_profile_location" ON "user_profile" ("latitude", "longitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rating_toUserId" ON "rating" ("toUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rating_fromUserId" ON "rating" ("fromUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rating_jobId" ON "rating" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_status" ON "payment" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_jobId" ON "payment" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_status" ON "job" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_serviceCategoryId" ON "job" ("serviceCategoryId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_workerId" ON "job" ("workerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_userId" ON "job" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_location" ON "job" ("latitude", "longitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_worker_profile_userId" ON "worker_profile" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD CONSTRAINT "FK_job_match_workerId" FOREIGN KEY ("workerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_match" ADD CONSTRAINT "FK_job_match_jobId" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile" ADD CONSTRAINT "FK_user_profile_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_rating_toUserId" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_rating_fromUserId" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rating" ADD CONSTRAINT "FK_rating_jobId" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_toUserId" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_fromUserId" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_jobId" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_job_serviceCategoryId" FOREIGN KEY ("serviceCategoryId") REFERENCES "service_category"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_job_workerId" FOREIGN KEY ("workerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD CONSTRAINT "FK_job_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_profile" ADD CONSTRAINT "FK_worker_profile_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
