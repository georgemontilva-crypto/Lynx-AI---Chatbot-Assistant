CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatbotId` int NOT NULL,
	`eventType` enum('page_view','chat_open','chat_close','message_sent','lead_captured','click') NOT NULL,
	`pageUrl` text,
	`elementId` varchar(256),
	`visitorId` varchar(64),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatbots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL DEFAULT 'Lynx AI',
	`avatarUrl` text,
	`primaryColor` varchar(16) DEFAULT '#3b82f6',
	`secondaryColor` varchar(16) DEFAULT '#1e40af',
	`welcomeMessage` text DEFAULT ('¡Hola! ¿En qué puedo ayudarte hoy?'),
	`placeholder` varchar(256) DEFAULT 'Escribe tu pregunta...',
	`position` enum('bottom-right','bottom-left') DEFAULT 'bottom-right',
	`autoOpen` boolean DEFAULT false,
	`autoOpenDelay` int DEFAULT 5,
	`language` varchar(8) DEFAULT 'es',
	`isActive` boolean DEFAULT true,
	`siteUrl` text,
	`siteContext` text,
	`lastScannedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatbots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatbotId` int NOT NULL,
	`visitorId` varchar(64),
	`visitorIp` varchar(64),
	`visitorCountry` varchar(4),
	`messages` json,
	`satisfactionRating` int,
	`isLead` boolean DEFAULT false,
	`leadEmail` varchar(320),
	`leadName` varchar(256),
	`pageUrl` text,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_lead','low_rating','seo_issue','scan_complete','system') NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatbotId` int NOT NULL,
	`siteUrl` text NOT NULL,
	`score` int,
	`keywords` json,
	`suggestions` json,
	`topPages` json,
	`metaIssues` json,
	`loadSpeed` float,
	`mobileScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seo_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('cloud','embedded','whitelabel') DEFAULT 'cloud' NOT NULL;