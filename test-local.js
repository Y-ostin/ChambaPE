const { Client } = require('pg');

async function testDatabaseConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'chambadb'
  });

  try {
    console.log('🔌 Intentando conectar a la base de datos...');
    await client.connect();
    console.log('✅ Conexión exitosa a PostgreSQL');
    
    const result = await client.query('SELECT NOW()');
    console.log('📅 Hora del servidor:', result.rows[0].now);
    
    await client.end();
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
  }
}

testDatabaseConnection(); 