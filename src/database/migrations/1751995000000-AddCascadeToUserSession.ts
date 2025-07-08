import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddCascadeToUserSession1751995000000
  implements MigrationInterface
{
  name = 'AddCascadeToUserSession1751995000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cargar metadatos de la tabla
    const table = await queryRunner.getTable('session');
    if (!table) return;

    // Buscar FK que referencia a user
    const userFk = table.foreignKeys.find(
      (fk) =>
        fk.referencedTableName === 'user' && fk.columnNames.includes('userId'),
    );

    if (userFk) {
      await queryRunner.dropForeignKey('session', userFk);
    }

    // Crear nueva FK con ON DELETE CASCADE
    await queryRunner.createForeignKey(
      'session',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('session');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (fk) =>
        fk.referencedTableName === 'user' && fk.columnNames.includes('userId'),
    );

    if (fk) {
      await queryRunner.dropForeignKey('session', fk);
    }

    // Volver a crear FK sin cascada (comportamiento por defecto)
    await queryRunner.createForeignKey(
      'session',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }
}
