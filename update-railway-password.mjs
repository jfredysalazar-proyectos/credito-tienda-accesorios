import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL no está configurada');
  process.exit(1);
}

async function updatePassword() {
  try {
    const connection = await mysql.createConnection(databaseUrl);
    
    // Generar nuevo hash
    const crypto = await import('crypto');
    const password = 'admin123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const passwordHash = `${salt}:${hash}`;
    
    console.log('Nuevo hash:', passwordHash);
    
    // Actualizar la contraseña
    const [result] = await connection.execute(
      'UPDATE users SET passwordHash = ? WHERE email = ?',
      [passwordHash, 'admin@creditotienda.local']
    );
    
    console.log('Filas actualizadas:', result.affectedRows);
    
    // Verificar que se actualizó
    const [rows] = await connection.execute(
      'SELECT id, email, passwordHash FROM users WHERE email = ?',
      ['admin@creditotienda.local']
    );
    
    if (rows.length > 0) {
      console.log('Usuario actualizado:', rows[0]);
    } else {
      console.log('Usuario no encontrado');
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updatePassword();
