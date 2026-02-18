import { getDb } from "./server/db.mjs";
import { verifyPassword, getUserByEmail } from "./server/auth.ts";

async function testLogin() {
  try {
    const user = await getUserByEmail("admin@creditotienda.local");
    if (!user) {
      console.log("Usuario no encontrado");
      return;
    }
    
    console.log("Usuario encontrado:", user.email);
    console.log("Password hash:", user.passwordHash);
    
    const isValid = await verifyPassword("admin123", user.passwordHash);
    console.log("¿Contraseña válida?", isValid);
  } catch (error) {
    console.error("Error:", error);
  }
}

testLogin();
