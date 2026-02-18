import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import {
  createClient,
  listClients,
  searchClients,
  getClientById,
  updateClient,
  createCredit,
  getCreditsbyClientId,
  getCreditById,
  updateCredit,
  getActiveCredits,
  createPayment,
  getPaymentsByCreditId,
  createWhatsappLog,
  getDashboardSummary,
  createGeneralPayment,
  getPaymentsByCredit,
  getDb,
} from "./db";
import { TRPCError } from "@trpc/server";
import { hashPassword, verifyPassword, getUserByEmail } from "./auth";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { generateOverdueCreditsReport, generateClientDebtReport, generatePaymentAnalysisReport } from "./reports";
// Updated: 2026-02-17 - Force Railway redeploy

export const appRouter = router({
  system: systemRouter,

  // ============ AUTH ROUTERS ============
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    debug: publicProcedure.query(async () => {
      const db = await getDb();
      let adminUser: typeof users.$inferSelect | null = null;
      let allUsers: Array<{
        id: number;
        email: string;
        name: string | null;
        status: string;
        role: string;
      }> = [];
      let error: string | null = null;

      if (db) {
        try {
          // Intentar obtener el usuario admin
          const result = await db
            .select()
            .from(users)
            .where(eq(users.email, "admin@creditotienda.local"))
            .limit(1);
          adminUser = result.length > 0 ? result[0] : null;

          // Obtener todos los usuarios para debugging
          const allUsersResult = await db.select().from(users);
          allUsers = allUsersResult.map((u: typeof users.$inferSelect) => ({
            id: u.id,
            email: u.email,
            name: u.name || "",
            status: u.status,
            role: u.role,
          }));
        } catch (e) {
          error = String(e);
        }
      }

      return {
        databaseUrl: process.env.DATABASE_URL ? "configurada" : "NO configurada",
        dbAvailable: db ? "si" : "no",
        nodeEnv: process.env.NODE_ENV,
        adminUserExists: adminUser ? "si" : "no",
        adminUser: adminUser
          ? {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name || "",
              status: adminUser.status,
              role: adminUser.role,
              passwordHashLength: adminUser.passwordHash?.length || 0,
            }
          : null,
        totalUsers: allUsers.length,
        allUsers: allUsers,
        error: error,
      };
    }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
          password: z.string().min(1, "Contraseña requerida"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email o contraseña incorrectos",
          });
        }

        if (user.status !== "active") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "La cuenta está desactivada",
          });
        }

        const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email o contraseña incorrectos",
          });
        }

        // Crear token de sesión
        const sessionToken = await sdk.createSessionToken(user.id, user.email);
        sdk.setSessionCookie(ctx.res, sessionToken);

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      sdk.clearSessionCookie(ctx.res);
      return {
        success: true,
      } as const;
    }),

    // Procedimiento de emergencia para resetear contraseña del admin
    resetAdminPassword: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          newPassword: z.string().min(6),
          adminKey: z.string(), // Clave de seguridad
        })
      )
      .mutation(async ({ input }) => {
        console.log("[resetAdminPassword] Iniciando...");
        console.log("[resetAdminPassword] DATABASE_URL:", process.env.DATABASE_URL ? "configurada" : "NO configurada");
        // Verificar la clave de seguridad
        const adminKey = process.env.ADMIN_RESET_KEY || "emergency-reset-key-change-me";
        if (input.adminKey !== adminKey) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Clave de administrador incorrecta",
          });
        }

        // Generar nuevo hash
        const passwordHash = await hashPassword(input.newPassword);

        // Actualizar la contraseña
        const db = await getDb();
        console.log("[resetAdminPassword] DB disponible:", db ? "sí" : "no");
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        try {
          await db
            .update(users)
            .set({ passwordHash })
            .where(eq(users.email, input.email));

          return {
            success: true,
            message: "Contraseña actualizada correctamente",
          };
        } catch (error) {
          console.error("[resetAdminPassword] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Error desconocido",
          });
        }
      }),
  }),

  // ============ CLIENT ROUTERS ============
  clients: router({
    // Crear nuevo cliente
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "El nombre es requerido"),
          cedula: z.string().min(1, "La cédula es requerida"),
          whatsappNumber: z.string().min(1, "El número de WhatsApp es requerido"),
          creditLimit: z.string().transform((val) => parseFloat(val)),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          await createClient(ctx.user.id, {
            name: input.name,
            cedula: input.cedula,
            whatsappNumber: input.whatsappNumber,
            creditLimit: input.creditLimit.toString(),
          });

          return { success: true };
        } catch (error) {
          if (error instanceof Error && error.message.includes("Duplicate entry")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "La cédula ya está registrada",
            });
          }
          throw error;
        }
      }),

    // Listar clientes del usuario
    list: protectedProcedure.query(async ({ ctx }) => {
      return listClients(ctx.user.id);
    }),

    // Buscar clientes
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        return searchClients(ctx.user.id, input.query);
      }),

    // Obtener cliente por ID
    getById: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente no encontrado",
          });
        }
        return client;
      }),

    update: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().min(1).optional(),
          cedula: z.string().min(1).optional(),
          whatsappNumber: z.string().min(1).optional(),
          creditLimit: z.string().transform((val) => parseFloat(val)).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { clientId, ...updateData } = input;
        const dataToUpdate: any = {};
        
        if (updateData.name) dataToUpdate.name = updateData.name;
        if (updateData.cedula) dataToUpdate.cedula = updateData.cedula;
        if (updateData.whatsappNumber) dataToUpdate.whatsappNumber = updateData.whatsappNumber;
        if (updateData.creditLimit !== undefined) dataToUpdate.creditLimit = updateData.creditLimit.toString();

        await updateClient(clientId, ctx.user.id, dataToUpdate);
        return { success: true };
      }),
  }),

  // ============ CREDIT ROUTERS ============
  credits: router({
    // Crear nuevo crédito
    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          concept: z.string().min(1, "El concepto es requerido"),
          amount: z.string().transform((val) => parseFloat(val)),
          creditDays: z.number().default(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verificar que el cliente pertenece al usuario
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para crear créditos en este cliente",
          });
        }

        // Crear el crédito
        const dueDate = input.creditDays > 0 
          ? new Date(Date.now() + input.creditDays * 24 * 60 * 60 * 1000)
          : null;

        await createCredit({
          clientId: input.clientId,
          concept: input.concept,
          amount: input.amount.toString(),
          balance: input.amount.toString(),
          creditDays: input.creditDays,
          dueDate,
          status: "active",
        });

        // Crear log de WhatsApp para envío automático
        await createWhatsappLog({
          clientId: input.clientId,
          messageType: "new_credit",
          phoneNumber: client.whatsappNumber,
          messageContent: "",
          status: "pending",
        });

        return { success: true };
      }),

    // Obtener créditos de un cliente
    getByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para acceder a estos créditos",
          });
        }

        return getCreditsbyClientId(input.clientId);
      }),

    // Obtener crédito por ID
    getById: protectedProcedure
      .input(z.object({ creditId: z.number() }))
      .query(async ({ ctx, input }) => {
        const credit = await getCreditById(input.creditId);
        if (!credit) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Crédito no encontrado",
          });
        }

        // Verificar que el cliente pertenece al usuario
        const client = await getClientById(credit.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para acceder a este crédito",
          });
        }

        return credit;
      }),

    // Obtener créditos activos del usuario
    getActive: protectedProcedure.query(async ({ ctx }) => {
      return getActiveCredits(ctx.user.id);
    }),
  }),

  // ============ PAYMENT ROUTERS ============
  payments: router({
    // Registrar nuevo pago
    create: protectedProcedure
      .input(
        z.object({
          creditId: z.number(),
          amount: z.string().transform((val) => parseFloat(val)),
          paymentMethod: z.string().min(1, "El método de pago es requerido"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Obtener el crédito
        const credit = await getCreditById(input.creditId);
        if (!credit) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Crédito no encontrado",
          });
        }

        // Verificar que el cliente pertenece al usuario
        const client = await getClientById(credit.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para registrar este pago",
          });
        }

        // Crear el pago
        await createPayment({
          creditId: input.creditId,
          clientId: credit.clientId,
          amount: input.amount.toString(),
          paymentMethod: input.paymentMethod,
          notes: input.notes || null,
        });

        // Actualizar el saldo del crédito
        const newBalance = Number(credit.balance) - input.amount;
        const newStatus = newBalance <= 0 ? "paid" : "active";

        await updateCredit(input.creditId, {
          balance: Math.max(0, newBalance).toString(),
          status: newStatus,
        });

        // Crear log de WhatsApp para envío automático
        // Guardar el monto en messageContent para que el worker lo use
        await createWhatsappLog({
          clientId: credit.clientId,
          creditId: input.creditId,
          messageType: "payment_received",
          phoneNumber: client.whatsappNumber,
          messageContent: input.amount.toString(),
          status: "pending",
        });

        return { success: true };
      }),

    // Obtener pagos de un crédito
    getByCreditId: protectedProcedure
      .input(z.object({ creditId: z.number() }))
      .query(async ({ ctx, input }) => {
        const credit = await getCreditById(input.creditId);
        if (!credit) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Crédito no encontrado",
          });
        }

        // Verificar que el cliente pertenece al usuario
        const client = await getClientById(credit.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para acceder a estos pagos",
          });
        }

        return getPaymentsByCreditId(input.creditId);
      }),

    // Pago general a la deuda del cliente
    createGeneral: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          amount: z.number().positive(),
          paymentMethod: z.string().default("cash"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para crear este pago",
          });
        }

        const result = await createGeneralPayment(
          input.clientId,
          input.amount,
          ctx.user.id,
          input.paymentMethod,
          input.notes
        );

        await createWhatsappLog({
          clientId: input.clientId,
          messageType: "payment_received",
          phoneNumber: client.whatsappNumber,
          messageContent: input.amount.toString(),
          status: "pending",
        });

        return result;
      }),

    // Obtener pagos de un crédito específico
    getByCredit: protectedProcedure
      .input(z.object({ creditId: z.number() }))
      .query(async ({ ctx, input }) => {
        const credit = await getCreditById(input.creditId);
        if (!credit) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Credito no encontrado",
          });
        }

        const client = await getClientById(credit.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para acceder a estos pagos",
          });
        }

        return getPaymentsByCredit(input.creditId);
      }),
  }),

  // ============ DASHBOARD ROUTERS ============
  dashboard: router({
    getSummary: protectedProcedure.query(async ({ ctx }) => {
      return getDashboardSummary(ctx.user.id);
    }),
  }),

  // ============ WHATSAPP ROUTERS ============
  whatsapp: router({
    sendStatement: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para enviar este mensaje",
          });
        }

        // Crear log de WhatsApp para envío manual
        await createWhatsappLog({
          clientId: input.clientId,
          messageType: "manual_statement",
          phoneNumber: client.whatsappNumber,
          messageContent: "",
          status: "pending",
        });

        return { success: true };
      }),
  }),

  // ============ REPORTS ROUTERS ============
  reports: router({
    overdueCredits: protectedProcedure.query(async ({ ctx }) => {
      const buffer = await generateOverdueCreditsReport(ctx.user.id);
      return {
        filename: `reporte-creditos-vencidos-${new Date().toISOString().split('T')[0]}.pdf`,
        data: buffer.toString('base64'),
      };
    }),

    clientDebt: protectedProcedure.query(async ({ ctx }) => {
      const buffer = await generateClientDebtReport(ctx.user.id);
      return {
        filename: `reporte-deuda-clientes-${new Date().toISOString().split('T')[0]}.pdf`,
        data: buffer.toString('base64'),
      };
    }),

    paymentAnalysis: protectedProcedure.query(async ({ ctx }) => {
      const buffer = await generatePaymentAnalysisReport(ctx.user.id);
      return {
        filename: `reporte-analisis-pagos-${new Date().toISOString().split('T')[0]}.pdf`,
        data: buffer.toString('base64'),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
