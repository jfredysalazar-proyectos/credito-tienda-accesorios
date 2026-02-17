import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, Users, TrendingUp, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: summary, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              onClick={() => setLocation("/clientes/nuevo")}
              className="w-full"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
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
