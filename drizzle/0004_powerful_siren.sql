ALTER TABLE `departments` ADD `slaHours` int DEFAULT 72 NOT NULL;--> statement-breakpoint
ALTER TABLE `grievances` ADD `dueAt` timestamp;--> statement-breakpoint
ALTER TABLE `grievances` ADD `escalatedAt` timestamp;