ALTER TABLE `users` DROP COLUMN `passwordHash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `authProvider`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `emailVerified`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `emailVerifyToken`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `emailVerifyExpires`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `resetPasswordToken`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `resetPasswordExpires`;