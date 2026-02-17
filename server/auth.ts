import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Hash de contraseña simple (en producción usar bcrypt)
 * Para este proyecto usamos una implementación simple
 */
export async function hashPassword(password: string): Promise<string> {
  // Importar crypto de Node.js
  const crypto = await import("crypto");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verificar contraseña
 */
export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  const crypto = await import("crypto");
  const [salt, hash] = passwordHash.split(":");
  const hashToCompare = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === hashToCompare;
}

/**
 * Crear usuario administrador por defecto
 */
export async function createDefaultAdmin() {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return;
  }

  try {
    // Verificar si ya existe un admin
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@creditotienda.local"))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("[Auth] Admin user already exists");
      return;
    }

    // Crear admin por defecto
    const passwordHash = await hashPassword("admin123");
    await db.insert(users).values({
      email: "admin@creditotienda.local",
      passwordHash,
      name: "Administrador",
      role: "admin",
      status: "active",
    });

    console.log("[Auth] Default admin user created");
    console.log("[Auth] Email: admin@creditotienda.local");
    console.log("[Auth] Password: admin123");
  } catch (error) {
    console.error("[Auth] Error creating default admin:", error);
  }
}

/**
 * Obtener usuario por email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Obtener usuario por ID
 */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}
