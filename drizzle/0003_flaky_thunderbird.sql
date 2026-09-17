CREATE TABLE `kb_chunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`docId` int NOT NULL,
	`kbId` int NOT NULL,
	`userId` int NOT NULL,
	`chunkIndex` int NOT NULL,
	`content` text NOT NULL,
	`embedding` json,
	`tokenCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kb_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kb_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kbId` int NOT NULL,
	`userId` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`fileUrl` varchar(1024),
	`fileKey` varchar(512),
	`mimeType` varchar(128) NOT NULL DEFAULT 'text/plain',
	`status` enum('pending','processing','ready','error') NOT NULL DEFAULT 'pending',
	`charCount` int NOT NULL DEFAULT 0,
	`chunkCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kb_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_bases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`name` varchar(256) NOT NULL,
	`description` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`docCount` int NOT NULL DEFAULT 0,
	`chunkCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_bases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `feature_flags` MODIFY COLUMN `allowedRoles` json;--> statement-breakpoint
ALTER TABLE `feature_flags` MODIFY COLUMN `allowedUserIds` json;