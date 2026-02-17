import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, ArrowLeft, Send, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClientDetail() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const clientId = parseInt(params.id || "0");
  const utils = trpc.useUtils();

  const [isNewCreditOpen, setIsNewCreditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState<number | null>(null);

  const { data: client, isLoading: clientLoading } = trpc.clients.getById.useQuery(
    { clientId },
    { enabled: isAuthenticated && clientId > 0 }
  );

  const { data: credits, isLoading: creditsLoading } = trpc.credits.getByClientId.useQuery(
    { clientId },
    { enabled: isAuthenticated && clientId > 0 }
  );

  const createCreditMutation = trpc.credits.create.useMutation({
    onSuccess: () => {
      toast.success("Crédito registrado exitosamente");
      setIsNewCreditOpen(false);
      void utils.credits.getByClientId.invalidate({ clientId });
      void utils.clients.getById.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar el crédito");
    },
  });

  const createPaymentMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      toast.success("Pago registrado exitosamente");
      setIsPaymentOpen(false);
      setSelectedCreditId(null);
      void utils.credits.getByClientId.invalidate({ clientId });
      void utils.clients.getById.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar el pago");
    },
  });

  const sendStatementMutation = trpc.whatsapp.sendStatement.useMutation({
    onSuccess: () => {
      toast.success("Estado de cuenta enviado por WhatsApp");
      void utils.credits.getByClientId.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar el estado de cuenta");
    },
  });

  if (clientLoading || creditsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/clientes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Cliente no encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalBalance = credits?.reduce((sum, credit) => sum + Number(credit.balance), 0) || 0;
  const availableCredit = Number(client.creditLimit) - totalBalance;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/clientes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-muted-foreground mt-1">Cédula: {client.cedula}</p>
          </div>
        </div>
      </div>

      {/* Client Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cupo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Number(client.creditLimit).toLocaleString("es-CO")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Adeudado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalBalance.toLocaleString("es-CO")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Crédito Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${Math.max(0, availableCredit).toLocaleString("es-CO")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">{client.whatsappNumber}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Dialog open={isNewCreditOpen} onOpenChange={setIsNewCreditOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Crédito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Crédito</DialogTitle>
              <DialogDescription>
                Registra un nuevo crédito para {client.name}
              </DialogDescription>
            </DialogHeader>
            <NewCreditForm
              clientId={clientId}
              onSubmit={(data) => {
                createCreditMutation.mutate({
                  clientId,
                  ...data,
                });
              }}
              isLoading={createCreditMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          onClick={() => sendStatementMutation.mutate({ clientId })}
          disabled={sendStatementMutation.isPending}
        >
          <Send className="mr-2 h-4 w-4" />
          Enviar Estado de Cuenta
        </Button>
      </div>

      {/* Credits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Créditos Registrados</CardTitle>
          <CardDescription>
            {credits?.length || 0} crédito{credits?.length !== 1 ? "s" : ""} registrado{credits?.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!credits || credits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay créditos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell className="font-medium">{credit.concept}</TableCell>
                      <TableCell>${Number(credit.amount).toLocaleString("es-CO")}</TableCell>
                      <TableCell>${Number(credit.balance).toLocaleString("es-CO")}</TableCell>
                      <TableCell>
                        {credit.dueDate
                          ? new Date(credit.dueDate).toLocaleDateString("es-CO")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            credit.status === "active"
                              ? "bg-blue-100 text-blue-800"
                              : credit.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {credit.status === "active"
                            ? "Activo"
                            : credit.status === "paid"
                            ? "Pagado"
                            : "Vencido"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {credit.status === "active" && (
                          <Dialog open={isPaymentOpen && selectedCreditId === credit.id} onOpenChange={(open) => {
                            setIsPaymentOpen(open);
                            if (!open) setSelectedCreditId(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCreditId(credit.id)}
                              >
                                Registrar Pago
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Registrar Pago</DialogTitle>
                                <DialogDescription>
                                  Registra un pago para {credit.concept}
                                </DialogDescription>
                              </DialogHeader>
                              <PaymentForm
                                creditId={credit.id}
                                balance={Number(credit.balance)}
                                onSubmit={(data) => {
                                  createPaymentMutation.mutate({
                                    creditId: credit.id,
                                    ...data,
                                  });
                                }}
                                isLoading={createPaymentMutation.isPending}
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewCreditForm({
  clientId,
  onSubmit,
  isLoading,
}: {
  clientId: number;
  onSubmit: (data: { concept: string; amount: string; creditDays: number }) => void;
  isLoading: boolean;
}) {
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [creditDays, setCreditDays] = useState("0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || !amount) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    onSubmit({
      concept,
      amount,
      creditDays: parseInt(creditDays),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="concept">Concepto</Label>
        <Input
          id="concept"
          placeholder="Ej: Procesador Intel i7"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="amount">Monto</Label>
        <Input
          id="amount"
          type="number"
          placeholder="Ej: 500000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="creditDays">Días de Crédito</Label>
        <Input
          id="creditDays"
          type="number"
          placeholder="Ej: 30"
          value={creditDays}
          onChange={(e) => setCreditDays(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Registrar Crédito
      </Button>
    </form>
  );
}

function PaymentForm({
  creditId,
  balance,
  onSubmit,
  isLoading,
}: {
  creditId: number;
  balance: number;
  onSubmit: (data: { amount: string; paymentMethod: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paymentMethod) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    const paymentAmount = parseFloat(amount);
    if (paymentAmount > balance) {
      toast.error(`El monto no puede ser mayor al saldo (${balance})`);
      return;
    }
    onSubmit({
      amount,
      paymentMethod,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Monto a Pagar</Label>
        <div className="text-sm text-muted-foreground mb-2">
          Saldo pendiente: ${balance.toLocaleString("es-CO")}
        </div>
        <Input
          id="amount"
          type="number"
          placeholder={`Máximo: ${balance}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="paymentMethod">Método de Pago</Label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
        >
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="cheque">Cheque</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div>
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Ej: Referencia de transferencia"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Registrar Pago
      </Button>
    </form>
  );
}
