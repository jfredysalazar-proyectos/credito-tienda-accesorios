import { describe, it, expect } from "vitest";

describe("Payment Balance Calculation", () => {
  it("should calculate total debt from active credits", () => {
    // Simulamos los créditos del cliente
    const credits = [
      { id: 1, balance: 100000, status: 'active' },
      { id: 2, balance: 200000, status: 'active' },
      { id: 3, balance: 50000, status: 'paid' }, // Este no debe contar
    ];

    // El saldo por pagar es la suma de todos los créditos activos
    const balanceDue = credits.reduce((sum: number, credit: any) => {
      const creditBalance = typeof credit.balance === 'string' ? parseFloat(credit.balance) : credit.balance;
      return credit.status === 'active' ? sum + creditBalance : sum;
    }, 0);

    expect(balanceDue).toBe(300000);
  });

  it("should return 0 balance due when no active credits exist", () => {
    const credits = [
      { id: 1, balance: 100000, status: 'paid' },
      { id: 2, balance: 200000, status: 'paid' },
    ];

    const balanceDue = credits.reduce((sum: number, credit: any) => {
      const creditBalance = typeof credit.balance === 'string' ? parseFloat(credit.balance) : credit.balance;
      return credit.status === 'active' ? sum + creditBalance : sum;
    }, 0);

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

  it("should handle string balance values correctly", () => {
    const credits = [
      { id: 1, balance: "100000", status: 'active' },
      { id: 2, balance: "200000", status: 'active' },
    ];

    const balanceDue = credits.reduce((sum: number, credit: any) => {
      const creditBalance = typeof credit.balance === 'string' ? parseFloat(credit.balance) : credit.balance;
      return credit.status === 'active' ? sum + creditBalance : sum;
    }, 0);

    expect(balanceDue).toBe(300000);
  });

  it("should handle mixed active and inactive credits correctly", () => {
    const credits = [
      { id: 1, balance: 100000, status: 'active' },
      { id: 2, balance: 200000, status: 'active' },
      { id: 3, balance: 50000, status: 'paid' },
      { id: 4, balance: 75000, status: 'overdue' }, // Crédito vencido no debe contar
    ];

    const balanceDue = credits.reduce((sum: number, credit: any) => {
      const creditBalance = typeof credit.balance === 'string' ? parseFloat(credit.balance) : credit.balance;
      return credit.status === 'active' ? sum + creditBalance : sum;
    }, 0);

    expect(balanceDue).toBe(300000);
  });
});
