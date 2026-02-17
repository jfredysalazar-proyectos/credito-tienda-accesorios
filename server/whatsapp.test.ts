import { describe, expect, it } from "vitest";
import {
  generateStatementMessage,
  generateNewCreditMessage,
  generatePaymentReceivedMessage,
} from "./whatsapp";

describe("WhatsApp Message Generation", () => {
  describe("generateStatementMessage", () => {
    it("should generate statement message with active credits", () => {
      const message = generateStatementMessage(
        "Juan Pérez",
        [
          {
            concept: "Procesador Intel i7",
            amount: 500000,
            balance: 250000,
            dueDate: new Date("2026-03-17"),
          },
        ],
        250000,
        1000000
      );

      expect(message).toContain("Juan Pérez");
      expect(message).toContain("Procesador Intel i7");
      expect(message).toContain("500.000");
      expect(message).toContain("250.000");
      expect(message).toContain("1.000.000");
    });

    it("should generate statement message without active credits", () => {
      const message = generateStatementMessage(
        "María García",
        [],
        0,
        500000
      );

      expect(message).toContain("María García");
      expect(message).toContain("No tienes créditos activos");
      expect(message).toContain("500.000");
    });
  });

  describe("generateNewCreditMessage", () => {
    it("should generate new credit message with credit days", () => {
      const message = generateNewCreditMessage(
        "Carlos López",
        "Tarjeta Gráfica RTX 4060",
        800000,
        30,
        new Date("2026-03-19")
      );

      expect(message).toContain("Carlos López");
      expect(message).toContain("Tarjeta Gráfica RTX 4060");
      expect(message).toContain("800.000");
      expect(message).toContain("30 días");
    });

    it("should generate new credit message without credit days", () => {
      const message = generateNewCreditMessage(
        "Ana Martínez",
        "Memoria RAM 16GB",
        300000,
        0
      );

      expect(message).toContain("Ana Martínez");
      expect(message).toContain("Memoria RAM 16GB");
      expect(message).toContain("300.000");
    });
  });

  describe("generatePaymentReceivedMessage", () => {
    it("should generate payment message with remaining balance", () => {
      const message = generatePaymentReceivedMessage(
        "Roberto Sánchez",
        200000,
        300000,
        "Procesador Intel i7"
      );

      expect(message).toContain("Roberto Sánchez");
      expect(message).toContain("200.000");
      expect(message).toContain("300.000");
      expect(message).toContain("Procesador Intel i7");
    });

    it("should generate payment message when credit is fully paid", () => {
      const message = generatePaymentReceivedMessage(
        "Patricia Ruiz",
        500000,
        0,
        "Monitor LG 27 pulgadas"
      );

      expect(message).toContain("Patricia Ruiz");
      expect(message).toContain("500.000");
      expect(message).toContain("¡Crédito pagado completamente!");
    });
  });
});
