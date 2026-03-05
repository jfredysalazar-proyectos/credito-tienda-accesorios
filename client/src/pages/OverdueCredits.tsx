import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MessageSquare, AlertTriangle, Loader2, User, Clock } from "lucide-react";
import { toast } from "sonner";

export default function OverdueCredits() {
  const { data: overdueCredits, isLoading } = trpc.whatsapp.getOverdueCredits.useQuery();

  const sendWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success("Abriendo WhatsApp...");
  };

  const buildOverdueMessage = (credit: {
    clientName?: string | null;
    concept: string;
    amount: string | number;
    balance: string | number;
    dueDate?: Date | string | null;
    daysOverdue?: number | null;
  }) => {
    const dueDate = credit.dueDate ? new Date(credit.dueDate) : null;
    const dueDateStr = dueDate ? dueDate.toLocaleDateString("es-CO") : "sin fecha";
    const daysText =
      credit.daysOverdue != null && credit.daysOverdue > 0
        ? ` (hace ${credit.daysOverdue} día${credit.daysOverdue === 1 ? "" : "s"})`
        : "";

    return (
      `⚠️ *Aviso de Crédito Vencido*\n\n` +
      `Estimado/a ${credit.clientName}, reciba un cordial saludo de parte de nuestro equipo.\n\n` +
      `Le informamos que el siguiente crédito se encuentra *vencido* y pendiente de pago:\n\n` +
      `📋 *Concepto:* ${credit.concept}\n` +
      `💰 *Monto original:* $${Number(credit.amount).toLocaleString("es-CO")}\n` +
      `🔴 *Saldo pendiente:* $${Number(credit.balance).toLocaleString("es-CO")}\n` +
      `📅 *Fecha de vencimiento:* ${dueDateStr}${daysText}\n\n` +
      `Le invitamos cordialmente a realizar su pago a través de los siguientes medios:\n\n` +
      `🏦 *Cuentas Bancarias:*\n` +
      `Bancolombia Ahorros 05921737175\n` +
      `Nequi o Daviplata al 3216413680\n` +
      `Llave 0038993804\n\n` +
      `¡Gracias por preferirnos y esperamos contar con su pronto pago! 🙏`
    );
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
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-red-600" />
          Créditos Vencidos
        </h1>
        <p className="text-muted-foreground mt-2">
          Créditos cuya fecha de vencimiento ya pasó y aún tienen saldo pendiente. Envía un recordatorio cordial por WhatsApp.
        </p>
      </div>

      {overdueCredits && overdueCredits.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-red-700 text-sm font-medium">
            Tienes <span className="font-bold">{overdueCredits.length}</span> crédito{overdueCredits.length !== 1 ? "s" : ""} vencido{overdueCredits.length !== 1 ? "s" : ""} con saldo pendiente.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {overdueCredits && overdueCredits.length > 0 ? (
          overdueCredits.map((credit) => {
            const dueDate = credit.dueDate ? new Date(credit.dueDate) : null;
            const message = buildOverdueMessage(credit);

            return (
              <Card key={credit.id} className="border-red-300 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {credit.clientName}
                    </CardTitle>
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Vencido
                    </span>
                  </div>
                  <CardDescription className="truncate">{credit.concept}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dueDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Venció:
                      </span>
                      <span className="font-medium text-red-600">
                        {dueDate.toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  )}
                  {credit.daysOverdue != null && credit.daysOverdue > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Días vencido:</span>
                      <span className="font-bold text-red-700">
                        {credit.daysOverdue} día{credit.daysOverdue !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monto original:</span>
                    <span className="font-medium">
                      ${Number(credit.amount).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Saldo Pendiente:</span>
                    <span className="font-bold text-red-600">
                      ${Number(credit.balance).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white mt-1"
                    onClick={() => sendWhatsApp(credit.clientWhatsapp!, message)}
                    disabled={!credit.clientWhatsapp}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Enviar Aviso por WhatsApp
                  </Button>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-10 w-10 text-green-400 mb-3" />
              <p className="font-medium text-green-700">¡Excelente! No hay créditos vencidos en este momento.</p>
              <p className="text-sm mt-1">Todos los créditos con fecha de vencimiento están al día.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
