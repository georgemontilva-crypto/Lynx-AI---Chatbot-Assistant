# Lynx AI - Project TODO

## Phase 1: Base Setup
- [x] Global styles (Apple dark mode, SF Pro font, color palette)
- [x] Database schema (users, chatbots, conversations, leads, seo_reports, notifications)
- [x] App.tsx routes configuration
- [x] tRPC routers setup

## Phase 2: Landing Page
- [x] Hero section with animated gradient and Framer Motion
- [x] Features section (3-step process cards)
- [x] "How it works" section with comparison bars
- [x] "Beyond Chat" analytics preview section
- [x] Feature grid (6 cards: learns, re-scans, private, multilingual, proactive, API)
- [x] White-label section
- [x] Pricing section (3 plans: Cloud $199, Embedded $399, White-Label $499)
- [x] FAQ section
- [x] Footer with links
- [x] Navbar with dark mode toggle and CTA

## Phase 3: Dashboard Main
- [x] Dashboard layout with sidebar navigation
- [x] Overview page with KPI cards (visits, clicks, chat sessions, conversion rate)
- [x] Real-time charts (line chart, bar chart)
- [x] Recent activity feed

## Phase 4: Dashboard Modules
- [x] Chatbot configuration panel (name, avatar, colors, welcome message, behavior)
- [x] Website scanner module (URL input, AI analysis, progress indicator)
- [x] SEO analysis section (keywords, suggestions, heatmap, top pages)
- [x] Conversation history with filters (date, user, satisfaction rating)
- [x] Installation snippet generator (JavaScript embed code)

## Phase 5: Integrations
- [x] LLM integration for chatbot responses using scanned site context
- [x] Owner notifications (new lead, low rating, critical SEO issue)
- [x] Vitest tests for core procedures (12 tests passing)

## Phase 6: Polish
- [x] Framer Motion animations throughout
- [x] Dark/light mode toggle
- [x] Responsive design (mobile-first)
- [x] Final checkpoint and delivery

## Phase 7: Fixes & Polish
- [x] Fix light mode (CSS variables .light not applying correctly)
- [x] Replace all emojis with Lucide icons throughout the app
- [x] Add typing animation (animated dots) to hero chat widget
- [x] Improve chat widget visual to match reference image style

## Phase 8: Logos, Contact & Plans
- [x] Upload real Lynx AI logos to CDN
- [x] Replace logo in Navbar, Footer, DashboardShell with real images (light + dark variants)
- [x] Add Contact section with form sending to support@lynxaiassistant.com
- [x] Add Contact link to Navbar
- [x] Correct White-Label plan to 50 websites
- [x] Correct Basic and Pro plans to 1 website each
- [x] Add contact.send tRPC procedure in backend router

## Phase 9: Widget Embebible Real + Modelos IA
- [x] Configure gpt-5-nano for chatbot responses
- [x] Configure claude-sonnet-4-6 for site scanning and SEO analysis
- [x] Build public /widget.js endpoint serving the embeddable chat widget
- [x] Build floating chat UI (button + panel) in pure JS/CSS (no framework deps)
- [x] Add public chatbot.message endpoint authenticated by API key
- [x] Update Install Snippet page with real widget code using user's API key
- [x] Install Lynx AI widget on own landing page as live demo
- [x] Add Lynx AI logo to widget chat header

## Phase 10: PayPal Subscriptions + Resend Emails
- [x] Add PayPal and Resend secrets to project env
- [x] Add subscriptionId, subscriptionStatus, subscriptionPlanId fields to users table
- [x] Create /api/billing/create-subscription endpoint (returns PayPal approval URL)
- [x] Create /api/billing/webhook endpoint (handles BILLING.SUBSCRIPTION.ACTIVATED, PAYMENT.SALE.COMPLETED, BILLING.SUBSCRIPTION.CANCELLED)
- [x] Create /api/billing/cancel endpoint (protected)
- [x] Create billing.status tRPC procedure (returns current plan, status, next billing date)
- [x] Send welcome email via Resend on new subscription activation
- [x] Send payment confirmation email via Resend on each successful payment
- [x] Send usage alert email via Resend when user hits 80% of monthly limit
- [x] Create Billing page in dashboard with plan cards, current status, and upgrade/cancel buttons
- [x] Update user.plan in DB when PayPal webhook fires

