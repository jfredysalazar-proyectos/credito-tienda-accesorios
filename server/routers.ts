import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createClient,
  listClients,
  searchClients,
  getClientById,
  createCredit,
  getCreditsbyClientId,
  getCreditById,
  updateCredit,
  getActiveCredits,
  createPayment,
  getPaymentsByCreditId,
  createWhatsappLog,
  getDashboardSummary,
} from "./db";
import { TRPCError } from "@trpc/server";
import { hashPassword, verifyPassword, getUserByEmail } from "./auth";

export const appRouter = router({
  system: systemRouter,

  // ============ AUTH ROUTERS ============
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

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

        // Crear sesión (esto se maneja en el contexto)
        // Por ahora solo retornamos el usuario
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
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
});

export type AppRouter = typeof appRouter;
