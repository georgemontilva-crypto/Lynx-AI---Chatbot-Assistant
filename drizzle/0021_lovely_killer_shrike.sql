CREATE TABLE `widget_email_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatbotId` int NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `widget_email_verifications_id` PRIMARY KEY(`id`)
);