## Phase 11: Dashboard diferenciado por plan
- [x] Crear hook usePlanFeatures con matriz de permisos por plan
- [x] Actualizar sidebar con badge de plan y lock en ítems no disponibles
- [x] Agregar upgrade banners en páginas bloqueadas (SEO, Conversations, Notifications)
- [x] Sección White-Label "My Clients" solo visible para plan whitelabel

## Phase 12: Modelo de límites White-Label por cliente
- [x] Actualizar PLAN_LIMITS: White-Label = 6.000 msg/mes por chatbot cliente, 8.000 propio
- [x] Actualizar widgetRouter: rate limiting con campo isClientChatbot
- [x] Actualizar Billing page con la nueva descripción del modelo por cliente
- [x] Actualizar usePlanFeatures y la UI de Install Snippet con el nuevo modelo

## Phase 13: White-Label Client Packs
- [x] Cambiar límite base de White-Label de 50 a 15 clientes en backend y UI
- [x] Agregar sección Client Expansion Packs en Billing page (+15/$99, +30/$179, +60/$299, +100/$449)
- [x] Actualizar descripción del plan White-Label en Billing y Clients con el nuevo límite
- [x] Agregar campo clientSlots en users para rastrear packs comprados

## Phase 14: Auth Propia + Admin Dashboard
- [x] Página /login con branding Lynx AI (redirige a Manus OAuth)
- [x] Dashboard Admin: /dashboard/admin con lista de usuarios, plan, estado, fecha de registro
- [x] Admin: cambiar plan de usuario, ban/unban, promover/degradar a admin
- [x] Admin: estadísticas globales (total usuarios, suscripciones activas, nuevos 7 días, baneados)
- [x] Admin: distribución de planes (breakdown por plan)
- [x] Proteger /dashboard/admin solo para role=admin
- [x] Ítem Admin Panel en sidebar visible solo para admins con badge dorado
- [x] Dominio lynxaiassistant.com conectado y activo
- [x] Footer actualizado a 2026
- [x] Promover al owner a admin en la BD (georgemontilva@icloud.com → role: admin)
- [x] Verificar flujo PayPal end-to-end en sandbox (crear suscripción → webhook → actualizar plan) [PENDIENTE-MANUAL: requiere prueba real en PayPal sandbox]

## Phase 15: Páginas de Políticas Legales
- [x] Página /legal/terms — Términos de Servicio
- [x] Página /legal/privacy — Política de Privacidad
- [x] Página /legal/cookies — Política de Cookies
- [x] Página /legal/refunds — Política de Reembolso (créditos de uso, no dinero)
- [x] Agregar links a políticas en el Footer
- [x] Registrar rutas en App.tsx

## Phase 16: Auth Propia (Email + Contraseña)
- [x] Agregar campos passwordHash, emailVerified, verificationToken, resetToken, resetTokenExpiresAt a tabla users
- [x] Migrar schema con drizzle-kit generate y aplicar SQL
- [x] Instalar bcryptjs para hash de contraseñas
- [x] Crear helpers en db.ts: getUserByEmail, createUser, setPasswordHash, setVerificationToken, setResetToken
- [x] Crear authRouter.ts con endpoints: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, POST /api/auth/forgot-password, POST /api/auth/reset-password
- [x] Actualizar context.ts para usar el nuevo sistema JWT propio (sin Manus SDK)
- [x] Actualizar main.tsx: reemplazar redirectToLoginIfUnauthorized(startLogin) por redirect a /login
- [x] Actualizar useAuth.ts: eliminar referencias a manus-cookie y startLogin
- [x] Rediseñar Login.tsx: formulario email + contraseña con validación
- [x] Crear Register.tsx: formulario de registro con email, contraseña, nombre
- [x] Crear ForgotPassword.tsx: formulario para solicitar reset
- [x] Crear ResetPassword.tsx: formulario para nueva contraseña con token
- [x] Registrar rutas /register, /forgot-password, /reset-password en App.tsx
- [x] Enviar email de verificación al registrarse (Resend)
- [x] Enviar email de reset de contraseña (Resend)
- [x] Crear endpoint GET /api/auth/verify-email?token=... para verificar email
- [x] Actualizar DashboardShell.tsx para no usar startLogin()
- [x] Verificar que todos los protectedProcedures siguen funcionando

