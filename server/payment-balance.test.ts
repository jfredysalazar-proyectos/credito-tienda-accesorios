import { describe, it, expect } from "vitest";

describe("Payment Balance Calculation", () => {
  it("should calculate balance due correctly from payment history", () => {
    // Simulamos el historial de pagos
    const payments = [
      {
        id: 1,
        amount: 100000,
        previousBalance: 500000,
        newBalance: 400000,
      },
      {
        id: 2,
        amount: 200000,
        previousBalance: 400000,
        newBalance: 200000,
      },
    ];

    // El saldo por pagar es el último saldo registrado
    const balanceDue = payments.length > 0 ? payments[payments.length - 1].newBalance : 0;

    expect(balanceDue).toBe(200000);
  });

  it("should return 0 balance due when no payments exist", () => {
    const payments: any[] = [];
    const balanceDue = payments.length > 0 ? payments[payments.length - 1].newBalance : 0;

    expect(balanceDue).toBe(0);
  });

  it("should calculate total paid correctly", () => {
    const payments = [
      { id: 1, amount: 100000 },
      { id: 2, amount: 200000 },
      { id: 3, amount: 150000 },
    ];

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    expect(totalPaid).toBe(450000);
  });

  it("should handle single payment correctly", () => {
    const payments = [
      {
        id: 1,
        amount: 500000,
        previousBalance: 500000,
        newBalance: 0,
      },
    ];

    const balanceDue = payments.length > 0 ? payments[payments.length - 1].newBalance : 0;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    expect(balanceDue).toBe(0);
    expect(totalPaid).toBe(500000);
  });

  it("should handle negative balance (overpayment) correctly", () => {
    const payments = [
      {
        id: 1,
        amount: 600000,
        previousBalance: 500000,
        newBalance: -100000,
      },
    ];

    const balanceDue = payments.length > 0 ? payments[payments.length - 1].newBalance : 0;

    expect(balanceDue).toBe(-100000);
  });
});
