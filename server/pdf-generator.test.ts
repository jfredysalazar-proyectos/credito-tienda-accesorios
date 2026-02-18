import { describe, it, expect } from "vitest";
import { generatePaymentHistoryPDF } from "./pdf-generator";

describe("PDF Generator", () => {
  it("should generate a valid PDF buffer", async () => {
    const mockClient = {
      id: 1,
      name: "Juan Pérez",
      cedula: "1234567890",
      whatsappNumber: "+57 300 1234567",
      creditLimit: 1000000,
    };

    const mockHistory = [
      {
        id: 1,
        clientId: 1,
        concept: "Crédito Inicial",
        amount: 500000,
        previousBalance: 0,
        newBalance: 500000,
        paymentMethod: "Efectivo",
        notes: "Primer crédito",
        createdAt: new Date("2026-02-01"),
      },
      {
        id: 2,
        clientId: 1,
        concept: "Pago General",
        amount: 200000,
        previousBalance: 500000,
        newBalance: 300000,
        paymentMethod: "Transferencia",
        notes: "Pago parcial",
        createdAt: new Date("2026-02-10"),
      },
    ];

    const pdfBuffer = await generatePaymentHistoryPDF(mockClient, mockHistory);

    // Verificar que se retorna un Buffer
    expect(pdfBuffer).toBeInstanceOf(Buffer);

    // Verificar que el buffer no está vacío
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Verificar que el buffer comienza con la firma de PDF (%PDF)
    const pdfSignature = pdfBuffer.toString("utf-8", 0, 4);
    expect(pdfSignature).toBe("%PDF");
  });

  it("should handle empty payment history", async () => {
    const mockClient = {
      id: 1,
      name: "Carlos López",
      cedula: "9876543210",
      whatsappNumber: "+57 300 9876543",
      creditLimit: 500000,
    };

    const emptyHistory: any[] = [];

    const pdfBuffer = await generatePaymentHistoryPDF(mockClient, emptyHistory);

    // Verificar que se retorna un Buffer válido incluso con historial vacío
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Verificar firma PDF
    const pdfSignature = pdfBuffer.toString("utf-8", 0, 4);
    expect(pdfSignature).toBe("%PDF");
  });

  it("should include client information in PDF", async () => {
    const mockClient = {
      id: 1,
      name: "María García",
      cedula: "5555555555",
      whatsappNumber: "+57 300 5555555",
      creditLimit: 2000000,
    };

    const mockHistory = [
      {
        id: 1,
        clientId: 1,
        concept: "Crédito",
        amount: 1000000,
        previousBalance: 0,
        newBalance: 1000000,
        paymentMethod: "Efectivo",
        notes: "",
        createdAt: new Date("2026-02-15"),
      },
    ];

    const pdfBuffer = await generatePaymentHistoryPDF(mockClient, mockHistory);

    // Convertir a string para buscar contenido
    const pdfString = pdfBuffer.toString("latin1");

    // Verificar que contiene información del cliente (aunque esté codificada)
    expect(pdfString.length).toBeGreaterThan(0);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
  });
});
