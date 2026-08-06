ALTER TABLE `chatbots` MODIFY COLUMN `welcomeMessage` text DEFAULT ('Hi! How can I help you today?');--> statement-breakpoint
ALTER TABLE `chatbots` MODIFY COLUMN `placeholder` varchar(256) DEFAULT 'Type your question...';--> statement-breakpoint
ALTER TABLE `chatbots` MODIFY COLUMN `language` varchar(8) DEFAULT 'en';--> statement-breakpoint
ALTER TABLE `chatbots` ADD `apiKey` varchar(64);--> statement-breakpoint
ALTER TABLE `chatbots` ADD CONSTRAINT `chatbots_apiKey_unique` UNIQUE(`apiKey`);