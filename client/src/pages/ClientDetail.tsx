import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, ArrowLeft, Send, Loader2, Edit, ChevronDown, ChevronUp } from "lucide-react";
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
import EditClientForm from "@/components/EditClientForm";
import PaymentHistory from "@/components/PaymentHistory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGeneralPaymentOpen, setIsGeneralPaymentOpen] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState<number | null>(null);
  const [expandedCredits, setExpandedCredits] = useState<Set<number>>(new Set());
  const [generalPaymentAmount, setGeneralPaymentAmount] = useState("");
  const [generalPaymentMethod, setGeneralPaymentMethod] = useState("cash");
  const [generalPaymentNotes, setGeneralPaymentNotes] = useState("");

  const { data: client, isLoading: clientLoading } = trpc.clients.getById.useQuery(
    { clientId },
    { enabled: isAuthenticated && clientId > 0 }
  );

  const { data: credits, isLoading: creditsLoading } = trpc.credits.getByClientId.useQuery(
    { clientId },
    { enabled: isAuthenticated && clientId > 0 }
  );

  const { data: paymentHistory, isLoading: paymentHistoryLoading } = trpc.payments.getHistoryByClient.useQuery(
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

  const createGeneralPaymentMutation = trpc.payments.createGeneral.useMutation({
    onSuccess: () => {
      toast.success("Pago general registrado exitosamente");
      setIsGeneralPaymentOpen(false);
      setGeneralPaymentAmount("");
      void utils.credits.getByClientId.invalidate({ clientId });
      void utils.clients.getById.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar el pago general");
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/clientes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-muted-foreground mt-1">Cédula: {client.cedula}</p>
          </div>
        </div>
      </div>

      {/* Client Info Cards */}
      <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="flex gap-2 flex-wrap flex-col sm:flex-row">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Editar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Modifica la información del cliente
              </DialogDescription>
            </DialogHeader>
            <EditClientForm
              client={client}
              onClose={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
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
              onSubmit={(data: any) => {
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

        <Dialog open={isGeneralPaymentOpen} onOpenChange={setIsGeneralPaymentOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={totalBalance === 0} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Pago General a Deuda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pago General a Deuda</DialogTitle>
              <DialogDescription>
                Registra un pago que se distribuirá automáticamente entre los créditos activos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Deuda Total</Label>
                <div className="text-2xl font-bold text-red-600 mt-2">
                  ${totalBalance.toLocaleString("es-CO")}
                </div>
              </div>
              <div>
                <Label htmlFor="general-amount">Monto del Pago</Label>
                <Input
                  id="general-amount"
                  type="number"
                  placeholder="0.00"
                  value={generalPaymentAmount}
                  onChange={(e) => setGeneralPaymentAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Forma de Pago</Label>
                <Select value={generalPaymentMethod} onValueChange={setGeneralPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="debit_card">Tarjeta Débito</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment-notes">Notas (Opcional)</Label>
                <Textarea
                  id="payment-notes"
                  placeholder="Agrega notas sobre este pago..."
                  value={generalPaymentNotes}
                  onChange={(e) => setGeneralPaymentNotes(e.target.value)}
                  className="resize-none"
                />
              </div>
              <Button
                onClick={() => {
                  const amount = parseFloat(generalPaymentAmount);
                  if (isNaN(amount) || amount <= 0) {
                    toast.error("Ingresa un monto válido");
                    return;
                  }
                  if (amount > totalBalance) {
                    toast.error("El monto no puede ser mayor a la deuda total");
                    return;
                  }
                  createGeneralPaymentMutation.mutate({
                    clientId,
                    amount,
                    paymentMethod: generalPaymentMethod,
                    notes: generalPaymentNotes || undefined,
                  });
                  setGeneralPaymentAmount("");
                  setGeneralPaymentMethod("cash");
                  setGeneralPaymentNotes("");
                }}
                disabled={createGeneralPaymentMutation.isPending}
                className="w-full"
              >
                {createGeneralPaymentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Registrar Pago
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                    <TableHead></TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Fecha de Crédito</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((credit) => {
                    const isExpanded = expandedCredits.has(credit.id);
                    return (
                      <TableRow key={credit.id}>
                        <TableCell>
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedCredits);
                              if (isExpanded) {
                                newExpanded.delete(credit.id);
                              } else {
                                newExpanded.add(credit.id);
                              }
                              setExpandedCredits(newExpanded);
                            }}
                            className="p-1"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{credit.concept}</TableCell>
                        <TableCell>${Number(credit.amount).toLocaleString("es-CO")}</TableCell>
                        <TableCell>${Number(credit.balance).toLocaleString("es-CO")}</TableCell>
                        <TableCell>
                          {credit.createdAt
                            ? new Date(credit.createdAt).toLocaleDateString("es-CO")
                            : "N/A"}
                        </TableCell>
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
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedCreditId(credit.id)}
                                >
                                  Pagar
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
                                  onSubmit={(data: any) => {
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {paymentHistory && paymentHistory.length > 0 && (
        <PaymentHistory 
          payments={paymentHistory} 
          isLoading={paymentHistoryLoading}
          clientName={client?.name}
          clientCedula={client?.cedula}
          clientPhone={client?.whatsappNumber}
        />
      )}
    </div>
  );
}

function NewCreditForm({ clientId, onSubmit, isLoading }: any) {
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [creditDays, setCreditDays] = useState("0");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="concept">Concepto</Label>
        <Input
          id="concept"
          placeholder="Ej: Teclado mecánico"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="amount">Monto</Label>
        <Input
          id="amount"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.01"
          min="0"
        />
      </div>
      <div>
        <Label htmlFor="creditDays">Días de Crédito</Label>
        <Input
          id="creditDays"
          type="number"
          placeholder="30"
          value={creditDays}
          onChange={(e) => setCreditDays(e.target.value)}
          min="0"
        />
      </div>
      <Button
        onClick={() => {
          onSubmit({
            concept,
            amount,
            creditDays: parseInt(creditDays) || 0,
          });
        }}
        disabled={isLoading || !concept || !amount}
        className="w-full"
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        Registrar Crédito
      </Button>
    </div>
  );
}

function PaymentForm({ creditId, balance, onSubmit, isLoading }: any) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <Label>Saldo Pendiente</Label>
        <div className="text-2xl font-bold text-red-600 mt-2">
          ${balance.toLocaleString("es-CO")}
        </div>
      </div>
      <div>
        <Label htmlFor="amount">Monto del Pago</Label>
        <Input
          id="amount"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.01"
          min="0"
          max={balance}
        />
      </div>
      <div>
        <Label htmlFor="method">Método de Pago</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="transferencia">Transferencia</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Ej: Pago parcial"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      <Button
        onClick={() => {
          onSubmit({
            amount,
            paymentMethod,
            notes: notes || undefined,
          });
        }}
        disabled={isLoading || !amount}
        className="w-full"
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        Registrar Pago
      </Button>
    </div>
  );
}
