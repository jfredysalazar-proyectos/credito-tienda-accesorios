import crypto from "crypto";
import mysql from "mysql2/promise";

async function resetAdminPassword() {
  const password = "admin123";
  
  // Generar hash
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  const passwordHash = `${salt}:${hash}`;
  
  console.log("Generated password hash:", passwordHash);
  
  // Conectar a la base de datos
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "credito_tienda",
  });
  
  try {
    // Actualizar la contraseña
    const [result] = await connection.execute(
      "UPDATE users SET passwordHash = ? WHERE email = ?",
      [passwordHash, "admin@creditotienda.local"]
    );
    
    console.log("Password updated successfully");
    console.log("Rows affected:", result.affectedRows);
    
    // Verificar que se actualizó
    const [rows] = await connection.execute(
      "SELECT email, passwordHash FROM users WHERE email = ?",
      ["admin@creditotienda.local"]
    );
    
    if (rows.length > 0) {
      console.log("User found:", rows[0].email);
      console.log("Password hash stored:", rows[0].passwordHash);
    } else {
      console.log("User not found!");
    }
  } finally {
    await connection.end();
  }
}

resetAdminPassword().catch(console.error);
