import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PaymentRecord {
  id: number;
  creditId: number;
  clientId: number;
  amount: number;
  paymentMethod: string;
  notes: string | null | undefined;
  createdAt: Date;
  previousBalance: number;
  newBalance: number;
  concept: string;
}

interface PaymentHistoryProps {
  payments: PaymentRecord[];
  isLoading?: boolean;
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  check: "Cheque",
  credit_card: "Tarjeta de Crédito",
  debit_card: "Tarjeta Débito",
  general_payment: "Pago General",
  other: "Otro",
};

const paymentMethodColors: Record<string, string> = {
  cash: "bg-green-100 text-green-800",
  transfer: "bg-blue-100 text-blue-800",
  check: "bg-purple-100 text-purple-800",
  credit_card: "bg-orange-100 text-orange-800",
  debit_card: "bg-cyan-100 text-cyan-800",
  general_payment: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-800",
};

export default function PaymentHistory({ payments, isLoading }: PaymentHistoryProps) {
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Filtrar por método de pago
      if (filterMethod !== "all" && payment.paymentMethod !== filterMethod) {
        return false;
      }

      // Filtrar por fecha de inicio
      if (filterStartDate) {
        const paymentDate = new Date(payment.createdAt);
        const startDate = new Date(filterStartDate);
        if (paymentDate < startDate) {
          return false;
        }
      }

      // Filtrar por fecha de fin
      if (filterEndDate) {
        const paymentDate = new Date(payment.createdAt);
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (paymentDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [payments, filterMethod, filterStartDate, filterEndDate]);

  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Cargando historial...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Pagos</CardTitle>
        <CardDescription>
          {filteredPayments.length} pago{filteredPayments.length !== 1 ? "s" : ""} registrado{filteredPayments.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div>
            <Label htmlFor="filter-method">Forma de Pago</Label>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger id="filter-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                <SelectItem value="debit_card">Tarjeta Débito</SelectItem>
                <SelectItem value="general_payment">Pago General</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filter-start-date">Fecha Inicio</Label>
            <Input
              id="filter-start-date"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="filter-end-date">Fecha Fin</Label>
            <Input
              id="filter-end-date"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Resumen */}
        {filteredPayments.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700">
              Total Pagado: <span className="text-lg font-bold text-blue-600">${totalPaid.toLocaleString("es-CO")}</span>
            </p>
          </div>
        )}

        {/* Tabla */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No hay pagos registrados con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Saldo Anterior</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Nuevo Saldo</TableHead>
                  <TableHead>Forma de Pago</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {new Date(payment.createdAt).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>{payment.concept}</TableCell>
                    <TableCell className="text-right">
                      ${payment.previousBalance.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -${payment.amount.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      ${payment.newBalance.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>
                      <Badge className={paymentMethodColors[payment.paymentMethod] || "bg-gray-100 text-gray-800"}>
                        {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {payment.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
