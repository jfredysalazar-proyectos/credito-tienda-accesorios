import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { 
  createClient, 
  getClientById, 
  listClients, 
  searchClients, 
  updateClient,
  createCredit,
  getCreditsbyClientId,
  getCreditById,
  updateCredit,
  createPayment,
  getPaymentsByCredit,
  getPaymentHistoryByClient,
  getDashboardSummary,
  createGeneralPayment,
  getUpcomingExpiringCredits,
  getCompanyProfile,
  upsertCompanyProfile,
  resetClientAccount
} from "./db";
import { TRPCError } from "@trpc/server";
import { generatePaymentHistoryPDF, generateAccountStatementPDF } from "./pdf-generator";
import { generateClientBackupExcel } from "./excel-generator";
import { 
  generateOverdueCreditsReport, 
  generateClientDebtReport, 
  generatePaymentAnalysisReport 
} from "./reports";
import { createWhatsappLog } from "./db";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { payments, credits } from "../drizzle/schema";
import { getUserByEmail, verifyPassword } from "./auth";
import { sdk } from "./_core/sdk";

export const appRouter = router({
  // ============ AUTH ROUTERS ============
  auth: router({
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // En este proyecto 'username' se mapea a 'email' en la BD
        const user = await getUserByEmail(input.username);
        if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Usuario o contraseña incorrectos",
          });
        }
        
        const token = await sdk.createSessionToken(user.id, user.email);
        sdk.setSessionCookie(ctx.res, token);
        
        return { 
          success: true,
          user: { id: user.id, username: user.email } 
        };
      }),
    logout: protectedProcedure.mutation(({ ctx }) => {
      sdk.clearSessionCookie(ctx.res);
      return { success: true };
    }),
    me: protectedProcedure.query(({ ctx }) => {
      return ctx.user;
    }),
  }),

  // ============ CLIENT ROUTERS ============
  clients: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          cedula: z.string(),
          whatsappNumber: z.string(),
          creditLimit: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await createClient(ctx.user.id, input);
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string(),
          cedula: z.string(),
          whatsappNumber: z.string(),
          creditLimit: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, ...data } = input;
          return await updateClient(id, ctx.user.id, data);
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return listClients(ctx.user.id);
    }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        return searchClients(ctx.user.id, input.query);
      }),

    resetAccount: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return resetClientAccount(input.clientId, ctx.user.id);
      }),

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
    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          concept: z.string(),
          amount: z.number(),
          creditDays: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para asignar crédito a este cliente",
          });
        }

        const dueDate = input.creditDays > 0 
          ? new Date(Date.now() + input.creditDays * 24 * 60 * 60 * 1000)
          : null;

        const newCredit = {
          clientId: input.clientId,
          concept: input.concept,
          amount: input.amount.toString(),
          balance: input.amount.toString(),
          creditDays: input.creditDays,
          dueDate,
          status: "active",
        };

        await createCredit(newCredit);

        // Crear log de WhatsApp para envío automático
        await createWhatsappLog({
          clientId: input.clientId,
          messageType: "new_credit",
          phoneNumber: client.whatsappNumber,
          messageContent: "",
          status: "pending",
        });

        return { 
          success: true,
          ...newCredit,
          dueDate: dueDate?.toISOString() // Devolver como string ISO para el frontend
        };
      }),

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
  }),

  // ============ PAYMENT ROUTERS ============
  payments: router({
    create: protectedProcedure
      .input(
        z.object({
          creditId: z.number(),
          amount: z.number(),
          paymentMethod: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
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

        // Validar que el pago no sea mayor que el saldo
        const currentBalance = Number(credit.balance);
        if (input.amount > currentBalance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `El pago no puede ser mayor que el saldo adeudado. Saldo: $${currentBalance.toLocaleString("es-CO")}, Pago: $${input.amount.toLocaleString("es-CO")}`,
          });
        }

        // Crear el pago
        const paymentData = {
          creditId: input.creditId,
          clientId: credit.clientId,
          amount: input.amount.toString(),
          paymentMethod: input.paymentMethod,
          notes: input.notes || null,
        };

        await createPayment(paymentData);

        // Actualizar el saldo del crédito (permitir saldos negativos)
        const newBalance = currentBalance - input.amount;
        const newStatus = newBalance <= 0 ? "paid" : "active";

        await updateCredit(input.creditId, {
          balance: newBalance.toString(),
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

        return { 
          success: true, 
          ...paymentData,
          concept: credit.concept,
          newBalance: newBalance.toString()
        };
      }),

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

        const client = await getClientById(credit.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para acceder a estos pagos",
          });
        }

        return getPaymentsByCredit(input.creditId);
      }),

    getHistoryByClient: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para acceder a este historial",
          });
        }

        return getPaymentHistoryByClient(input.clientId, ctx.user.id);
      }),

    // Exportar historial a PDF
    exportToPDF: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const client = await getClientById(input.clientId, ctx.user.id);
          if (!client) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "No tienes permiso para acceder a este cliente",
            });
          }

          const history = await getPaymentHistoryByClient(input.clientId, ctx.user.id);
          const creditsData = await getCreditsbyClientId(input.clientId);
          const company = await getCompanyProfile(ctx.user.id);

          const pdfBuffer = await generatePaymentHistoryPDF(client, history, creditsData, company);
          const base64Pdf = pdfBuffer.toString("base64");
          const filename = `historial-pagos-${client.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
          
          return {
            success: true,
            pdf: base64Pdf,
            filename,
          };
        } catch (error) {
          console.error("[PDF Export] Error:", error);
          throw error;
        }
      }),

    createGeneralPayment: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          amount: z.number(),
          paymentMethod: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createGeneralPayment(
          input.clientId,
          input.amount,
          ctx.user.id,
          input.paymentMethod,
          input.notes
        );

        return result;
      }),

    // Alias requerido por el frontend
    createGeneral: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          amount: z.number(),
          paymentMethod: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createGeneralPayment(
          input.clientId,
          input.amount,
          ctx.user.id,
          input.paymentMethod,
          input.notes
        );

        return result;
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
    getUpcomingReminders: protectedProcedure
      .input(z.object({ days: z.number().default(3) }))
      .query(async ({ ctx, input }) => {
        return getUpcomingExpiringCredits(ctx.user.id, input.days);
      }),

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

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const clientCredits = await getCreditsbyClientId(input.clientId);
        const clientPayments = await db.select().from(payments).where(eq(payments.clientId, input.clientId));

        const paymentMethodMap: Record<string, string> = {
          'cash': 'Efectivo',
          'efectivo': 'Efectivo',
          'transfer': 'Transferencia',
          'transferencia': 'Transferencia',
          'check': 'Cheque',
          'cheque': 'Cheque',
          'credit_card': 'Tarjeta de Crédito',
          'debit_card': 'Tarjeta Débito',
          'general_payment': 'Pago General',
          'devolucion': 'Devolución',
          'other': 'Otro',
          'otro': 'Otro'
        };

        const allTransactions: any[] = [
          ...clientCredits.map(c => ({
            id: c.id,
            type: 'prestamo',
            amount: Number(c.amount),
            concept: c.concept,
            createdAt: new Date(c.createdAt)
          })),
          ...clientPayments.map(p => {
            const method = paymentMethodMap[p.paymentMethod] || p.paymentMethod || '';
            return {
              id: p.id,
              type: 'abono',
              amount: Number(p.amount),
              concept: `Abono a crédito ${method}`.trim(),
              createdAt: new Date(p.createdAt)
            };
          })
        ];

        allTransactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        let runningBalance = 0;
        const transactionsWithBalance = allTransactions.map(t => {
          if (t.type === 'prestamo') {
            runningBalance += t.amount;
          } else {
            runningBalance -= t.amount;
          }
          return { ...t, runningBalance };
        });

        const totalBalance = clientCredits.reduce((sum, c) => sum + Number(c.balance), 0);
        const company = await getCompanyProfile(ctx.user.id);

        const pdfBuffer = await generateAccountStatementPDF(
          client,
          transactionsWithBalance,
          { totalBalance },
          company
        );

        const base64Pdf = pdfBuffer.toString("base64");
        const filename = `estado-cuenta-${client.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

        return {
          success: true,
          pdf: base64Pdf,
          filename,
        };
      }),

    downloadBackup: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const client = await getClientById(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para acceder a este cliente",
          });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const clientCredits = await getCreditsbyClientId(input.clientId);
        const clientPayments = await db.select().from(payments).where(eq(payments.clientId, input.clientId));

        const paymentMethodMap: Record<string, string> = {
          'cash': 'Efectivo',
          'efectivo': 'Efectivo',
          'transfer': 'Transferencia',
          'transferencia': 'Transferencia',
          'check': 'Cheque',
          'cheque': 'Cheque',
          'credit_card': 'Tarjeta de Crédito',
          'debit_card': 'Tarjeta Débito',
          'general_payment': 'Pago General',
          'devolucion': 'Devolución',
          'other': 'Otro',
          'otro': 'Otro'
        };

        const allTransactions: any[] = [
          ...clientCredits.map(c => ({
            id: c.id,
            type: 'prestamo',
            amount: Number(c.amount),
            concept: c.concept,
            createdAt: new Date(c.createdAt)
          })),
          ...clientPayments.map(p => {
            const method = paymentMethodMap[p.paymentMethod] || p.paymentMethod || '';
            return {
              id: p.id,
              type: 'abono',
              amount: Number(p.amount),
              concept: `Abono a crédito ${method}`.trim(),
              createdAt: new Date(p.createdAt)
            };
          })
        ];

        allTransactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        let runningBalance = 0;
        const transactionsWithBalance = allTransactions.map(t => {
          if (t.type === 'prestamo') {
            runningBalance += t.amount;
          } else {
            runningBalance -= t.amount;
          }
          return { ...t, runningBalance };
        });

        const excelBuffer = await generateClientBackupExcel(client, transactionsWithBalance);
        const base64Excel = excelBuffer.toString("base64");
        const filename = `backup-cuenta-${client.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`;

        return {
          success: true,
          excel: base64Excel,
          filename,
        };
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

  // ============ COMPANY PROFILE ROUTERS ============
  company: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return getCompanyProfile(ctx.user.id);
    }),

    upsertProfile: protectedProcedure
      .input(z.object({
        name: z.string(),
        logoUrl: z.string().optional(),
        nit: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertCompanyProfile(ctx.user.id, input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
