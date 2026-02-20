import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, ArrowLeft, Send, Loader2, Edit, ChevronDown, ChevronUp, FileText, MessageCircle } from "lucide-react";
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
    onSuccess: (data: any) => {
      toast.success("Crédito registrado exitosamente");
      setIsNewCreditOpen(false);
      void utils.credits.getByClientId.invalidate({ clientId });
      void utils.clients.getById.invalidate({ clientId });
      
      // Opción de enviar por WhatsApp
      const concept = data.concept || "un nuevo producto";
      const amount = Number(data.amount || 0).toLocaleString("es-CO");
      const dueDate = data.dueDate ? new Date(data.dueDate).toLocaleDateString("es-CO") : "N/A";
      
      const message = `Hola ${client?.name}, te confirmo que hemos registrado tu nuevo crédito por "${concept}" por un valor de $${amount}. Fecha de vencimiento: ${dueDate}. ¡Gracias por tu confianza!`;
      const url = `https://wa.me/${client?.whatsappNumber?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(message)}`;
      
      toast("¿Deseas enviar el comprobante por WhatsApp?", {
        action: {
          label: "Enviar",
          onClick: () => window.open(url, "_blank"),
        },
      });
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar el crédito");
    },
  });

  const createPaymentMutation = trpc.payments.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Pago registrado exitosamente");
      setIsPaymentOpen(false);
      setSelectedCreditId(null);
      void utils.credits.getByClientId.invalidate({ clientId });
      void utils.clients.getById.invalidate({ clientId });
      void utils.payments.getHistoryByClient.invalidate({ clientId });

      // Opción de enviar por WhatsApp
      const amount = Number(data.amount || 0).toLocaleString("es-CO");
      const newBalance = Number(data.newBalance || 0).toLocaleString("es-CO");
      
      const message = `Hola ${client?.name}, hemos recibido tu pago de $${amount}. Tu nuevo saldo es $${newBalance}. ¡Muchas gracias!`;
      const url = `https://wa.me/${client?.whatsappNumber?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(message)}`;
      
      toast("¿Deseas enviar el recibo por WhatsApp?", {
        action: {
          label: "Enviar",
          onClick: () => window.open(url, "_blank"),
        },
      });
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar el pago");
    },
  });

  const sendStatementMutation = trpc.whatsapp.sendStatement.useMutation({
    onSuccess: (data) => {
      if (data.pdf && data.filename) {
        // Crear un enlace para descargar el PDF
        const linkSource = `data:application/pdf;base64,${data.pdf}`;
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = data.filename;
        downloadLink.click();
        toast.success("Estado de cuenta generado correctamente");
      } else {
        toast.success("Estado de cuenta enviado por WhatsApp");
      }
      void utils.credits.getByClientId.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(error.message || "Error al generar el estado de cuenta");
    },
  });

  const createGeneralPaymentMutation = trpc.payments.createGeneral.useMutation({
    onSuccess: (data: any) => {
      toast.success("Pago general registrado exitosamente");
      setIsGeneralPaymentOpen(false);
      setGeneralPaymentAmount("");
      void utils.credits.getByClientId.invalidate({ clientId });
      void utils.clients.getById.invalidate({ clientId });
      void utils.payments.getHistoryByClient.invalidate({ clientId });

      // Opción de enviar por WhatsApp
      const totalPaid = Number(data.totalPaid || 0);
      const remainingBalance = Math.max(0, totalBalance - totalPaid);
      
      const message = `Hola ${client?.name}, hemos recibido tu pago general de $${totalPaid.toLocaleString("es-CO")}. Tu saldo total adeudado ahora es de $${remainingBalance.toLocaleString("es-CO")}. ¡Muchas gracias!`;
      const url = `https://wa.me/${client?.whatsappNumber?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(message)}`;
      
      toast("¿Deseas enviar el recibo por WhatsApp?", {
        action: {
          label: "Enviar",
          onClick: () => window.open(url, "_blank"),
        },
      });
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

  const toggleCredit = (id: number) => {
    const next = new Set(expandedCredits);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedCredits(next);
  };

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
            <CardTitle className="text-sm font-medium">Cupo de Crédito Disponible</CardTitle>
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
              <DialogTitle>Nuevo Crédito</DialogTitle>
              <DialogDescription>
                Registra una nueva compra a crédito para {client.name}
              </DialogDescription>
            </DialogHeader>
            <NewCreditForm
              clientId={clientId}
              onSubmit={(data: any) => createCreditMutation.mutate({ clientId, ...data })}
              isLoading={createCreditMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Botón de Pago General */}
        <Dialog open={isGeneralPaymentOpen} onOpenChange={setIsGeneralPaymentOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" disabled={totalBalance <= 0}>
              <Send className="mr-2 h-4 w-4" />
              Registrar Pago General
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pago General</DialogTitle>
              <DialogDescription>
                Este pago se distribuirá automáticamente entre los créditos activos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Saldo Total Adeudado</Label>
                <div className="text-2xl font-bold text-red-600">
                  ${totalBalance.toLocaleString("es-CO")}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto a Pagar</Label>
                <Input
                  id="payment-amount"
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="devolucion">Devolución</SelectItem>
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
                    toast.error("El monto supera la deuda total");
                    return;
                  }
                  createGeneralPaymentMutation.mutate({
                    clientId,
                    amount,
                    paymentMethod: generalPaymentMethod,
                    notes: generalPaymentNotes || undefined,
                  });
                }}
                className="w-full"
                disabled={createGeneralPaymentMutation.isPending || !generalPaymentAmount}
              >
                {createGeneralPaymentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Confirmar Pago General
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="outline" 
          onClick={() => sendStatementMutation.mutate({ clientId })}
          disabled={sendStatementMutation.isPending}
        >
          {sendStatementMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Generar Estado de Cuenta
        </Button>

        <Button 
          variant="outline"
          className="text-green-600 border-green-600 hover:bg-green-50"
          onClick={() => {
            const activeCredits = credits?.filter(c => c.status === 'active') || [];
            if (activeCredits.length === 0) {
              toast.info("El cliente no tiene créditos pendientes");
              return;
            }

            let message = `*RESUMEN DE CRÉDITOS PENDIENTES*\n\n`;
            message += `Hola *${client.name}*, te envío el detalle de tus créditos activos:\n\n`;
            
            activeCredits.forEach((c) => {
              const date = new Date(c.createdAt).toLocaleDateString("es-CO");
              const balance = Number(c.balance).toLocaleString("es-CO");
              message += `📅 ${date}\n📝 ${c.concept}\n💰 Saldo: *$${balance}*\n\n`;
            });

            message += `--------------------------\n`;
            message += `🔴 *DEUDA TOTAL: $${totalBalance.toLocaleString("es-CO")}*\n`;
            message += `--------------------------\n\n`;
            message += `Quedo atento a cualquier duda. ¡Gracias!`;

            const url = `https://wa.me/${client.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
            window.open(url, "_blank");
          }}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Enviar Resumen WhatsApp
        </Button>
      </div>

      {/* Credits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Créditos</CardTitle>
          <CardDescription>Gestión de créditos y abonos</CardDescription>
        </CardHeader>
        <CardContent>
          {!credits || credits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay créditos registrados</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((credit) => {
                    const isExpanded = expandedCredits.has(credit.id);
                    return (
                      <TableRow key={credit.id}>
                        <TableCell className="font-medium">
                          {new Date(credit.createdAt).toLocaleDateString("es-CO")}
                        </TableCell>
                        <TableCell>{credit.concept}</TableCell>
                        <TableCell className="text-right">
                          ${Number(credit.amount).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${Number(credit.balance).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            credit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {credit.status === 'active' ? 'Activo' : 'Pagado'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {credit.status === 'active' && (
                            <Dialog open={isPaymentOpen && selectedCreditId === credit.id} onOpenChange={(open) => {
                              setIsPaymentOpen(open);
                              if (!open) setSelectedCreditId(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setSelectedCreditId(credit.id)}>
                                  Abonar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Registrar Abono</DialogTitle>
                                  <DialogDescription>
                                    Abonar al crédito: {credit.concept}
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
              {/* Deuda Total */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Deuda Total:</span>
                  <span className="font-bold text-lg text-red-600">
                    ${credits.reduce((sum, c) => sum + Number(c.balance), 0).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
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
          clientId={clientId}
          credits={credits}
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
            <SelectItem value="devolucion">Devolución</SelectItem>
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
