import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Loader2, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClientsList() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients, isLoading } = trpc.clients.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: searchResults } = trpc.clients.search.useQuery(
    { query: searchQuery },
    {
      enabled: isAuthenticated && searchQuery.length > 0,
    }
  );

  const displayedClients = useMemo(() => {
    if (searchQuery.length > 0 && searchResults) {
      return searchResults;
    }
    return clients || [];
  }, [clients, searchResults, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus clientes y sus créditos
          </p>
        </div>
        <Button onClick={() => setLocation("/clientes/nuevo")} size="lg" className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {displayedClients.length} cliente{displayedClients.length !== 1 ? "s" : ""} registrado{displayedClients.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayedClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery.length > 0
                  ? "No se encontraron clientes con esa búsqueda"
                  : "No hay clientes registrados aún"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Cupo de Crédito</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.cedula}</TableCell>
                      <TableCell>{client.whatsappNumber}</TableCell>
                      <TableCell>
                        ${Number(client.creditLimit).toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.status === "active"
                              ? "bg-green-100 text-green-800"
                              : client.status === "inactive"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {client.status === "active"
                            ? "Activo"
                            : client.status === "inactive"
                            ? "Inactivo"
                            : "Suspendido"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/clientes/${client.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
