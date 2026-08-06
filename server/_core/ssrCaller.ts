import type { Request, Response } from "express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import type { SsrPrefetch } from "../../client/src/ssr/prefetch";

// Builds the SSR prefetch object by creating an in-process tRPC caller.
// ctx.user is preserved from the request cookie, but public blog procedures
// return viewer-independent data so the HTML is safe to cache.
export async function buildSsrPrefetch(req: Request, res: Response): Promise<SsrPrefetch> {
  const ctx = await createContext({ req, res } as any);
  const caller = appRouter.createCaller(ctx);
  return {
    blogList: () => caller.blog.list({ limit: 20 }),
    blogBySlug: (slug: string) => caller.blog.getBySlug({ slug }),
  };
}