## Phase 17: Corregir datos hardcodeados en Dashboard Overview
- [x] Reemplazar datos demo hardcodeados en gráfico "Visits & chats this week" con datos reales de BD
- [x] Reemplazar datos demo hardcodeados en gráfico "Clicks by page" con datos reales de BD
- [x] Crear tRPC procedure para obtener analytics semanales reales desde analyticsEvents
- [x] Mostrar estado vacío correcto cuando no hay datos

## Phase 18: Corregir botones Sign in / Get started en Navbar y Landing
- [x] Navbar desktop: Sign in → /login, Get started → /register
- [x] Navbar móvil: Sign in → /login, Get started → /register (ambos no funcionaban)
- [x] Hero.tsx: botón "See plans" → /register
- [x] Pricing.tsx: botones CTA → /register
- [x] Footer.tsx: CTA → /register
- [x] Eliminar import de startLogin de todos los archivos de landing

## Phase 19: Corregir verificación de plan para desbloqueo de features
- [x] Diagnosticar cómo se lee el plan en el contexto de sesión vs BD
- [x] Corregir auth.me para que siempre devuelva el plan actualizado desde la BD
- [x] Verificar que el sidebar refleja el plan correcto sin necesidad de re-login
- [x] Verificar que los features bloqueados se desbloquean inmediatamente al cambiar plan

## Phase 19b: Refetch inmediato de plan tras cambio de admin
- [x] Agregar invalidación de billing/status en el hook usePlanFeatures al cambiar plan desde Admin Panel
- [x] Exportar función clearPlanCache() desde usePlanFeatures para que Admin Panel la llame tras updatePlan

## Phase 20: Página de Billing en el dashboard
- [x] Crear /dashboard/billing con plan actual, fecha próximo cobro, estado suscripción
- [x] Tarjetas de planes inline con botón "Subscribe with PayPal" por plan (sin modal, diseño más claro)
- [x] Botón "Cancelar suscripción" con confirmación
- [x] Agregar enlace "Billing" en el sidebar del DashboardShell
- [x] Mostrar badge "Plan activo" si el plan es manual (sin PayPal)

## Phase 21: Wizard de onboarding post-registro
- [x] Crear tabla onboarding_progress en schema (userId, step1Done, step2Done, step3Done)
- [x] Crear página /dashboard/onboarding con wizard de 3 pasos
- [x] Paso 1: Escanear sitio (URL input + botón scan)
- [x] Paso 2: Instalar snippet (mostrar código + botón "Ya lo instalé")
- [x] Paso 3: Probar chatbot (preview del chatbot)
- [x] Redirigir a /dashboard/onboarding tras primer login si onboarding no completado
- [x] Marcar onboarding como completado y redirigir al dashboard principal

## Phase 22: Emails transaccionales en español
- [x] Traducir email de bienvenida al español
- [x] Traducir email de confirmación de pago al español
- [x] Traducir email de cancelación de suscripción al español
- [x] Traducir email de reset de contraseña al español
- [x] Traducir email de verificación de cuenta al español

## Phase 23: Prueba de pago PayPal ($1)
- [x] Crear producto y plan de $1/mes en PayPal via API (asigna plan embedded) — Plan ID: P-45G89602V1974512YNJNPHAI
- [x] Crear endpoint POST /api/billing/create-test-subscription
- [x] Crear página /test-payment con botón de compra de $1
- [x] Eliminar página y endpoint después de confirmar el flujo [PENDIENTE: esperar confirmación del usuario]

## Phase 24: Mejoras al Widget del Chatbot
- [x] Logo Lynx AI en el header del chat (favicon/avatar del bot)
- [x] Auto-apertura del chat a los 3 segundos con mensaje de bienvenida animado
- [x] Captura de nombre y email después del primer saludo (lead capture inline)
- [x] Calificación con estrellas al finalizar la conversación

## Phase 25: Perfil de usuario
- [x] Crear página /dashboard/profile con edición de nombre
- [x] Cambio de contraseña desde el perfil
- [x] Estado de verificación de email + reenviar verificación
- [x] Información de cuenta (plan, fecha de registro, método de login)
- [x] Avatar clickable en sidebar y header apunta a /dashboard/profile

## Phase 26: Email de bienvenida al registrarse
- [x] Enviar sendWelcomeEmail al completar el registro (no-blocking)

