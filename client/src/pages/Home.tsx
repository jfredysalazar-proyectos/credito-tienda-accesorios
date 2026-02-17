import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Users, MessageSquare, BarChart3 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirigir a dashboard si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">CréditoTienda</h1>
          </div>
          <nav className="hidden md:flex gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900">
              Características
            </a>
            <a href="#benefits" className="text-gray-600 hover:text-gray-900">
              Beneficios
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Gestiona tus Créditos de Forma Inteligente
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Sistema completo para administrar créditos de clientes con notificaciones automáticas por WhatsApp.
            </p>
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Iniciar Sesión
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Crear Cuenta
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Gestión de Clientes</h3>
                  <p className="text-sm text-gray-600">Registro completo con cupo de crédito</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Control de Créditos</h3>
                  <p className="text-sm text-gray-600">Registro manual con concepto y valor</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">WhatsApp Automático</h3>
                  <p className="text-sm text-gray-600">Notificaciones al registrar créditos y pagos</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Dashboard Completo</h3>
                  <p className="text-sm text-gray-600">Estadísticas y resumen de operaciones</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Características Principales
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>Gestión de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Crea y administra clientes con información completa: nombre, cédula, WhatsApp y cupo de crédito. Búsqueda rápida por nombre o cédula.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CreditCard className="w-8 h-8 text-green-600 mb-2" />
                <CardTitle>Control de Créditos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Registra créditos manuales con concepto, valor y días de plazo. Cálculo automático de saldos y cupo disponible.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
                <CardTitle>WhatsApp Integrado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Envíos automáticos al registrar créditos y pagos. Envío manual de estado de cuenta en cualquier momento.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="w-8 h-8 text-orange-600 mb-2" />
                <CardTitle>Dashboard Inteligente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Visualiza estadísticas principales: total de clientes, créditos activos, montos y saldos pendientes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CreditCard className="w-8 h-8 text-red-600 mb-2" />
                <CardTitle>Registro de Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Registra abonos y pagos parciales. Múltiples métodos de pago y actualización automática de saldos.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-indigo-600 mb-2" />
                <CardTitle>Seguridad</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Autenticación OAuth integrada. Cada usuario solo ve sus propios clientes y créditos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Comienza a Gestionar tus Créditos Hoy
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Acceso inmediato sin configuración complicada
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            Iniciar Sesión Ahora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2026 CréditoTienda. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
