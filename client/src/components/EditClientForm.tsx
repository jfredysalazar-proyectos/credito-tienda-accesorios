import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EditClientFormProps {
  client: {
    id: number;
    name: string;
    cedula: string;
    whatsappNumber: string;
    creditLimit: string | number;
  };
  onClose: () => void;
}

export default function EditClientForm({ client, onClose }: EditClientFormProps) {
  const [name, setName] = useState(client.name);
  const [cedula, setCedula] = useState(client.cedula);
  const [whatsappNumber, setWhatsappNumber] = useState(client.whatsappNumber);
  const [creditLimit, setCreditLimit] = useState(client.creditLimit.toString());

  const utils = trpc.useUtils();

  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente actualizado exitosamente");
      void utils.clients.getById.invalidate({ clientId: client.id });
      void utils.clients.list.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar el cliente");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !cedula || !whatsappNumber || !creditLimit) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    updateClientMutation.mutate({
      clientId: client.id,
      name,
      cedula,
      whatsappNumber,
      creditLimit,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-name">Nombre</Label>
        <Input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={updateClientMutation.isPending}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="edit-cedula">Cédula</Label>
        <Input
          id="edit-cedula"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          disabled={updateClientMutation.isPending}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="edit-whatsapp">Número de WhatsApp</Label>
        <Input
          id="edit-whatsapp"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          disabled={updateClientMutation.isPending}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="edit-creditLimit">Cupo de Crédito</Label>
        <Input
          id="edit-creditLimit"
          type="number"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          disabled={updateClientMutation.isPending}
          className="mt-2"
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={updateClientMutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={updateClientMutation.isPending}
        >
          {updateClientMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
