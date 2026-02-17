import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Tabla de usuarios con autenticación independiente
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabla de clientes de la tienda
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  cedula: varchar("cedula", { length: 50 }).notNull().unique(),
  whatsappNumber: varchar("whatsappNumber", { length: 20 }).notNull(),
  creditLimit: decimal("creditLimit", { precision: 12, scale: 2 }).notNull(),
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
  clientId: int("clientId").notNull(),
  concept: varchar("concept", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
  creditDays: int("creditDays").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["active", "paid", "overdue"]).default("active").notNull(),
});

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

/**
 * Tabla de pagos/abonos realizados a créditos
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  creditId: int("creditId").notNull(),
  clientId: int("clientId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),
  notes: text("notes"),
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
  creditId: int("creditId"),
  messageType: mysqlEnum("messageType", ["new_credit", "payment_received", "manual_statement"]).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  messageContent: text("messageContent").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
});

export type WhatsappLog = typeof whatsappLogs.$inferSelect;
export type InsertWhatsappLog = typeof whatsappLogs.$inferInsert;
