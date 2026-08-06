ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `authProvider` enum('email','google','github','manus') DEFAULT 'manus';--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifyToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifyExpires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `resetPasswordToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `resetPasswordExpires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `isBanned` boolean DEFAULT false NOT NULL;