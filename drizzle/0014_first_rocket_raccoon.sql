CREATE TABLE `prospect_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sourceType` enum('CSV','DATABASE_EXPORT','MANUAL') NOT NULL DEFAULT 'CSV',
	`sourceAttribution` varchar(255) NOT NULL,
	`declaredBusinessPurpose` text NOT NULL,
	`consentDeclaration` boolean NOT NULL DEFAULT false,
	`mapping` json,
	`status` enum('PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PROCESSING',
	`rowsReceived` int NOT NULL DEFAULT 0,
	`rowsAccepted` int NOT NULL DEFAULT 0,
	`rowsDuplicates` int NOT NULL DEFAULT 0,
	`rowsSuppressed` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `prospect_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `business_prospects` ADD `importId` int;--> statement-breakpoint
ALTER TABLE `business_prospects` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `business_prospects` ADD `decisionMakerName` varchar(255);--> statement-breakpoint
ALTER TABLE `business_prospects` ADD `decisionMakerEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `business_prospects` ADD `normalizedPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `business_prospects` ADD `normalizedDomain` varchar(255);--> statement-breakpoint
ALTER TABLE `business_prospects` ADD `normalizedNameAddress` varchar(512);