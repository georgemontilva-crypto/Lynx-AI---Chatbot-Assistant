import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show cached data immediately while refetching in background (stale-while-revalidate)
      staleTime: 30_000,        // 30s — data is fresh for 30s, no refetch during this window
      gcTime: 5 * 60_000,       // 5min — keep unused data in cache for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch on tab switch (pull-to-refresh handles it)
      retry: 1,                 // Only retry once on failure
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  if (window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/register")) return;

  // ── Anti-loop guard ──
  // A single stray UNAUTHORIZED from ANY query used to hard-redirect to /login
  // even when the session was alive — the root mechanism of the login loop.
  // Now we ask the server directly whether the session is real before kicking
  // the user out. If the session is alive, we ignore the stray error.
  if ((window as unknown as { __lynxAuthCheck?: boolean }).__lynxAuthCheck) return; // debounce concurrent checks
  (window as unknown as { __lynxAuthCheck?: boolean }).__lynxAuthCheck = true;
  fetch("/api/trpc/auth.me", { credentials: "include" })
    .then((r) => r.json())
    .then((j) => {
      const user = j?.result?.data?.json ?? null;
      if (!user) {
        window.location.href = "/login";
      } else {
        console.warn("[auth] Ignored stray UNAUTHORIZED — session is alive server-side");
      }
    })
    .catch(() => { window.location.href = "/login"; })
    .finally(() => { (window as unknown as { __lynxAuthCheck?: boolean }).__lynxAuthCheck = false; });
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      // Long GET batch URLs can exceed server/proxy limits and fail the WHOLE
      // batch (auth.me included → looks like "not logged in"). Cap the URL
      // length so big batches switch to POST automatically.
      maxURLLength: 2000,
      headers() {
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