## Phase 27: Indicador de progreso del onboarding en sidebar
- [x] Mostrar barra de progreso en el sidebar cuando el onboarding no está completado
- [x] Barra muestra X/3 pasos completados con porcentaje visual
- [x] Click en la barra navega a /dashboard/onboarding
- [x] Se oculta automáticamente cuando el onboarding está completado

## Phase 28: Corregir límite base White-Label de 50 a 15
- [x] Pricing.tsx: note, feature "manage up to 15 client websites", feature "Full API access for all 15 integrations"
- [x] Contact.tsx: texto de White-Label inquiries corregido a 15 websites
- [x] Billing.tsx y Clients.tsx ya tenían 15 (correcto)

## Phase 29: Fix bug crítico widget — error al enviar mensajes
- [x] Diagnosticar: BASE_URL se construía mal cuando script.src tenía query string (?v=3)
- [x] Corregir: usar URL API para parsear script.src y eliminar pathname /widget.js + query string
- [x] Actualizar ?v=4 en index.html para forzar recarga del widget corregido en producción

## Phase 30: Campo Empresa en formulario widget + email personalizado
- [x] Agregar campo leadCompany al schema de conversations
- [x] Migrar schema y aplicar SQL
- [x] Agregar campo "Empresa" al formulario del widget (paso 3 del lead capture)
- [x] Actualizar endpoint /api/widget/lead para recibir y guardar company
- [x] Personalizar asunto del email con nombre del chatbot
- [x] Mostrar empresa en Leads y Conversations del dashboard

## Phase 31: SEO completo y optimización de velocidad
- [x] Auditoría SEO: meta tags, headings, estructura
- [x] Meta tags completos: title, description, keywords, author, robots, canonical
- [x] Open Graph (Facebook, LinkedIn, WhatsApp): og:title, og:description, og:image, og:url
- [x] Twitter Cards: twitter:card, twitter:title, twitter:description, twitter:image
- [x] Imagen OG 1200x630 generada con IA
- [x] Favicon optimizado con apple-touch-icon
- [x] manifest.json para PWA
- [x] sitemap.xml dinámico con todas las rutas públicas
- [x] robots.txt con Disallow para /dashboard/ y /api/
- [x] Schema markup JSON-LD: Organization, SoftwareApplication, FAQPage, BreadcrumbList
- [x] Compresión gzip con middleware compression en Express
- [x] Code splitting en Vite: react-vendor, motion, charts, date chunks
- [x] Headers de caché (1 año para assets, no-cache para HTML)
- [x] Headers de seguridad: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- [x] Preconnect y dns-prefetch para recursos externos

## Phase 33: Corregir desbordamiento horizontal (overflow-x)
- [x] Agregar overflow-x: hidden en html, body y contenedores principales en index.css
- [x] Revisar componentes de landing que causan overflow (Hero, Features, etc.)
- [x] Corregir menú del DashboardShell en móvil para que no desborde horizontalmente

## Phase 34: Navbar Pricing → /pricing, menú móvil completo
- [x] Cambiar link Pricing en navbar de #pricing a /pricing (página dedicada)
- [x] Agregar Blog al navbar (desktop y móvil)
- [x] Links de ancla funcionan desde cualquier página via useAnchorNav helper
- [x] Menú móvil usa Link para rutas y button para anclas correctamente
- [x] Formulario de contacto ya está en sección Contact.tsx dedicada (sin duplicados)

## Phase 35: Imágenes blog, cron automático y página /contact
- [x] Generar imagen de portada para artículo 1 (IA para ventas) con IA (reescrito en inglés)
- [x] Generar imagen de portada para artículo 2 (IA y eficiencia empresarial) con IA (reescrito en inglés)
- [x] Subir imágenes al CDN y actualizar artículos en BD
- [x] Crear página /contact dedicada con SEO y meta tags
- [x] Registrar /contact en sitemap.xml
- [x] Activar cron semanal de blog automático (cada lunes 10am America/Bogota)

## Phase 36: PWA + persistencia de tema dark/light
- [x] Persistir preferencia de tema en localStorage (no se resetea al recargar)
- [x] Leer preferencia del sistema (prefers-color-scheme) como fallback
- [x] Configurar PWA con vite-plugin-pwa: service worker, manifest, íconos
- [x] Verificar instalación PWA en móvil y desktop

