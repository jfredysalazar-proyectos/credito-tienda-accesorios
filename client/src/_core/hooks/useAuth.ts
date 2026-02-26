import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();
  
  // Determinar si estamos en la página de login para evitar peticiones automáticas
  const isLoginPage = typeof window !== "undefined" && window.location.pathname === "/login";

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    // DESACTIVAR COMPLETAMENTE LA CONSULTA SI ESTAMOS EN LOGIN
    enabled: !isLoginPage,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const user = meQuery.data ?? null;
    return {
      user,
      loading: meQuery.isLoading && !isLoginPage,
      error: meQuery.error,
      isAuthenticated: Boolean(user),
    };
  }, [meQuery.data, meQuery.isLoading, meQuery.error, isLoginPage]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
