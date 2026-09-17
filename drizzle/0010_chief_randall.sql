CREATE TABLE `agreement_acceptances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vwAccountId` int NOT NULL,
	`versionId` varchar(32) NOT NULL,
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(64),
	`userAgent` text,
	`typedSignature` varchar(255) NOT NULL,
	`scrolledToEnd` boolean NOT NULL DEFAULT false,
	`checkboxChecked` boolean NOT NULL DEFAULT false,
	CONSTRAINT `agreement_acceptances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agreement_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`versionId` varchar(32) NOT NULL,
	`body` longtext NOT NULL,
	`bodySha256` varchar(64) NOT NULL,
	`effectiveFrom` timestamp NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agreement_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `agreement_versions_versionId_unique` UNIQUE(`versionId`)
);
--> statement-breakpoint
CREATE TABLE `credential_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vwAccountId` int NOT NULL,
	`recipientSite` varchar(64) NOT NULL,
	`scope` json,
	`apiKeyHash` varchar(64),
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`lastUsedAt` timestamp,
	CONSTRAINT `credential_grants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pow_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`powRef` varchar(20) NOT NULL,
	`vwAccountId` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024),
	`sha256` varchar(64) NOT NULL,
	`mimeType` varchar(128),
	`sizeBytes` int,
	`scannedAt` timestamp,
	`scanResult` enum('CLEAN','FLAGGED','PENDING','ERROR') DEFAULT 'PENDING',
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pow_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pow_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`powRef` varchar(20) NOT NULL,
	`reviewerId` int NOT NULL,
	`decision` enum('VERIFIED','REJECTED','MORE_INFO_REQUIRED','ESCALATED') NOT NULL,
	`rationale` longtext NOT NULL,
	`memberMessage` text,
	`decidedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pow_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pow_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`powRef` varchar(20) NOT NULL,
	`revisionNo` int NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`changedBy` enum('MEMBER','REVIEWER') NOT NULL DEFAULT 'MEMBER',
	`changeReason` text,
	CONSTRAINT `pow_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pow_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`powRef` varchar(20) NOT NULL,
	`vwAccountId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`businessName` varchar(255),
	`role` varchar(128),
	`objectives` longtext,
	`productsServices` text,
	`contributionDescription` longtext,
	`dateStart` varchar(16),
	`dateEnd` varchar(16),
	`isOngoing` boolean DEFAULT false,
	`referenceUrls` json,
	`transactionHashes` json,
	`walletAddress` varchar(128),
	`witnessContact` varchar(255),
	`attestationChecked` boolean NOT NULL DEFAULT false,
	`status` enum('SUBMITTED','AUTO_REVIEW','MANUAL_REVIEW','VERIFIED','REJECTED','MORE_INFO_REQUIRED','HISTORICAL') NOT NULL DEFAULT 'SUBMITTED',
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`validUntil` timestamp,
	`reattestationCadenceDays` int DEFAULT 365,
	`autoReviewResult` json,
	`revisionCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `pow_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `pow_submissions_powRef_unique` UNIQUE(`powRef`)
);
--> statement-breakpoint
CREATE TABLE `tier_matrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tier` enum('PIONEER','FOUNDER','VANGUARD','LEGACY') NOT NULL,
	`feature` varchar(128) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`quota` int,
	`quotaUnit` varchar(32),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `tier_matrix_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upstream_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vwAccountId` int NOT NULL,
	`hfnMemberId` varchar(32),
	`hfnStatus` enum('ACTIVE','INACTIVE','NOT_FOUND','ERROR','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
	`jfProofOfLoyalty` enum('VERIFIED','UNVERIFIED','NOT_FOUND','ERROR','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
	`jfLevel` varchar(32),
	`jfCredentialValidUntil` timestamp,
	`jfRawResponse` json,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`source` enum('LOGIN','POW_SUBMIT','AGREEMENT_EXEC','ACTIVATION','SCHEDULED','WEBHOOK') NOT NULL,
	CONSTRAINT `upstream_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vw_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vwAccountId` varchar(32) NOT NULL,
	`hfnMemberId` varchar(32),
	`email` varchar(320) NOT NULL,
	`status` enum('PENDING','ACTIVE','SUSPENDED_UPSTREAM','SUSPENDED','CLOSED') NOT NULL DEFAULT 'PENDING',
	`tier` enum('NONE','PIONEER','FOUNDER','VANGUARD','LEGACY') NOT NULL DEFAULT 'NONE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastGateCheckAt` timestamp,
	`suspendedReason` text,
	CONSTRAINT `vw_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `vw_accounts_vwAccountId_unique` UNIQUE(`vwAccountId`)
);
--> statement-breakpoint
CREATE TABLE `vw_audit_log` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`vwAccountId` int,
	`action` varchar(128) NOT NULL,
	`actor` varchar(128),
	`detail` json,
	`ipAddress` varchar(64),
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vw_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vw_businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vwAccountId` int NOT NULL,
	`legalName` varchar(255) NOT NULL,
	`structure` varchar(64),
	`jurisdiction` varchar(128),
	`regNumber` varchar(128),
	`principalAddress` text,
	`signatoryName` varchar(255),
	`signatoryRole` varchar(128),
	`taxStatus` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vw_businesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `vw_businesses_vwAccountId_unique` UNIQUE(`vwAccountId`)
);
--> statement-breakpoint
CREATE TABLE `vw_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `vw_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `vw_config_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `vw_usage_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`vwAccountId` int NOT NULL,
	`feature` varchar(128) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`metadata` json,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vw_usage_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wb_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `wb_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wb_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`instruction` text NOT NULL,
	`htmlBefore` longtext,
	`htmlAfter` longtext,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `wb_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wb_sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(255),
	`sessionId` varchar(255),
	`businessName` varchar(255) NOT NULL,
	`businessType` varchar(100) NOT NULL,
	`tagline` varchar(500),
	`description` text,
	`phone` varchar(50),
	`email` varchar(255),
	`address` text,
	`colorScheme` varchar(50) DEFAULT 'blue',
	`style` varchar(50) DEFAULT 'modern',
	`generatedHtml` longtext,
	`status` enum('generating','preview','published','cancelled') DEFAULT 'generating',
	`subdomain` varchar(100),
	`customDomain` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`planStatus` enum('free','paid') DEFAULT 'free',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wb_sites_id` PRIMARY KEY(`id`)
);
