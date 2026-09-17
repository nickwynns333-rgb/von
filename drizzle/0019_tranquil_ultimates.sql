CREATE TABLE `prospect_list_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listId` int NOT NULL,
	`userId` int NOT NULL,
	`prospectId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_list_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospect_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sourceType` enum('GOOGLE_PLACES','CSV','MANUAL') NOT NULL,
	`industry` varchar(160),
	`locationQuery` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospect_lists_id` PRIMARY KEY(`id`)
);
