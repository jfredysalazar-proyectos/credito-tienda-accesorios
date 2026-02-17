import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function NewClient() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    name: "",
    cedula: "",
    whatsappNumber: "",
    creditLimit: "",
  });

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente creado exitosamente");
      setLocation("/clientes");
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear el cliente");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.cedula || !formData.whatsappNumber || !formData.creditLimit) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    createClientMutation.mutate({
      name: formData.name,
      cedula: formData.cedula,
      whatsappNumber: formData.whatsappNumber,
      creditLimit: formData.creditLimit,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-muted-foreground mt-1">
            Registra un nuevo cliente en el sistema
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
          <CardDescription>
            Completa todos los campos para crear un nuevo cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej: Juan Pérez García"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={createClientMutation.isPending}
                />
              </div>

              <div>
                <Label htmlFor="cedula">Cédula *</Label>
                <Input
                  id="cedula"
                  name="cedula"
                  placeholder="Ej: 1234567890"
                  value={formData.cedula}
                  onChange={handleChange}
                  disabled={createClientMutation.isPending}
                />
              </div>

              <div>
                <Label htmlFor="whatsappNumber">Número de WhatsApp *</Label>
                <Input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  placeholder="Ej: +573001234567"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  disabled={createClientMutation.isPending}
                />
              </div>

              <div>
                <Label htmlFor="creditLimit">Cupo de Crédito *</Label>
                <Input
                  id="creditLimit"
                  name="creditLimit"
                  type="number"
                  placeholder="Ej: 1000000"
                  value={formData.creditLimit}
                  onChange={handleChange}
                  disabled={createClientMutation.isPending}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={createClientMutation.isPending}
                className="flex-1"
              >
                {createClientMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Crear Cliente
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/clientes")}
                disabled={createClientMutation.isPending}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • La <strong>cédula</strong> debe ser única en el sistema
          </p>
          <p>
            • El <strong>número de WhatsApp</strong> debe incluir el código de país (ej: +573001234567)
          </p>
          <p>
            • El <strong>cupo de crédito</strong> es el máximo que puede adeudarse este cliente
          </p>
          <p>
            • Una vez creado, podrás registrar créditos y pagos para este cliente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
