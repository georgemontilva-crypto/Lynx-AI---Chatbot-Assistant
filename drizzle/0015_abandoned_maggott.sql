CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`siteUrl` text NOT NULL,
	`apiKey` varchar(64) NOT NULL,
	`brandName` varchar(128) DEFAULT 'AI Assistant',
	`brandColor` varchar(16) DEFAULT '#3b82f6',
	`logoUrl` text,
	`welcomeMessage` text DEFAULT ('Hi! How can I help you?'),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_apiKey_unique` UNIQUE(`apiKey`)
);
--> statement-breakpoint
CREATE TABLE `seo_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`chatbotId` int NOT NULL,
	`siteUrl` text NOT NULL,
	`score` int NOT NULL,
	`loadSpeed` float,
	`mobileScore` int,
	`issuesCount` int NOT NULL DEFAULT 0,
	`scannedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seo_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `pushPrefs` json;