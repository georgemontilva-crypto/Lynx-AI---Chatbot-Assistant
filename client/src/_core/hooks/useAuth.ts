import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    // Retry transient failures so a momentary network/500 hiccup doesn't flip
    // the user to "not authenticated" and bounce them back to /login (the login
    // loop). Only a real 401 (null user) means logged out.
    retry: 2,
    retryDelay: 500,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // Call our own logout endpoint to clear the cookie
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      window.location.href = "/login";
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // Treat the very first load (including retries) as "loading" so we never
    // flash the unauthenticated screen — and never bounce to /login — while the
    // session check is still in flight. Only a settled null user = logged out.
    const stillCheckingSession =
      meQuery.isLoading ||
      (meQuery.isFetching && meQuery.data === undefined && !meQuery.isError);
    return {
      user: meQuery.data ?? null,
      loading: stillCheckingSession || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    meQuery.isFetching,
    meQuery.isError,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;

    const target = redirectPath ?? "/login";
    if (window.location.pathname === target) return;
    window.location.href = target;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