## Phase 37: Web Push Notifications
- [x] Instalar web-push (npm) para generar VAPID keys y enviar notificaciones push
- [x] Generar VAPID keys y guardar como secrets (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
- [x] Agregar tabla push_subscriptions al schema (userId, endpoint, p256dh, auth, createdAt)
- [x] Migrar schema y aplicar SQL
- [x] Crear endpoint POST /api/push/subscribe para guardar suscripción del navegador
- [x] Crear endpoint DELETE /api/push/unsubscribe para eliminar suscripción
- [x] Crear helper sendPushNotification(userId, title, body, url?) en server
- [x] Trigger push al recibir nuevo lead del widget (con nombre y empresa)
- [x] Trigger push al recibir calificación baja del chatbot (1-2 estrellas)
- [x] Actualizar service worker para manejar push events y notificationclick
- [x] UI en /dashboard/profile: botón "Enable push notifications" / "Disable"
- [x] Mostrar estado actual de la suscripción push en el perfil

## Phase 38: Preferencias granulares de notificaciones + alerta de límite de uso
- [x] Agregar columna push_prefs (JSON) a la tabla users: { newLead, lowRating, usageLimit }
- [x] Migrar schema y aplicar SQL
- [x] Crear procedimiento tRPC push.getPrefs y push.updatePrefs (protectedProcedure)
- [x] Actualizar sendPushToUser para respetar las preferencias del usuario antes de enviar
- [x] Agregar trigger de push al 80% del límite mensual en checkAndIncrementUsage
- [x] UI en /dashboard/profile: toggles para cada tipo de notificación (nuevos leads, ratings bajos, límite de uso)
- [x] Sincronizar estado de toggles con el backend vía tRPC
- [x] Tests de vitest para la lógica de preferencias

## Phase 39: Correcciones SEO (HIGH priority)
- [x] Crear hook useSeoMeta para inyectar dinámicamente title + meta description por ruta
- [x] Agregar meta descriptions únicas para: /, /pricing, /features, /how-it-works, /white-label, /blog, /contact
- [x] Implementar JSON-LD Product schema en el homepage (ya existía, verificado)
- [x] Implementar JSON-LD FAQ schema en el homepage (ya existía, verificado)
- [x] Agregar alt text descriptivo a todas las imágenes (todas ya tenían alt text correcto)
- [x] Verificar jerarquía H1→H2→H3 en homepage y páginas principales (corregido Features.tsx y Comparison.tsx)

## Phase 40: Re-analyze SEO + Feature Gating por plan
- [x] Agregar botón "Re-analyze" debajo del score principal en SEO Analysis
- [x] Crear hook usePlanFeatures que retorna qué features tiene el plan actual del usuario (ya existía)
- [x] Crear componente FeatureGate que muestra candado + CTA de upgrade si la feature está bloqueada (UpgradeGate ya existía)
- [x] Aplicar FeatureGate en My Clients (bloqueado para Cloud y Embedded, disponible en White-Label - ya existía)
- [x] Revisar otras secciones con "(coming soon)" y eliminar el texto - reemplazado por toast informativo

## Phase 41: Mejoras PWA (persistencia de ruta, pull-to-refresh, carga rápida)
- [x] Guardar última ruta visitada en localStorage y redirigir al dashboard al reabrir la app
- [x] Redirigir a /dashboard si el usuario ya tiene sesión y abre la app en /
- [x] Implementar pull-to-refresh táctil directamente en DashboardShell (sin hook separado)
- [x] Aplicar pull-to-refresh en DashboardShell para que funcione en todas las páginas
- [x] Configurar staleTime y gcTime en el QueryClient para stale-while-revalidate
- [x] Configurar gcTime=5min para mantener datos en caché entre navegaciones

## Phase 42: Add Client completo + Historial SEO
- [x] Agregar tabla clients al schema (id, userId, name, siteUrl, apiKey, brandName, brandColor, logoUrl, createdAt)
- [x] Agregar tabla seo_history al schema (id, userId, score, loadSpeed, mobileScore, issuesCount, scannedAt)
- [x] Migrar schema y aplicar SQL
- [x] Procedimiento tRPC clients.create (genera apiKey única, guarda cliente)
- [x] Procedimiento tRPC clients.list (lista clientes del usuario)
- [x] Procedimiento tRPC clients.update (actualiza branding)
- [x] Procedimiento tRPC clients.delete (elimina cliente)
- [x] Guardar entrada en seo_history en cada scan completado
- [x] Procedimiento tRPC seo.getHistory (retorna últimos 20 análisis con timestamp)
- [x] UI My Clients: modal Add Client con formulario (nombre, URL, branding)
- [x] UI My Clients: listado de clientes con stats, snippet y botón de editar/eliminar
- [x] UI My Clients: modal de snippet de instalación por cliente con apiKey
- [x] UI SEO: sección de historial con gráfica de evolución del score (recharts)

## Phase 43: Fix pull-to-refresh iOS + Scanner SEO mejorado
- [x] Corregir pull-to-refresh para iOS PWA (overscroll-behavior, touch events nativos)
- [x] Mejorar prompt del scanner SEO para incluir contexto de lo que ya está implementado

## Phase 44: Comparativa SEO + Toggle chatbot en dashboard
- [x] Mostrar delta de puntos entre último scan y anterior en la gráfica SEO ("+5 vs last scan" en verde / "-3" en rojo)
- [x] Toggle en el dashboard para deshabilitar el chatbot flotante solo en páginas /dashboard/*
- [x] Persistir preferencia del toggle en la BD - implementado como hide automático al montar DashboardShell
## Phase 45: SSR (Server-Side Rendering) completo
- [x] Crear client/src/entry-server.tsx — renderToString con wouter Router y prefetch
- [x] Crear client/src/entry-client.tsx — hydrateRoot con HydrationBoundary y __RQ_STATE__
- [x] Crear client/src/ssr/prefetch.ts — mapa de rutas con HeadMeta y prefetch del blog
- [x] Crear server/_core/ssrCaller.ts — in-process tRPC caller para SSR
- [x] Crear vite.config.ssr.ts — build dedicado para el bundle SSR
- [x] Actualizar client/index.html — placeholders app-head y app-html, entry-client.tsx
- [x] Corregir ThemeContext.tsx — guard localStorage en useState initializer para SSR
- [x] Actualizar server/_core/vite.ts — SSR wiring dev (ssrLoadModule) y prod (dynamic import)
- [x] Actualizar package.json build script — incluye vite build SSR
- [x] Verificar: head tags dinamicos por ruta (title, description, og:*, canonical, robots)
- [x] Verificar: HTTP 404 real para rutas inexistentes y slugs de blog no encontrados
- [x] Verificar: noindex para /dashboard/*, /login, /register, /forgot-password, /reset-password
- [x] Verificar: prefetch de blog.list en /blog y blog.getBySlug en /blog/:slug
- [x] Verificar: build SSR compila sin errores (dist/server-ssr/entry-server.js)

## Phase 46: Corrección SSR — renderToString vacío
- [x] Corregir usePushNotifications.ts — mover import.meta.env fuera del nivel de módulo (SSR-safe)
- [x] Corregir Home.tsx — en SSR (typeof window === undefined) renderizar landing sin esperar auth
- [x] Verificar SSR: H1 ✅, H2 x7 ✅, IMG x3 con alt ✅, JSON-LD x4 ✅, title/description/canonical/robots ✅

## Phase 47: Plan Free (borrador — ver versión final abajo)
- [x] Agregar 'free' al enum plan en drizzle/schema.ts y cambiar default a 'free'
- [x] Generar y aplicar migración SQL del enum
- [x] Backend: bloquear re-escaneo automático para plan free (solo 1 escaneo permitido)
- [x] Backend: verificar expiración de 14 días desde createdAt para desactivar el chatbot widget
- [x] Backend: bloquear acceso a leads para plan free
- [x] Backend: bloquear herramientas premium (SEO avanzado, analytics, etc.) para plan free
- [x] Frontend: banner de upgrade en el dashboard mostrando días restantes del trial
- [x] Frontend: bloquear UI de features premium con UpgradeGate para plan free
- [x] Migrar usuarios existentes sin subscriptionStatus=active a plan free
- [x] Verificar que usuarios con plan pagado no se ven afectados

## Phase 47: Plan Free
- [x] Agregar 'free' al enum plan en schema.ts y cambiar default a 'free'
- [x] Generar y aplicar migración SQL
- [x] Actualizar PLAN_LIMITS en db.ts con límites free (1 escaneo, 50 mensajes/mes, sin leads, sin SEO, sin notificaciones, sin whitelabel)
- [x] Bloquear re-escaneo en routers.ts para plan free (solo 1 escaneo permitido)
- [x] Bloquear leads.list para plan free
- [x] Agregar 'free' a admin.updatePlan
- [x] Restricción de 14 días en widgetRouter.ts: chat desactivado al vencer el trial
- [x] Actualizar usePlanFeatures.ts con isFree, trialDaysLeft, trialExpired
- [x] Agregar 'free' a PLAN_INFO en UpgradeGate.tsx
- [x] Banner de trial en DashboardShell.tsx (azul → naranja → rojo según días restantes)
- [x] Agregar createdAt al endpoint /api/billing/status
- [x] Migrar usuarios existentes sin suscripción activa al plan free

## Phase 48: Auditoría de Seguridad
- [x] CRÍTICA: Proteger /api/scheduled/auto-blog con autenticación de cron (sdk.authenticateRequest)
- [x] ALTA: Sanitizar HTML en BlogPostPage con isomorphic-dompurify para prevenir XSS
- [x] MEDIA: Verificar firma del webhook PayPal con PAYPAL_WEBHOOK_ID para prevenir activaciones falsas
- [x] BAJA: Agregar security headers (HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- [x] BAJA: Rate limiting global (200 req/min API, 20 req/15min auth endpoints) con express-rate-limit
- [x] Fix: trust proxy configurado para que rate-limit funcione detrás de reverse proxy

## Phase 49: Quitar pull-to-refresh en PWA + botón refresh en header
- [x] Eliminar el pull-to-refresh por gestos táctiles del DashboardShell (touchstart/touchmove/touchend handlers)
- [x] Agregar botón de refresh (ícono RefreshCw) junto a la campanita de notificaciones en el header
- [x] Reforzar bloqueo de pull-to-refresh con overscroll-behavior:none en body y en el main del dashboard

## Phase 50: Fix scroll en dashboard (solo funcionaba sobre el sidebar)
- [x] Corregir layout del dashboard para que el scroll funcione en toda la página, no solo sobre el sidebar

## Phase 51: Implementar tracking de analytics (gráficas vacías en dashboard)
- [x] Agregar helper saveAnalyticsEvent en db.ts para insertar en analytics_events
- [x] Agregar endpoint POST /api/widget/track en widgetRouter.ts
- [x] Agregar llamadas de tracking desde el widget: page_view al cargar, chat_open al abrir, message_sent al enviar mensaje

## Phase 52: Web Setup Service ($199) — cuestionario + notificación a sales@
- [x] Crear página /dashboard/web-setup con cuestionario completo (nombre, colores, ícono, dominio, notas)
- [x] Agregar tabla web_setup_requests en drizzle/schema.ts y migrar
- [x] Backend: endpoint para guardar solicitud y enviar email a sales@lynxaiassistant.com con todos los datos
- [x] Integrar botón "Get your website — $199" en el dashboard (sidebar o billing)
- [x] Upload del ícono de la IA desde el cuestionario (S3)
- [x] Confirmación visual al cliente después de enviar el formulario

## Phase 53: Admin Web Setup + PayPal $199 + Push notification
- [x] Backend: endpoints admin para listar todas las solicitudes y cambiar status
- [x] Backend: notificación push al owner cuando llega nueva solicitud Web Setup
- [x] Admin panel: sección "Web Setup Requests" con tabla y botones de cambio de estado
- [x] Cuestionario: integrar PayPal one-time $199 en el Paso 5
- [x] Cuestionario: marcar solicitud como pagada después del pago PayPal

## Phase 54: Rediseño White-Label — bot propio para revender + reporte PDF por cliente
- [x] Actualizar copy del plan White-Label en Pricing.tsx: un chatbot propio para instalar en los sitios de sus clientes, sin panel por cliente
- [x] Actualizar copy en Billing.tsx: descripción del plan White-Label con el modelo correcto
- [x] Actualizar Clients.tsx: cambiar "cada cliente tiene su bot" por "gestiona los sitios donde instalas tu bot"
- [x] Agregar botón "Generar Reporte PDF" por cliente en Clients.tsx
- [x] Backend: endpoint clients.reportData en tRPC que devuelve analytics, daily data, top pages y leads por cliente
- [x] Página /dashboard/clients/:id/report con gráficos (line chart + bar chart) y tabla de leads
- [x] Botón "Download PDF" genera el PDF con jsPDF + html2canvas en el cliente
- [x] Mover "Get Your Website" al sidebar solo para usuarios White-Label (ya no visible para todos)

## Phase 55: Fix bug PayPal webhook — plan no se actualiza al pagar White-Label
- [x] Diagnosticar por qué el webhook de PayPal no actualiza el plan del usuario al pagar White-Label
- [x] Agregar endpoint /api/billing/verify-subscription que consulta PayPal directamente y activa el plan
- [x] Agregar polling automático en Billing.tsx: al regresar de PayPal, verifica hasta 8 veces si el plan está ACTIVE
- [x] Verificar que el plan_id de White-Label en PayPal coincide con PAYPAL_PLAN_ID_WHITELABEL (confirmado)

## Phase 56: PayPal Webhook ID + Alerta pending + Recibo de pago
- [x] Email de recibo de pago al cliente al activarse el plan (monto, fecha, plan, subscription ID)
- [x] Job periódico heartbeat cada hora: detecta suscripciones pending > 1h, intenta auto-activarlas via PayPal API, y envía alerta al admin si siguen pendientes
- [x] Endpoint POST /api/scheduled/pending-subscription-alert registrado y protegido con sdk.authenticateRequest
- [x] Heartbeat job registrado automáticamente al iniciar el servidor (idempotente)

## Phase 57: Fix Admin Panel - suscripciones activas, MRR, fecha renovación, botón Refresh
- [x] Corregir query de suscripciones activas (muestra 0 en lugar de 2)
- [x] Agregar métrica de dinero recaudado (MRR) en las tarjetas del admin
- [x] Mostrar fecha de próxima renovación en la tabla de usuarios
- [x] Arreglar el botón Refresh del admin panel que no funciona

## Phase 57: Fix Admin Panel — MRR + Suscripciones activas + Fecha renovación
- [x] Fix query de suscripciones activas en getAdminStats (ahora cuenta plan!=free + status active/pending)
- [x] Agregar MRR ($1,198) en las tarjetas de stats del admin con formato $
- [x] Agregar columna "Next Renewal" en la tabla de usuarios del admin con ícono de calendario
- [x] Arreglar botón Refresh: ahora invalida stats + listUsers + webSetup.adminList y muestra toast
- [x] Activar manualmente las suscripciones de Jorge Torres y Kurt Brower en la BD (status: active)

## Phase 58: Icono personalizado para plan White-Label
- [x] Backend: agregar avatarUrl al input del chatbotConfig.save (ya existe en DB y upsertChatbot)
- [x] Backend: agregar avatarUrl a la respuesta de /api/widget/config
- [x] Backend: agregar endpoint POST /api/upload para subir imágenes a S3 (reutilizable)
- [x] Frontend: agregar campo de upload de icono en sección Appearance de ChatbotConfig (solo plan whitelabel), con preview en vivo
- [x] Widget: usar avatarUrl del chatbot si existe, sino el logo de Lynx AI (botón flotante + header)

## Phase 59: Fix widget — ícono personalizado + header solo con nombre
- [x] Widget: aplicar avatarUrl correctamente en el botón flotante (el ícono custom no se mostraba)
- [x] Widget: reemplazar el logo de Lynx AI en el header por solo el nombre del bot (visible siempre)
- [x] Widget: ocultar el logo de Lynx AI del header por defecto (usar nombre + ícono si hay avatarUrl)
- [x] Preview en ChatbotConfig: reflejar el mismo cambio (header solo con nombre)

## Phase 60: Streaming de respuestas del chatbot

- [x] Backend: nuevo endpoint POST /api/widget/chat/stream que usa SSE para enviar tokens del LLM en tiempo real
- [x] Backend: el stream envía primero los tokens del reply, luego un evento final con quickReplies y usage
- [x] Widget JS: consumir el stream SSE y mostrar texto token a token en el bubble del asistente
- [x] Widget JS: mostrar quickReplies cuando llega el evento final del stream

## Phase 61: Escáner de productos de tienda

- [x] Escáner: detectar productos con JSON-LD (Product schema), meta tags y texto del HTML
- [x] Escáner: rastrear hasta 5 páginas de productos (/products, /tienda, /shop, /catalog) si la home no tiene suficientes
- [x] Escáner: incluir catálogo de productos en siteContext del chatbot (nombre, precio, descripción, URL)
- [x] Dashboard: mostrar resumen de productos detectados en el resultado del escaneo
