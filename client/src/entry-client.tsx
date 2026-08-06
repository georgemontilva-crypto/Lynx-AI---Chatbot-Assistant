import { hydrateRoot, createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { Router } from "wouter";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import App from "./App";
import "./index.css";

// Keep the template's client behavior (default retry & focus-refetch).
// staleTime: without it, TanStack Query v5 treats hydrated data as stale
// (staleTime defaults to 0) and refetches every prefetched query immediately
// on mount. staleTime keeps just-hydrated data fresh for a window.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s — data is fresh for 30s
      gcTime: 5 * 60_000,         // 5min — keep unused data in cache
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      retry: 1,                   // Only retry once on failure
    },
  },
});

// Keep the template's auth-error → redirect-to-login cache subscriptions
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;
  if (
    !window.location.pathname.startsWith("/login") &&
    !window.location.pathname.startsWith("/register")
  ) {
    window.location.href = "/login";
  }
};

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe((event) => {
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

const rawState = (window as any).__RQ_STATE__;
const dehydratedState = (
  rawState ? superjson.deserialize(rawState) : undefined
) as DehydratedState | undefined;

const el = document.getElementById("root")!;
const app = (
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Router>
          <App />
        </Router>
      </HydrationBoundary>
    </QueryClientProvider>
  </trpc.Provider>
);

// If SSR rendered content, hydrate; otherwise create fresh root (fallback path)
if (el.firstChild) {
  hydrateRoot(el, app);
} else {
  createRoot(el).render(app);
}
