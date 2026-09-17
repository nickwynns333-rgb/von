CREATE TABLE `ai_meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(64) NOT NULL,
	`title` varchar(256),
	`prospectEmail` varchar(320),
	`prospectName` varchar(128),
	`status` enum('scheduled','waiting','live','ended','cancelled') NOT NULL DEFAULT 'scheduled',
	`livekitRoomName` varchar(128),
	`presentationId` int,
	`recordingUrl` varchar(1024),
	`transcriptStorageKey` varchar(512),
	`summary` text,
	`durationSeconds` int DEFAULT 0,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_meetings_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_meetings_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `ai_presentations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`title` varchar(256) NOT NULL,
	`prompt` text,
	`slides` json NOT NULL,
	`theme` varchar(32) DEFAULT 'dark',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_presentations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commission_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`type` enum('percentage','fixed','percentage_bonus','tiered','recurring','one_time','credit_reward','hybrid') NOT NULL DEFAULT 'percentage',
	`rate` decimal(5,2) DEFAULT '0',
	`fixedAmount` decimal(10,2) DEFAULT '0',
	`creditReward` int DEFAULT 0,
	`tierConfig` json,
	`isRecurring` boolean NOT NULL DEFAULT false,
	`recurringMonths` int DEFAULT 0,
	`isDefault` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commission_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`referralId` int,
	`referredUserId` int,
	`commissionPlanId` int,
	`type` enum('percentage','fixed','percentage_bonus','tiered','recurring','one_time','credit_reward','hybrid','level1','level2','level3') NOT NULL,
	`amount` decimal(10,2) NOT NULL DEFAULT '0',
	`creditAmount` int NOT NULL DEFAULT 0,
	`saleAmount` decimal(10,2),
	`stripePaymentIntentId` varchar(64),
	`status` enum('pending','eligible','approved','paid','paused','rejected','fraud') NOT NULL DEFAULT 'pending',
	`eligibleAt` timestamp,
	`approvedAt` timestamp,
	`paidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`allowedRoles` json DEFAULT ('[]'),
	`allowedUserIds` json DEFAULT ('[]'),
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_flags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `fraud_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`referralId` int,
	`reason` enum('self_referral','duplicate_account','vpn_abuse','cookie_manipulation','fake_purchase','refund_abuse','suspicious_pattern') NOT NULL,
	`details` text,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`isResolved` boolean NOT NULL DEFAULT false,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`flaggedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fraud_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` enum('banner','logo','email_template','social_graphic','presentation','video','case_study','sales_script','other') NOT NULL,
	`storageKey` varchar(512),
	`url` varchar(1024),
	`description` text,
	`category` varchar(64),
	`downloadCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_commission_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`commissionPlanId` int NOT NULL,
	`overrideType` enum('partner','plan','product','campaign','coupon','level') NOT NULL,
	`overrideKey` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_commission_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(32) NOT NULL,
	`minMrr` decimal(10,2) NOT NULL DEFAULT '0',
	`minSubscribers` int NOT NULL DEFAULT 0,
	`commissionRate` decimal(5,2) NOT NULL,
	`bonusRate` decimal(5,2) DEFAULT '0',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_levels_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_levels_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('affiliate','reseller','agency') NOT NULL DEFAULT 'affiliate',
	`levelId` int,
	`referralCode` varchar(32) NOT NULL,
	`status` enum('pending','active','suspended','banned') NOT NULL DEFAULT 'pending',
	`payoutMethod` enum('stripe_connect','paypal','wise','ach','bitcoin','usdt','manual') DEFAULT 'manual',
	`payoutDetails` json,
	`stripeConnectId` varchar(64),
	`totalClicks` int NOT NULL DEFAULT 0,
	`totalSignups` int NOT NULL DEFAULT 0,
	`totalActiveCustomers` int NOT NULL DEFAULT 0,
	`totalMrrGenerated` decimal(10,2) NOT NULL DEFAULT '0',
	`totalCommissionsEarned` decimal(10,2) NOT NULL DEFAULT '0',
	`totalCommissionsPaid` decimal(10,2) NOT NULL DEFAULT '0',
	`isFraudFlagged` boolean NOT NULL DEFAULT false,
	`notes` text,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `partners_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `partners_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `payout_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`method` enum('stripe_connect','paypal','wise','ach','bitcoin','usdt','manual') NOT NULL,
	`status` enum('pending','processing','paid','rejected') NOT NULL DEFAULT 'pending',
	`stripeTransferId` varchar(64),
	`transactionRef` varchar(256),
	`notes` text,
	`adminNotes` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `payout_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`referredUserId` int,
	`referralCode` varchar(32) NOT NULL,
	`promoCode` varchar(32),
	`attribution` enum('first_click','last_click','direct') DEFAULT 'last_click',
	`ipAddress` varchar(64),
	`userAgent` text,
	`landingPage` varchar(512),
	`clickedAt` timestamp NOT NULL DEFAULT (now()),
	`signedUpAt` timestamp,
	`convertedAt` timestamp,
	`status` enum('clicked','signed_up','converted','refunded','fraud') DEFAULT 'clicked',
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
