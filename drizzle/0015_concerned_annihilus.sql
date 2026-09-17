CREATE TABLE `prospect_campaign_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`prospectId` int NOT NULL,
	`campaignId` int NOT NULL,
	`presentationId` int,
	`status` enum('STAGED','PRESENTATION_READY','CONTACT_PERMISSION_REQUIRED','FOLLOW_UP_REVIEW','SENT','CONVERTED','SUPPRESSED') NOT NULL DEFAULT 'STAGED',
	`consentSnapshot` json,
	`decisionMakerVerifiedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospect_campaign_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospect_presentation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`presentationId` int NOT NULL,
	`eventType` enum('OPENED','QUESTION_ASKED','CONTACT_CAPTURED','FOLLOW_UP_PREPARED') NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_presentation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaign_runs` ADD `testMode` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_runs` ADD `outreachApprovalStatus` enum('DRAFT','APPROVED','REJECTED') DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_runs` ADD `outreachApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_runs` ADD `outreachApprovedBy` int;