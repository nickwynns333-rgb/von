CREATE TABLE `ai_interaction_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`agent_id` int,
	`session_id` varchar(128),
	`model` varchar(128) NOT NULL,
	`prompt_tokens` int DEFAULT 0,
	`completion_tokens` int DEFAULT 0,
	`total_tokens` int DEFAULT 0,
	`cost_usd` decimal(10,6) DEFAULT '0',
	`credits_deducted` int DEFAULT 0,
	`feature` varchar(64),
	`latency_ms` int,
	`success` tinyint DEFAULT 1,
	`error_message` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `ai_interaction_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`customerId` int,
	`customerName` varchar(256),
	`customerPhone` varchar(32),
	`customerEmail` varchar(320),
	`serviceType` varchar(256),
	`scheduledAt` timestamp NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 60,
	`status` enum('pending','confirmed','reminded','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
	`notes` text,
	`bookedVia` enum('ai_call','ai_chat','manual','online','referral') NOT NULL DEFAULT 'manual',
	`reminderSentAt` timestamp,
	`confirmationSentAt` timestamp,
	`followUpSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`phoneNumberId` int,
	`telnyxCallControlId` varchar(256),
	`telnyxCallLegId` varchar(256),
	`direction` enum('inbound','outbound') NOT NULL,
	`fromNumber` varchar(32) NOT NULL,
	`toNumber` varchar(32) NOT NULL,
	`status` enum('initiated','ringing','answered','completed','failed','busy','no_answer') NOT NULL DEFAULT 'initiated',
	`durationSeconds` int NOT NULL DEFAULT 0,
	`costCents` int NOT NULL DEFAULT 0,
	`creditsCharged` int NOT NULL DEFAULT 0,
	`recordingUrl` text,
	`transcription` text,
	`aiSummary` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`answeredAt` timestamp,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`businessName` varchar(256),
	`phone` varchar(32) NOT NULL,
	`address` varchar(512),
	`city` varchar(128),
	`state` varchar(64),
	`email` varchar(320),
	`decisionMakerName` varchar(256),
	`callStatus` enum('pending','calling','answered','voicemail','no_answer','busy','failed','do_not_call') NOT NULL DEFAULT 'pending',
	`callLogId` int,
	`demoLinkSent` boolean NOT NULL DEFAULT false,
	`demoLinkClickedAt` timestamp,
	`meetingBookedAt` timestamp,
	`presentationCompletedAt` timestamp,
	`convertedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`packageId` int NOT NULL,
	`agentId` int,
	`name` varchar(256) NOT NULL,
	`status` enum('draft','queued','running','paused','completed','failed') NOT NULL DEFAULT 'draft',
	`callScript` text,
	`demoLinkSlug` varchar(128),
	`callsTotal` int NOT NULL DEFAULT 0,
	`callsCompleted` int NOT NULL DEFAULT 0,
	`callsAnswered` int NOT NULL DEFAULT 0,
	`callsFailed` int NOT NULL DEFAULT 0,
	`emailsCollected` int NOT NULL DEFAULT 0,
	`linksDropped` int NOT NULL DEFAULT 0,
	`meetingsBooked` int NOT NULL DEFAULT 0,
	`creditsUsed` int NOT NULL DEFAULT 0,
	`affiliateId` int,
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_widgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`widgetKey` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`greeting` text NOT NULL DEFAULT ('Hi! How can I help you today?'),
	`primaryColor` varchar(16) NOT NULL DEFAULT '#6366f1',
	`accentColor` varchar(16) NOT NULL DEFAULT '#22d3ee',
	`position` enum('bottom-right','bottom-left','top-right','top-left') NOT NULL DEFAULT 'bottom-right',
	`avatarUrl` text,
	`botName` varchar(64) NOT NULL DEFAULT 'AI Assistant',
	`placeholder` varchar(128) NOT NULL DEFAULT 'Type a message...',
	`allowedDomains` text,
	`collectEmail` boolean NOT NULL DEFAULT false,
	`collectName` boolean NOT NULL DEFAULT false,
	`showBranding` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`totalConversations` int NOT NULL DEFAULT 0,
	`totalMessages` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_widgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_widgets_widgetKey_unique` UNIQUE(`widgetKey`)
);
--> statement-breakpoint
CREATE TABLE `custom_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyUserId` int NOT NULL,
	`domain` varchar(253) NOT NULL,
	`status` enum('pending','verifying','active','failed','suspended') NOT NULL DEFAULT 'pending',
	`verificationToken` varchar(64),
	`verifiedAt` timestamp,
	`sslStatus` enum('none','pending','active','expired') NOT NULL DEFAULT 'none',
	`sslExpiresAt` timestamp,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_domains_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE TABLE `data_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`industry` varchar(128) NOT NULL,
	`state` varchar(64),
	`city` varchar(128),
	`recordCount` int NOT NULL DEFAULT 0,
	`priceCredits` int NOT NULL DEFAULT 500,
	`fileKey` varchar(512),
	`fileUrl` varchar(1024),
	`sampleData` text,
	`tags` varchar(512),
	`isActive` boolean NOT NULL DEFAULT true,
	`totalPurchases` int NOT NULL DEFAULT 0,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`packageId` int NOT NULL,
	`creditsSpent` int NOT NULL,
	`affiliateId` int,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_flag_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flag_name` varchar(128) NOT NULL,
	`user_id` int,
	`role` varchar(32),
	`enabled` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `feature_flag_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follow_up_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequenceId` int NOT NULL,
	`businessId` int NOT NULL,
	`customerId` int,
	`appointmentId` int,
	`customerPhone` varchar(32),
	`customerEmail` varchar(320),
	`channel` varchar(32) NOT NULL,
	`status` enum('pending','sent','delivered','responded','failed','opted_out') NOT NULL DEFAULT 'pending',
	`messageContent` text,
	`responseContent` text,
	`sentAt` timestamp,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follow_up_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follow_up_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` enum('appointment_reminder','post_service_followup','upsell_inspection','re_engagement','review_request','referral_ask','custom') NOT NULL DEFAULT 'custom',
	`triggerType` enum('hours_before_appointment','hours_after_appointment','days_after_last_service','days_since_last_contact','manual') NOT NULL DEFAULT 'manual',
	`triggerValue` int NOT NULL DEFAULT 24,
	`channel` enum('ai_call','sms','email','all') NOT NULL DEFAULT 'ai_call',
	`messageTemplate` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`totalSent` int NOT NULL DEFAULT 0,
	`totalResponded` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `follow_up_sequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ivr_menus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phoneNumberId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`greeting` text NOT NULL,
	`options` text NOT NULL,
	`fallbackAction` varchar(32) NOT NULL DEFAULT 'agent',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ivr_menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `phone_numbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`telnyxNumberId` varchar(128),
	`phoneNumber` varchar(32) NOT NULL,
	`friendlyName` varchar(128),
	`countryCode` varchar(4) NOT NULL DEFAULT 'US',
	`capabilities` varchar(64) NOT NULL DEFAULT 'voice,sms',
	`status` enum('active','pending','released','failed') NOT NULL DEFAULT 'pending',
	`forwardTo` varchar(32),
	`ivrEnabled` boolean NOT NULL DEFAULT false,
	`ivrScript` text,
	`monthlyRateCents` int NOT NULL DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phone_numbers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`industry` varchar(80) NOT NULL DEFAULT 'general',
	`agent_type` varchar(60) NOT NULL DEFAULT 'chat',
	`content` text NOT NULL,
	`is_system` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `prompt_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`industry` varchar(64) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`city` varchar(128),
	`state` varchar(8),
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Chicago',
	`bookingUrl` varchar(512),
	`aiGreeting` text,
	`confirmationMsg` text,
	`reminderMsg` text,
	`followUpMsg` text,
	`upsellMsg` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(256),
	`phone` varchar(32) NOT NULL,
	`email` varchar(320),
	`address` text,
	`city` varchar(128),
	`state` varchar(8),
	`notes` text,
	`tags` varchar(512),
	`lastServiceDate` timestamp,
	`nextFollowUpDate` timestamp,
	`totalAppointments` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `white_label_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyUserId` int NOT NULL,
	`brandName` varchar(128) NOT NULL DEFAULT 'VonWork',
	`logoUrl` varchar(1024),
	`faviconUrl` varchar(1024),
	`primaryColor` varchar(16) NOT NULL DEFAULT '#7c3aed',
	`secondaryColor` varchar(16) NOT NULL DEFAULT '#06b6d4',
	`accentColor` varchar(16) NOT NULL DEFAULT '#10b981',
	`backgroundColor` varchar(16) NOT NULL DEFAULT '#030712',
	`textColor` varchar(16) NOT NULL DEFAULT '#f9fafb',
	`fontFamily` varchar(128) NOT NULL DEFAULT 'Inter',
	`customCss` text,
	`supportEmail` varchar(320),
	`supportPhone` varchar(32),
	`footerText` varchar(512),
	`hideVonworkBranding` boolean NOT NULL DEFAULT false,
	`customLoginMessage` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `white_label_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `white_label_configs_agencyUserId_unique` UNIQUE(`agencyUserId`)
);
--> statement-breakpoint
CREATE TABLE `widget_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`widgetId` int NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`visitorName` varchar(128),
	`visitorEmail` varchar(320),
	`visitorIp` varchar(64),
	`pageUrl` text,
	`messages` text NOT NULL DEFAULT ('[]'),
	`status` enum('active','resolved','abandoned') NOT NULL DEFAULT 'active',
	`creditsUsed` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `widget_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agency_clients` MODIFY COLUMN `clientUserId` int;--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `inviteEmail` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `inviteToken` varchar(64);--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `status` enum('invited','active','suspended','removed') DEFAULT 'invited' NOT NULL;--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `creditLimit` int DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `agentLimit` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `customLabel` varchar(128);--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `invitedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `acceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `agency_clients` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `avatarVideoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `simliAvatarId` varchar(128);--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `fishVoiceId` varchar(128);--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `voiceReferenceKey` varchar(512);--> statement-breakpoint
ALTER TABLE `agency_clients` DROP COLUMN `planOverride`;