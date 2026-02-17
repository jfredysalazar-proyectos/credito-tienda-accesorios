import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabla de clientes de la tienda
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Referencia al usuario propietario
  name: varchar("name", { length: 255 }).notNull(),
  cedula: varchar("cedula", { length: 50 }).notNull().unique(), // Cédula única por cliente
  whatsappNumber: varchar("whatsappNumber", { length: 20 }).notNull(), // Número de WhatsApp con código de país
  creditLimit: decimal("creditLimit", { precision: 12, scale: 2 }).notNull(), // Cupo de crédito
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Tabla de créditos otorgados a clientes
 */
export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(), // Referencia al cliente
  concept: varchar("concept", { length: 500 }).notNull(), // Concepto del crédito (descripción manual)
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Monto del crédito
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(), // Saldo pendiente
  creditDays: int("creditDays").notNull().default(0), // Días de crédito otorgados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  dueDate: timestamp("dueDate"), // Fecha de vencimiento del crédito
  status: mysqlEnum("status", ["active", "paid", "overdue"]).default("active").notNull(),
});

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

/**
 * Tabla de pagos/abonos realizados a créditos
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  creditId: int("creditId").notNull(), // Referencia al crédito
  clientId: int("clientId").notNull(), // Referencia al cliente (desnormalizado para consultas rápidas)
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Monto pagado
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(), // Método de pago (efectivo, transferencia, etc)
  notes: text("notes"), // Notas adicionales del pago
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Tabla de auditoría para registrar envíos de WhatsApp
 */
export const whatsappLogs = mysqlTable("whatsappLogs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  creditId: int("creditId"), // Opcional, puede ser null si es envío manual
  messageType: mysqlEnum("messageType", ["new_credit", "payment_received", "manual_statement"]).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  messageContent: text("messageContent").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"), // Mensaje de error si falló
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"), // Timestamp de envío exitoso
});

export type WhatsappLog = typeof whatsappLogs.$inferSelect;
export type InsertWhatsappLog = typeof whatsappLogs.$inferInsert;
