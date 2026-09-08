CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grievanceId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grievanceId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedback_grievanceId_unique` UNIQUE(`grievanceId`)
);
--> statement-breakpoint
CREATE TABLE `grievanceCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`departmentId` int NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grievanceCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grievanceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grievanceId` int NOT NULL,
	`previousStatus` enum('submitted','acknowledged','assigned','in_progress','escalated','resolved','reopened','closed'),
	`newStatus` enum('submitted','acknowledged','assigned','in_progress','escalated','resolved','reopened','closed') NOT NULL,
	`activityType` varchar(40) NOT NULL DEFAULT 'status_change',
	`remarks` text,
	`actionTaken` text,
	`changedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grievanceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grievances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackingNumber` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int NOT NULL,
	`departmentId` int NOT NULL,
	`assignedOfficerId` int,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`location` varchar(240),
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('submitted','acknowledged','assigned','in_progress','escalated','resolved','reopened','closed') NOT NULL DEFAULT 'submitted',
	`resolutionDetails` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	`closedAt` timestamp,
	CONSTRAINT `grievances_id` PRIMARY KEY(`id`),
	CONSTRAINT `grievances_trackingNumber_unique` UNIQUE(`trackingNumber`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`grievanceId` int,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(40) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `officerProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`departmentId` int NOT NULL,
	`designation` varchar(120),
	`availability` enum('available','unavailable') NOT NULL DEFAULT 'available',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `officerProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `officerProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','officer','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_grievanceId_grievances_id_fk` FOREIGN KEY (`grievanceId`) REFERENCES `grievances`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploadedByUserId_users_id_fk` FOREIGN KEY (`uploadedByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_grievanceId_grievances_id_fk` FOREIGN KEY (`grievanceId`) REFERENCES `grievances`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `grievanceCategories` ADD CONSTRAINT `grievanceCategories_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `grievanceHistory` ADD CONSTRAINT `grievanceHistory_grievanceId_grievances_id_fk` FOREIGN KEY (`grievanceId`) REFERENCES `grievances`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `grievanceHistory` ADD CONSTRAINT `grievanceHistory_changedByUserId_users_id_fk` FOREIGN KEY (`changedByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `grievances` ADD CONSTRAINT `grievances_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `grievances` ADD CONSTRAINT `grievances_categoryId_grievanceCategories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `grievanceCategories`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `grievances` ADD CONSTRAINT `grievances_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `grievances` ADD CONSTRAINT `grievances_assignedOfficerId_users_id_fk` FOREIGN KEY (`assignedOfficerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_grievanceId_grievances_id_fk` FOREIGN KEY (`grievanceId`) REFERENCES `grievances`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `officerProfiles` ADD CONSTRAINT `officerProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `officerProfiles` ADD CONSTRAINT `officerProfiles_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE restrict ON UPDATE cascade;