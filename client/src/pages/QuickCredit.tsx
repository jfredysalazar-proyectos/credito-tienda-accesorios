import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function QuickCredit() {
  const { isAuthenticated } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [creditDays, setCreditDays] = useState("30");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: clients } = trpc.clients.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createCreditMutation = trpc.credits.create.useMutation({
    onSuccess: () => {
      toast.success("Crédito registrado exitosamente");
      setSelectedClientId(null);
      setConcept("");
      setAmount("");
      setCreditDays("30");
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar el crédito");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId || !concept || !amount) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    createCreditMutation.mutate({
      clientId: selectedClientId,
      concept,
      amount: parseFloat(amount) || 0,
      creditDays: parseInt(creditDays),
    });
  };

  const filteredClients = clients?.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cedula.includes(searchTerm)
  ) || [];

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Crédito Rápido</h1>
        <p className="text-muted-foreground mt-2">
          Registra un nuevo crédito seleccionando un cliente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Selector de Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Cliente</CardTitle>
            <CardDescription>
              Busca y selecciona el cliente para el crédito
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Buscar por nombre o cédula</Label>
              <Input
                id="search"
                placeholder="Ej: Juan Pérez o 1234567890"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3">
              {filteredClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay clientes disponibles
                </p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedClientId === client.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Cédula: {client.cedula}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cupo disponible: ${Math.max(0, Number(client.creditLimit)).toLocaleString("es-CO")}
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Formulario de Crédito */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Crédito</CardTitle>
            <CardDescription>
              {selectedClient
                ? `Cliente: ${selectedClient.name}`
                : "Selecciona un cliente primero"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="concept">Concepto</Label>
                <Input
                  id="concept"
                  placeholder="Ej: Procesador Intel i7"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  disabled={!selectedClientId || createCreditMutation.isPending}
                  className="mt-2"
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
                  disabled={!selectedClientId || createCreditMutation.isPending}
                  className="mt-2"
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
                  disabled={!selectedClientId || createCreditMutation.isPending}
                  className="mt-2"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!selectedClientId || createCreditMutation.isPending}
              >
                {createCreditMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Registrar Crédito
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
