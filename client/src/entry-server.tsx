import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { Router } from "wouter";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import App from "./App";
import { prefetchForPath, type SsrPrefetch, type HeadMeta } from "./ssr/prefetch";

export type RenderResult = {
  html: string;
  dehydratedState: unknown;
  head: HeadMeta;
};

export async function render(url: string, prefetch: SsrPrefetch): Promise<RenderResult> {
  // Server-only QueryClient: no retry (fail fast), no focus refetch (meaningless in Node)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });

  // Split at the FIRST "?" ourselves to avoid wouter's bare-"?" and double-"?" traps
  const qi = url.indexOf("?");
  const ssrPath = qi === -1 ? url : url.slice(0, qi);
  const ssrSearch = qi === -1 ? "" : url.slice(qi + 1);

  const head = await prefetchForPath(url, queryClient, prefetch);

  // Dummy tRPC client: plain useQuery hooks don't fire during renderToString
  // (fetches start in useEffect, which never runs on the server). Everything
  // the page needs is already in the cache from prefetchForPath above.
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
  });

  const html = renderToString(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {/* Explicit ssrPath/ssrSearch from the split above */}
        <Router ssrPath={ssrPath} ssrSearch={ssrSearch}>
          <App />
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );

  return { html, dehydratedState: dehydrate(queryClient), head };
}
