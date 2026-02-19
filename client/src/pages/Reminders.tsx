import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Calendar, Loader2, User } from "lucide-react";
import { toast } from "sonner";

export default function Reminders() {
  const { data: reminders, isLoading } = trpc.whatsapp.getUpcomingReminders.useQuery({ days: 7 });

  const sendWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success("Abriendo WhatsApp...");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recordatorios de Cobro</h1>
        <p className="text-muted-foreground mt-2">
          Créditos que vencen en los próximos 7 días. Envía un recordatorio rápido por WhatsApp.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reminders && reminders.length > 0 ? (
          reminders.map((reminder) => {
            const dueDate = new Date(reminder.dueDate!);
            const isOverdue = dueDate < new Date();
            const message = `Hola ${reminder.clientName}, te saludamos de la tienda. Te recordamos que tu crédito por "${reminder.concept}" de $${Number(reminder.amount).toLocaleString("es-CO")} vence el ${dueDate.toLocaleDateString("es-CO")}. El saldo pendiente es $${Number(reminder.balance).toLocaleString("es-CO")}. ¡Gracias!`;

            return (
              <Card key={reminder.id} className={isOverdue ? "border-red-200" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {reminder.clientName}
                    </CardTitle>
                    {isOverdue && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        Vencido
                      </span>
                    )}
                  </div>
                  <CardDescription>{reminder.concept}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Vence:
                    </span>
                    <span className="font-medium">{dueDate.toLocaleDateString("es-CO")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Saldo Pendiente:</span>
                    <span className="font-bold text-red-600">
                      ${Number(reminder.balance).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => sendWhatsApp(reminder.clientWhatsapp!, message)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Enviar Recordatorio
                  </Button>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-muted-foreground">
              No hay créditos próximos a vencer en los próximos 7 días.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
