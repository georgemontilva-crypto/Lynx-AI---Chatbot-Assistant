import mysql2 from 'mysql2/promise';

const DEMO_API_KEY = 'lx_demo_lynxai_landing_page_2024';
const DEMO_SITE_CONTEXT = `Lynx AI is an intelligent chatbot platform that helps businesses automate customer support and engage website visitors 24/7.

PRICING PLANS:
- Basic: $29/month — 1 website, AI chat, conversation history, basic analytics
- Pro: $79/month — 1 website, everything in Basic + SEO analysis, lead capture, priority support
- White-Label: $299/month — 50 websites, resell to your own clients, custom branding, dedicated support

KEY FEATURES:
- AI-powered chatbot that scans your website and learns your content
- SEO analysis and recommendations
- Conversation history and analytics
- Lead capture (collect visitor emails)
- Easy installation: one script tag in your HTML
- Customizable colors, name, and welcome message
- Works on any website: HTML, WordPress, React, Next.js, Shopify, etc.

HOW IT WORKS:
1. Sign up and configure your chatbot
2. Scan your website — the AI reads your content
3. Copy the install snippet and paste it in your site
4. Visitors can now chat with your AI assistant 24/7

WHITE-LABEL PLAN:
The White-Label plan lets agencies and developers resell Lynx AI to up to 50 of their own clients. Each client gets their own chatbot with a unique API key, customized with their brand colors and name.

CONTACT: support@lynxaiassistant.com`;

async function run() {
  const conn = await mysql2.createConnection(process.env.DATABASE_URL);

  // Check if demo chatbot already exists
  const [existing] = await conn.execute(
    "SELECT id, apiKey FROM chatbots WHERE apiKey = ?",
    [DEMO_API_KEY]
  );

  if (existing.length > 0) {
    console.log('Demo chatbot already exists:', existing[0]);
    await conn.end();
    return;
  }

  // Get first user (owner) to associate the demo chatbot with
  const [users] = await conn.execute('SELECT id FROM users LIMIT 1');
  const demoUserId = users.length > 0 ? users[0].id : null;

  if (!demoUserId) {
    console.log('No users found. The demo chatbot will be created when the owner first logs in.');
    await conn.end();
    return;
  }

  // Insert demo chatbot
  await conn.execute(
    `INSERT INTO chatbots (userId, apiKey, name, primaryColor, secondaryColor, welcomeMessage, placeholder, position, autoOpen, autoOpenDelay, language, isActive, siteContext)
     VALUES (?, ?, 'Lynx AI', '#3b82f6', '#1e40af', 'Hi! I am Lynx AI. Ask me anything about our chatbot platform, pricing, or how to get started!', 'Ask me anything...', 'bottom-right', 0, 5, 'en', 1, ?)`,
    [demoUserId, DEMO_API_KEY, DEMO_SITE_CONTEXT]
  );

  const [result] = await conn.execute(
    "SELECT id, apiKey, name FROM chatbots WHERE apiKey = ?",
    [DEMO_API_KEY]
  );
  console.log('Demo chatbot created successfully:', result[0]);
  await conn.end();
}

run().catch(console.error);
