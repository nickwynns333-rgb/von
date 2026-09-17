CREATE TABLE `agency_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyUserId` int NOT NULL,
	`clientUserId` int NOT NULL,
	`creditsAllocated` int NOT NULL DEFAULT 0,
	`planOverride` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agency_clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`type` enum('receptionist','outbound_caller','video_sales','chat','appointment_setter','customer_service','sales_closer') NOT NULL,
	`model` varchar(128) NOT NULL DEFAULT 'meta-llama/llama-3.1-8b-instruct',
	`systemPrompt` text,
	`personality` varchar(64) DEFAULT 'professional',
	`tone` varchar(64) DEFAULT 'friendly',
	`language` varchar(16) DEFAULT 'en',
	`avatarUrl` varchar(512),
	`voiceId` varchar(128),
	`config` json,
	`shareableSlug` varchar(64),
	`isActive` boolean NOT NULL DEFAULT true,
	`totalConversations` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_agents_shareableSlug_unique` UNIQUE(`shareableSlug`)
);
--> statement-breakpoint
CREATE TABLE `credit_packs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`credits` int NOT NULL,
	`priceUsd` decimal(10,2) NOT NULL,
	`stripePriceId` varchar(64),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `credit_packs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureType` varchar(64) NOT NULL,
	`creditsPerUnit` int NOT NULL,
	`unitLabel` varchar(32) NOT NULL,
	`defaultModel` varchar(128),
	`fallbackModel` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_pricing_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_pricing_featureType_unique` UNIQUE(`featureType`)
);
--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('subscription_grant','purchase','admin_grant','agency_grant','usage_chat','usage_call','usage_meeting','usage_voice','usage_presentation','usage_knowledge','usage_image','usage_document','refund') NOT NULL,
	`description` text,
	`featureType` varchar(64),
	`modelUsed` varchar(128),
	`costUsd` decimal(10,6),
	`stripePaymentIntentId` varchar(64),
	`balanceAfter` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`lifetimePurchased` int NOT NULL DEFAULT 0,
	`lifetimeUsed` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credits_id` PRIMARY KEY(`id`),
	CONSTRAINT `credits_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`name` varchar(256) NOT NULL,
	`type` enum('pdf','url','text','csv','docx') NOT NULL,
	`storageKey` varchar(512),
	`sourceUrl` varchar(1024),
	`status` enum('pending','processing','ready','failed') DEFAULT 'pending',
	`chunkCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(32) NOT NULL,
	`priceMonthly` decimal(10,2) NOT NULL,
	`priceAnnual` decimal(10,2),
	`creditsPerMonth` int NOT NULL DEFAULT 0,
	`maxAgents` int NOT NULL DEFAULT 1,
	`maxClients` int NOT NULL DEFAULT 0,
	`features` json NOT NULL,
	`stripePriceIdMonthly` varchar(64),
	`stripePriceIdAnnual` varchar(64),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`stripeSubscriptionId` varchar(64),
	`status` enum('active','trialing','past_due','canceled','incomplete','paused') NOT NULL DEFAULT 'active',
	`billingInterval` enum('monthly','annual') DEFAULT 'monthly',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`trialEnd` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `white_label_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brandName` varchar(128),
	`logoUrl` varchar(512),
	`faviconUrl` varchar(512),
	`primaryColor` varchar(16) DEFAULT '#6366f1',
	`accentColor` varchar(16) DEFAULT '#22d3ee',
	`customDomain` varchar(256),
	`customEmail` varchar(320),
	`hideVonworkBranding` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `white_label_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `white_label_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','agency') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `agencyOwnerId` int;