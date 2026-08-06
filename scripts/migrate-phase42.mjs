import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

try {
  await conn.execute(`CREATE TABLE IF NOT EXISTS \`clients\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`name\` varchar(256) NOT NULL,
    \`siteUrl\` text NOT NULL,
    \`apiKey\` varchar(64) NOT NULL UNIQUE,
    \`brandName\` varchar(128) DEFAULT 'AI Assistant',
    \`brandColor\` varchar(16) DEFAULT '#3b82f6',
    \`logoUrl\` text,
    \`welcomeMessage\` varchar(512) DEFAULT 'Hi! How can I help you?',
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT NOW(),
    \`updatedAt\` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
  )`);
  console.log("✓ clients table created");

  await conn.execute(`CREATE TABLE IF NOT EXISTS \`seo_history\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`chatbotId\` int NOT NULL,
    \`siteUrl\` varchar(512) NOT NULL,
    \`score\` int NOT NULL,
    \`loadSpeed\` float,
    \`mobileScore\` int,
    \`issuesCount\` int NOT NULL DEFAULT 0,
    \`scannedAt\` timestamp NOT NULL DEFAULT NOW()
  )`);
  console.log("✓ seo_history table created");
} catch (e) {
  console.error("Migration error:", e.message);
  process.exit(1);
} finally {
  await conn.end();
}
