ALTER TABLE `chatbots` ADD `messagesThisMonth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `chatbots` ADD `messagesResetAt` timestamp DEFAULT (now()) NOT NULL;