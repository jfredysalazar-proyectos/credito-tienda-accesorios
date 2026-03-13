import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useMemo, useEffect, useState } from "react";

export function useAuth() {
  const utils = trpc.useUtils();
  const [isLoginPage, setIsLoginPage] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  
  // Actualizar el estado de la página de login
  useEffect(() => {
    const checkLoginPage = () => {
      setIsLoginPage(window.location.pathname === "/login");
    };
    
    checkLoginPage();
    window.addEventListener("popstate", checkLoginPage);
    return () => window.removeEventListener("popstate", checkLoginPage);
  }, []);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    // DESACTIVAR COMPLETAMENTE LA CONSULTA SI ESTAMOS EN LOGIN
    enabled: !isLoginPage,
  });
  
  // Refetch cuando sea necesario (después del login)
  useEffect(() => {
    if (shouldRefetch && !isLoginPage) {
      meQuery.refetch();
      setShouldRefetch(false);
    }
  }, [shouldRefetch, isLoginPage, meQuery]);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.me.invalidate();
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
  
  const triggerRefetch = useCallback(() => {
    setShouldRefetch(true);
  }, []);

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
    triggerRefetch,
  };
}
