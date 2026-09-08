ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `departmentId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `active` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE set null ON UPDATE cascade;