CREATE TABLE `business_prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`runId` int,
	`source` enum('GOOGLE_PLACES','CSV','MANUAL') NOT NULL,
	`sourceRecordId` varchar(255),
	`sourceAttribution` varchar(255) NOT NULL,
	`sourceExpiresAt` timestamp,
	`businessName` varchar(255) NOT NULL,
	`industry` varchar(160),
	`formattedAddress` text,
	`phone` varchar(64),
	`officialWebsite` varchar(1024),
	`websiteStatus` enum('MISSING_SIGNAL','PRESENT','UNVERIFIED') NOT NULL DEFAULT 'UNVERIFIED',
	`rating` decimal(3,2),
	`ratingCount` int,
	`reviewStatus` enum('NEW','REVIEW_READY','APPROVED','REJECTED','SUPPRESSED','DEMO_CREATED','OUTREACH_APPROVED') NOT NULL DEFAULT 'NEW',
	`isDoNotContact` boolean NOT NULL DEFAULT false,
	`consentStatus` enum('NOT_RECORDED','OPTED_IN','WITHDRAWN') NOT NULL DEFAULT 'NOT_RECORDED',
	`consentCapturedAt` timestamp,
	`reviewerNotes` text,
	`rawSourceData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospect_demos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`prospectId` int NOT NULL,
	`demoSlug` varchar(96) NOT NULL,
	`generatedHtml` longtext NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('DRAFT','READY_FOR_REVIEW','APPROVED_FOR_SHARE','EXPIRED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
	`expiresAt` timestamp,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`approvedBy` int,
	CONSTRAINT `prospect_demos_id` PRIMARY KEY(`id`),
	CONSTRAINT `prospect_demos_demoSlug_unique` UNIQUE(`demoSlug`)
);
--> statement-breakpoint
CREATE TABLE `prospect_outreach_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`prospectId` int NOT NULL,
	`demoId` int,
	`channel` enum('EMAIL','MANUAL_CALL','AI_PRESENTATION','AI_VOICE') NOT NULL,
	`proposedSubject` varchar(255),
	`proposedContent` longtext NOT NULL,
	`status` enum('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','SENT','CANCELLED') NOT NULL DEFAULT 'DRAFT',
	`consentSnapshot` json,
	`approvedBy` int,
	`approvedAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_outreach_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospect_presentations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`prospectId` int NOT NULL,
	`demoId` int NOT NULL,
	`presentationSlug` varchar(96) NOT NULL,
	`script` longtext NOT NULL,
	`status` enum('DRAFT','APPROVED','SHARED','COMPLETED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sharedAt` timestamp,
	CONSTRAINT `prospect_presentations_id` PRIMARY KEY(`id`),
	CONSTRAINT `prospect_presentations_presentationSlug_unique` UNIQUE(`presentationSlug`)
);
--> statement-breakpoint
CREATE TABLE `prospect_suppressions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`normalizedValue` varchar(512) NOT NULL,
	`type` enum('PHONE','EMAIL','DOMAIN','BUSINESS') NOT NULL,
	`reason` varchar(255) NOT NULL,
	`source` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_suppressions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospecting_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`source` enum('GOOGLE_PLACES','CSV') NOT NULL,
	`industry` varchar(160) NOT NULL,
	`locationQuery` varchar(255) NOT NULL,
	`maxResults` int NOT NULL DEFAULT 20,
	`status` enum('QUEUED','RUNNING','COMPLETED','FAILED') NOT NULL DEFAULT 'QUEUED',
	`discoveredCount` int NOT NULL DEFAULT 0,
	`missingWebsiteCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`metadata` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospecting_runs_id` PRIMARY KEY(`id`)
);
