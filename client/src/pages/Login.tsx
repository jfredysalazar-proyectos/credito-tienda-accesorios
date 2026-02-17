import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      toast.success("¡Sesión iniciada correctamente!");
      // Invalidar el cache de auth.me para que se actualice
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Error al iniciar sesión");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
          <CreditCard className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">CréditoTienda</h1>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@creditotienda.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="mt-2"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                size="lg"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Iniciar Sesión
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Credenciales de Demostración:
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> admin@creditotienda.local
              </p>
              <p className="text-sm text-gray-600">
                <strong>Contraseña:</strong> admin123
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Sistema de Gestión de Créditos © 2026
        </p>
      </div>
    </div>
  );
}
