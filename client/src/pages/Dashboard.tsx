import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, Users, TrendingUp, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: summary, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: clients } = trpc.clients.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Estado del modal de nuevo crédito
  const [isNewCreditOpen, setIsNewCreditOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [creditDays, setCreditDays] = useState("0");
  const [clientSearch, setClientSearch] = useState("");

  const createCreditMutation = trpc.credits.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Crédito registrado exitosamente");
      setIsNewCreditOpen(false);
      // Resetear formulario
      setSelectedClientId(null);
      setSelectedClientName("");
      setConcept("");
      setAmount("");
      setCreditDays("0");
      setClientSearch("");
      void utils.dashboard.getSummary.invalidate();

      // Opción de enviar por WhatsApp
      const client = clients?.find((c) => c.id === data.clientId);
      const amountFormatted = Number(data.amount || 0).toLocaleString("es-CO");
      const dueDate = data.dueDate ? new Date(data.dueDate).toLocaleDateString("es-CO") : "N/A";
      const totalBalanceFormatted = Number(data.totalBalance || 0).toLocaleString("es-CO");
      const message = `Hola *${client?.name || selectedClientName}*, te confirmo que hemos registrado tu nuevo crédito:\n\n📝 *${data.concept}*\n💵 Valor: *$${amountFormatted}*\n📅 Fecha de vencimiento: *${dueDate}*\n\n🔴 Tu saldo total adeudado es: *$${totalBalanceFormatted}*\n\n¡Gracias por tu confianza!`;
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

  const handleSubmitCredit = () => {
    if (!selectedClientId) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (!concept.trim()) {
      toast.error("Ingresa el concepto del crédito");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    createCreditMutation.mutate({
      clientId: selectedClientId,
      concept,
      amount: parsedAmount,
      creditDays: parseInt(creditDays) || 0,
    });
  };

  const filteredClients = clients?.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.cedula.includes(clientSearch)
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido, {user?.name || "Usuario"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">Clientes registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos Activos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalActiveCredits || 0}</div>
            <p className="text-xs text-muted-foreground">Créditos en vigencia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(summary?.totalActiveAmount || 0).toLocaleString("es-CO")}
            </div>
            <p className="text-xs text-muted-foreground">Créditos otorgados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(summary?.totalPendingBalance || 0).toLocaleString("es-CO")}
            </div>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Accede rápidamente a las funciones principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {/* Botón Nuevo Crédito */}
            <Dialog
              open={isNewCreditOpen}
              onOpenChange={(open) => {
                setIsNewCreditOpen(open);
                if (!open) {
                  setSelectedClientId(null);
                  setSelectedClientName("");
                  setConcept("");
                  setAmount("");
                  setCreditDays("0");
                  setClientSearch("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="w-full" size="lg">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Nuevo Crédito
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-full">
                <DialogHeader>
                  <DialogTitle>Nuevo Crédito</DialogTitle>
                  <DialogDescription>
                    Selecciona el cliente y completa los datos del crédito
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* Selector de cliente */}
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    {selectedClientId ? (
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted">
                        <span className="font-medium text-sm">{selectedClientName}</span>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-destructive ml-2"
                          onClick={() => {
                            setSelectedClientId(null);
                            setSelectedClientName("");
                            setClientSearch("");
                          }}
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <Command>
                          <CommandInput
                            placeholder="Buscar por nombre o cédula..."
                            value={clientSearch}
                            onValueChange={setClientSearch}
                          />
                          <CommandList className="max-h-40">
                            <CommandEmpty>No se encontraron clientes</CommandEmpty>
                            <CommandGroup>
                              {filteredClients.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  onSelect={() => {
                                    setSelectedClientId(c.id);
                                    setSelectedClientName(c.name);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div>
                                    <p className="font-medium">{c.name}</p>
                                    <p className="text-xs text-muted-foreground">Cédula: {c.cedula}</p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>

                  {/* Concepto */}
                  <div className="space-y-2">
                    <Label htmlFor="dash-concept">Concepto</Label>
                    <Input
                      id="dash-concept"
                      placeholder="Ej: Teclado mecánico"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                    />
                  </div>

                  {/* Monto */}
                  <div className="space-y-2">
                    <Label htmlFor="dash-amount">Monto</Label>
                    <Input
                      id="dash-amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Días de crédito */}
                  <div className="space-y-2">
                    <Label htmlFor="dash-creditDays">Días de Crédito</Label>
                    <Input
                      id="dash-creditDays"
                      type="number"
                      placeholder="0"
                      value={creditDays}
                      onChange={(e) => setCreditDays(e.target.value)}
                      min="0"
                    />
                  </div>

                  <Button
                    onClick={handleSubmitCredit}
                    disabled={createCreditMutation.isPending || !selectedClientId || !concept || !amount}
                    className="w-full"
                    size="lg"
                  >
                    {createCreditMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Registrar Crédito
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Botón Nuevo Cliente */}
            <Button
              onClick={() => setLocation("/clientes/nuevo")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>

            {/* Botón Ver Clientes */}
            <Button
              onClick={() => setLocation("/clientes")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Users className="mr-2 h-4 w-4" />
              Ver Clientes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
