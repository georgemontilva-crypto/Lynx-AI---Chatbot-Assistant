ALTER TABLE `users` ADD `subscriptionId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','cancelled','suspended','expired','pending');--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionPlanId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `nextBillingDate` timestamp;