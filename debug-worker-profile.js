const { DataSource } = require('typeorm');
const path = require('path');

// Configuración de la base de datos local
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '123456',
  database: 'chambape_db',
  entities: [path.join(__dirname, 'src/**/*.entity{.ts,.js}')],
  synchronize: false,
  logging: true,
});

async function debugWorkerProfile() {
  try {
    await dataSource.initialize();
    console.log('✅ Conexión a la base de datos establecida');

    // Consultar todos los usuarios
    const users = await dataSource.query(`
      SELECT id, email, "firstName", "lastName", "roleId", "statusId", "createdAt"
      FROM users 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `);
    console.log('\n📋 Usuarios en la base de datos:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Rol: ${user.roleId}, Estado: ${user.statusId}`);
    });

    // Consultar todos los perfiles de trabajador
    const workers = await dataSource.query(`
      SELECT id, "userId", "dniNumber", "description", "createdAt"
      FROM worker_profile 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `);
    console.log('\n🔧 Perfiles de trabajador en la base de datos:');
    workers.forEach(worker => {
      console.log(`  - ID: ${worker.id}, UserID: ${worker.userId}, DNI: ${worker.dniNumber}`);
    });

    // Verificar si hay usuarios con rol worker pero sin perfil de trabajador
    const usersWithoutProfile = await dataSource.query(`
      SELECT u.id, u.email, u."firstName", u."lastName", u."roleId"
      FROM users u
      LEFT JOIN worker_profile wp ON u.id = wp."userId"
      WHERE u."roleId" = 2 AND wp.id IS NULL
      ORDER BY u."createdAt" DESC
    `);
    
    if (usersWithoutProfile.length > 0) {
      console.log('\n⚠️ USUARIOS CON ROL WORKER PERO SIN PERFIL DE TRABAJADOR:');
      usersWithoutProfile.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Nombre: ${user.firstName} ${user.lastName}`);
      });
    } else {
      console.log('\n✅ Todos los usuarios con rol worker tienen perfil de trabajador');
    }

    // Verificar si hay perfiles de trabajador sin usuario asociado
    const orphanedProfiles = await dataSource.query(`
      SELECT wp.id, wp."userId", wp."dniNumber"
      FROM worker_profile wp
      LEFT JOIN users u ON wp."userId" = u.id
      WHERE u.id IS NULL
    `);
    
    if (orphanedProfiles.length > 0) {
      console.log('\n⚠️ PERFILES DE TRABAJADOR HUÉRFANOS (sin usuario):');
      orphanedProfiles.forEach(profile => {
        console.log(`  - ID: ${profile.id}, UserID: ${profile.userId}, DNI: ${profile.dniNumber}`);
      });
    } else {
      console.log('\n✅ No hay perfiles de trabajador huérfanos');
    }

  } catch (error) {
    console.error('❌ Error en la depuración:', error);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Conexión a la base de datos cerrada');
  }
}

debugWorkerProfile(); 