import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const overdueQuery = trpc.reports.overdueCredits.useQuery(undefined, {
    enabled: false,
  });

  const debtQuery = trpc.reports.clientDebt.useQuery(undefined, {
    enabled: false,
  });

  const paymentQuery = trpc.reports.paymentAnalysis.useQuery(undefined, {
    enabled: false,
  });

  const downloadReport = async (
    queryFn: () => Promise<{ filename: string; data: string }>,
    reportName: string
  ) => {
    try {
      const result = await queryFn();
      const binaryString = atob(result.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${reportName} descargado exitosamente`);
    } catch (error) {
      toast.error(`Error al descargar ${reportName}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground mt-2">
          Descarga reportes detallados sobre créditos, deudas y pagos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {/* Créditos Vencidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Créditos Vencidos
            </CardTitle>
            <CardDescription>
              Lista de créditos con fecha de vencimiento pasada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Obtén un reporte detallado de todos los créditos vencidos, incluyendo días de atraso.
            </p>
            <Button
              onClick={() =>
                downloadReport(
                  () => overdueQuery.refetch().then(r => r.data!),
                  "Reporte de Créditos Vencidos"
                )
              }
              disabled={overdueQuery.isFetching}
              className="w-full"
            >
              {overdueQuery.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar PDF
            </Button>
          </CardContent>
        </Card>

        {/* Deuda por Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deuda por Cliente
            </CardTitle>
            <CardDescription>
              Análisis de deuda total por cada cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Reporte con deuda total, cupo disponible y porcentaje de utilización por cliente.
            </p>
            <Button
              onClick={() =>
                downloadReport(
                  () => debtQuery.refetch().then(r => r.data!),
                  "Reporte de Deuda por Cliente"
                )
              }
              disabled={debtQuery.isFetching}
              className="w-full"
            >
              {debtQuery.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar PDF
            </Button>
          </CardContent>
        </Card>

        {/* Análisis de Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Análisis de Pagos
            </CardTitle>
            <CardDescription>
              Estadísticas de pagos por período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Análisis de pagos recibidos este mes, mes anterior y año actual.
            </p>
            <Button
              onClick={() =>
                downloadReport(
                  () => paymentQuery.refetch().then(r => r.data!),
                  "Reporte de Análisis de Pagos"
                )
              }
              disabled={paymentQuery.isFetching}
              className="w-full"
            >
              {paymentQuery.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
