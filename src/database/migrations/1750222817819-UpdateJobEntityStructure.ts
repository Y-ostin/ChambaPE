import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateJobEntityStructure1750222817819
  implements MigrationInterface
{
  name = 'UpdateJobEntityStructure1750222817819';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "locationAddress"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "photosUrls"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "estimatedHours"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "budgetMin"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "budgetMax"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "scheduledDate"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "finalPrice"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "startedAt"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "completedAt"`);
    await queryRunner.query(
      `ALTER TABLE "job" ADD "address" character varying(300) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD "estimatedBudget" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD "preferredDateTime" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "job" ADD "imageUrls" json`);
    await queryRunner.query(`ALTER TABLE "job" ADD "notes" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "notes"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "imageUrls"`);
    await queryRunner.query(
      `ALTER TABLE "job" DROP COLUMN "preferredDateTime"`,
    );
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "estimatedBudget"`);
    await queryRunner.query(`ALTER TABLE "job" DROP COLUMN "address"`);
    await queryRunner.query(`ALTER TABLE "job" ADD "completedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "job" ADD "startedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "job" ADD "finalPrice" numeric(10,2)`);
    await queryRunner.query(
      `ALTER TABLE "job" ADD "scheduledDate" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD "budgetMax" numeric(10,2) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD "budgetMin" numeric(10,2) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job" ADD "estimatedHours" integer NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "job" ADD "photosUrls" json`);
    await queryRunner.query(
      `ALTER TABLE "job" ADD "locationAddress" character varying(500) NOT NULL`,
    );
  }
}
