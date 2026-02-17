import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createClient,
  getClientsByUserId,
  searchClients,
  searchClientsByCedula,
  getClientById,
  updateClient,
  createCredit,
  getCreditsByClientId,
  getCreditById,
  updateCredit,
  getActiveCredits,
  createPayment,
  getPaymentsByCreditId,
  getPaymentsByClientId,
  getTotalPaidByCreditId,
  createWhatsappLog,
  getWhatsappLogsByClientId,
} from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
            status: "active",
          });
          return { success: true };
        } catch (error: any) {
          if (error.message.includes("Duplicate entry")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Ya existe un cliente con esta cédula",
            });
          }
          throw error;
        }
      }),

    // Obtener todos los clientes del usuario
    list: protectedProcedure.query(async ({ ctx }) => {
      return getClientsByUserId(ctx.user.id);
    }),

    // Buscar clientes por nombre o cédula
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        // Si la búsqueda es solo números, buscar por cédula
        if (/^\d+$/.test(input.query)) {
          const byId = await searchClientsByCedula(ctx.user.id, input.query);
          if (byId.length > 0) return byId;
        }
        // Si no, buscar por nombre
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

    // Actualizar cliente
    update: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().optional(),
          whatsappNumber: z.string().optional(),
          creditLimit: z.string().transform((val) => parseFloat(val)).optional(),
          status: z.enum(["active", "inactive", "suspended"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente no encontrado",
          });
        }

        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.whatsappNumber) updateData.whatsappNumber = input.whatsappNumber;
        if (input.creditLimit) updateData.creditLimit = input.creditLimit.toString();
        if (input.status) updateData.status = input.status;

        await updateClient(input.clientId, ctx.user.id, updateData);
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
            code: "NOT_FOUND",
            message: "Cliente no encontrado",
          });
        }

        // Calcular fecha de vencimiento
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + input.creditDays);

        await createCredit({
          clientId: input.clientId,
          concept: input.concept,
          amount: input.amount.toString(),
          balance: input.amount.toString(),
          creditDays: input.creditDays,
          dueDate: input.creditDays > 0 ? dueDate : null,
          status: "active",
        });

        // Crear log de WhatsApp para envío automático
        await createWhatsappLog({
          clientId: input.clientId,
          messageType: "new_credit",
          phoneNumber: client.whatsappNumber,
          messageContent: "", // Se llenará después
          status: "pending",
        });

        return { success: true };
      }),

    // Obtener créditos de un cliente
    getByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verificar que el cliente pertenece al usuario
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente no encontrado",
          });
        }

        return getCreditsByClientId(input.clientId);
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

    // Obtener pagos de un cliente
    getByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente no encontrado",
          });
        }

        return getPaymentsByClientId(input.clientId);
      }),

    // Obtener total pagado de un crédito
    getTotalPaid: protectedProcedure
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
            message: "No tienes permiso para acceder a esta información",
          });
        }

        return getTotalPaidByCreditId(input.creditId);
      }),
  }),

  // ============ DASHBOARD ROUTERS ============
  dashboard: router({
    // Obtener resumen del dashboard
    getSummary: protectedProcedure.query(async ({ ctx }) => {
      const activeCredits = await getActiveCredits(ctx.user.id);
      
      let totalActiveCredit = 0;
      let totalBalance = 0;
      
      for (const { credits: credit } of activeCredits) {
        totalActiveCredit += Number(credit.amount);
        totalBalance += Number(credit.balance);
      }

      const clients = await getClientsByUserId(ctx.user.id);
      const clientsWithOverdueCredit = clients.filter((client) => {
        // Este cálculo se hará en el frontend o se puede mejorar aquí
        return true;
      });

      return {
        totalClients: clients.length,
        totalActiveCredits: activeCredits.length,
        totalActiveAmount: totalActiveCredit,
        totalPendingBalance: totalBalance,
        clientsCount: clients.length,
      };
    }),
  }),

  // ============ WHATSAPP ROUTERS ============
  whatsapp: router({
    // Obtener logs de WhatsApp de un cliente
    getLogs: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente no encontrado",
          });
        }

        return getWhatsappLogsByClientId(input.clientId);
      }),

    // Enviar estado de cuenta manual
    sendStatement: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente no encontrado",
          });
        }

        // Crear log de WhatsApp para envío manual
        await createWhatsappLog({
          clientId: input.clientId,
          messageType: "manual_statement",
          phoneNumber: client.whatsappNumber,
          messageContent: "", // Se llenará después
          status: "pending",
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
