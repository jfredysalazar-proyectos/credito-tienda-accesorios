CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`cedula` varchar(50) NOT NULL,
	`whatsappNumber` varchar(20) NOT NULL,
	`creditLimit` decimal(12,2) NOT NULL,
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_cedula_unique` UNIQUE(`cedula`)
);
--> statement-breakpoint
CREATE TABLE `credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`concept` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`balance` decimal(12,2) NOT NULL,
	`creditDays` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`dueDate` timestamp,
	`status` enum('active','paid','overdue') NOT NULL DEFAULT 'active',
	CONSTRAINT `credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditId` int NOT NULL,
	`clientId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paymentMethod` varchar(50) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`creditId` int,
	`messageType` enum('new_credit','payment_received','manual_statement') NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`messageContent` text NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `whatsappLogs_id` PRIMARY KEY(`id`)
);
