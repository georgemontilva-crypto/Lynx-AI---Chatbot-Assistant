import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM and notification modules
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            keywords: ["producto", "envio", "tienda"],
            seoSuggestions: ["Agregar meta descriptions", "Mejorar velocidad"],
            summary: "Tienda de ropa online",
            topics: ["Catalogo", "Envios", "Devoluciones"],
          }),
        },
      },
    ],
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth router", () => {
  it("me returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@example.com");
  });

  it("logout clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

describe("chatbot router", () => {
  it("chat returns a reply from the LLM", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "Hola! ¿En qué puedo ayudarte?" } }],
    } as any);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chatbot.chat({
      message: "Hola",
      chatbotName: "Lynx AI",
    });

    expect(result.reply).toBe("Hola! ¿En qué puedo ayudarte?");
  });

  it("chat uses site context when provided", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValueOnce({
      choices: [{ message: { content: "Tenemos zapatos en talla 42." } }],
    } as any);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chatbot.chat({
      message: "¿Tienen talla 42?",
      siteContext: "Tienda de zapatos deportivos. Tallas disponibles: 38-46.",
    });

    expect(result.reply).toBe("Tenemos zapatos en talla 42.");
    // Verify the LLM was called with the site context in the system prompt
    expect(mockInvoke).toHaveBeenCalledOnce();
    const callArgs = mockInvoke.mock.calls[0]?.[0];
    const systemMessage = callArgs?.messages?.find((m: any) => m.role === "system");
    // The system prompt should include the siteContext
    expect(systemMessage?.content).toContain("Contexto del sitio web");
    expect(systemMessage?.content).toContain("Tienda de zapatos deportivos");
  });

  it("chat handles LLM returning empty content gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    } as any);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chatbot.chat({ message: "Test" });
    expect(result.reply).toBe("Lo siento, no pude procesar tu consulta.");
  });

  it("analyzeSite returns structured SEO data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chatbot.analyzeSite({
      url: "https://example.com",
    });

    expect(result).toHaveProperty("keywords");
    expect(result).toHaveProperty("seoSuggestions");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("topics");
    expect(Array.isArray(result.keywords)).toBe(true);
  });
});

describe("notifications router", () => {
  it("notifyNewLead sends notification and returns sent status", async () => {
    const { notifyOwner } = await import("./_core/notification");
    vi.mocked(notifyOwner).mockResolvedValueOnce(true);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.notifyNewLead({
      email: "lead@example.com",
      page: "/productos",
      message: "Interesado en el plan Pro",
    });

    expect(result.sent).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Nuevo lead capturado por Lynx AI",
        content: expect.stringContaining("lead@example.com"),
      })
    );
  });

  it("notifyLowRating sends notification with rating info", async () => {
    const { notifyOwner } = await import("./_core/notification");
    vi.mocked(notifyOwner).mockResolvedValueOnce(true);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.notifyLowRating({
      rating: 2,
      page: "/contacto",
      visitorId: "visitor-123",
    });

    expect(result.sent).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Calificación baja recibida: 2/5",
      })
    );
  });

  it("notifySEOIssue sends critical SEO notification", async () => {
    const { notifyOwner } = await import("./_core/notification");
    vi.mocked(notifyOwner).mockResolvedValueOnce(true);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.notifySEOIssue({
      issue: "3 páginas sin meta description",
      page: "/productos",
      severity: "high",
    });

    expect(result.sent).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Problema SEO crítico",
      })
    );
  });

  it("notifySEOIssue handles medium severity correctly", async () => {
    const { notifyOwner } = await import("./_core/notification");
    vi.mocked(notifyOwner).mockResolvedValueOnce(true);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.notifySEOIssue({
      issue: "Velocidad de carga lenta",
      severity: "medium",
    });

    expect(result.sent).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Problema SEO detectado",
      })
    );
  });
});
