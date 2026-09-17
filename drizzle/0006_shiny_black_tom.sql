CREATE TABLE `accounting_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`business_name` varchar(255) NOT NULL,
	`business_type` enum('sole_trader','llc','s_corp','c_corp','partnership','trust','individual') DEFAULT 'llc',
	`industry` varchar(100),
	`fiscal_year_end` varchar(10) DEFAULT '12-31',
	`subscription_tier` enum('ai_bookkeeper','ai_accounting','ai_cfo','enterprise') DEFAULT 'ai_bookkeeper',
	`stripe_subscription_id` varchar(255),
	`status` enum('active','paused','cancelled') DEFAULT 'active',
	`assigned_team_member_id` int,
	`onboarded_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `accounting_clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cfo_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`user_id` int NOT NULL,
	`messages` json NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `cfo_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exception_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('categorization','reconciliation','tax_question','document_review','payroll','other') NOT NULL,
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`title` varchar(255) NOT NULL,
	`description` text,
	`context_data` json,
	`status` enum('open','assigned','in_progress','resolved','escalated') DEFAULT 'open',
	`assigned_to` int,
	`resolution` text,
	`resolved_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `exception_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`user_id` int NOT NULL,
	`date` bigint NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`type` enum('income','expense','transfer','adjustment') NOT NULL,
	`category` varchar(100),
	`subcategory` varchar(100),
	`account` varchar(100),
	`vendor` varchar(255),
	`receipt_url` text,
	`receipt_key` varchar(500),
	`ai_categorized` boolean DEFAULT false,
	`ai_confidence` decimal(5,2),
	`human_reviewed` boolean DEFAULT false,
	`notes` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `financial_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memory_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`agent_id` int,
	`agent_name` varchar(128),
	`user_message` text NOT NULL,
	`agent_response` text NOT NULL,
	`topic_tags` text,
	`sentiment` enum('positive','neutral','negative') DEFAULT 'neutral',
	`created_at` bigint NOT NULL,
	CONSTRAINT `memory_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_audit_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`user_id` int NOT NULL,
	`audit_type` enum('full','technical','content','schema','geo','local','backlinks','keywords') NOT NULL DEFAULT 'full',
	`score` int,
	`findings` text,
	`raw_response` text,
	`credits_used` int DEFAULT 5,
	`created_at` bigint NOT NULL,
	CONSTRAINT `seo_audit_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`url` varchar(512) NOT NULL,
	`tier` enum('starter','growth','agency') NOT NULL DEFAULT 'starter',
	`last_audit_at` bigint,
	`audit_score` int,
	`keywords` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `seo_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`tier` enum('starter','growth','agency') NOT NULL,
	`status` enum('active','cancelled','past_due','trialing') NOT NULL DEFAULT 'trialing',
	`stripe_subscription_id` varchar(256),
	`stripe_customer_id` varchar(256),
	`current_period_end` bigint,
	`projects_limit` int NOT NULL DEFAULT 1,
	`audits_per_month` int NOT NULL DEFAULT 4,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `seo_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tax_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`client_id` int,
	`form_type` enum('1040_single','1040_mfj','1040_mfs','1120','1120s','1065','1041','quarterly_corp','quarterly_llc') NOT NULL,
	`tax_year` int NOT NULL,
	`state` varchar(50),
	`extra_schedules` int DEFAULT 0,
	`extra_states` int DEFAULT 0,
	`base_price` decimal(10,2) NOT NULL,
	`total_price` decimal(10,2) NOT NULL,
	`status` enum('pending','documents_requested','in_progress','review','completed','filed') DEFAULT 'pending',
	`assigned_team_member_id` int,
	`stripe_payment_intent_id` varchar(255),
	`documents_url` text,
	`completed_documents_url` text,
	`notes` text,
	`due_date` bigint,
	`filed_date` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `tax_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('bookkeeper','accountant','tax_specialist','senior_accountant','manager') DEFAULT 'bookkeeper',
	`specialization` varchar(255),
	`hourly_rate` decimal(10,2) DEFAULT '10.00',
	`is_active` boolean DEFAULT true,
	`created_at` bigint NOT NULL,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_members_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `team_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`team_member_id` int NOT NULL,
	`client_id` int,
	`tax_order_id` int,
	`exception_id` int,
	`task_type` enum('bookkeeping','tax_prep','payroll','reconciliation','review','cleanup','other') NOT NULL,
	`description` text NOT NULL,
	`hours_worked` decimal(6,2),
	`rate_type` enum('standard','cleanup') DEFAULT 'standard',
	`hourly_rate` decimal(10,2) DEFAULT '10.00',
	`amount_billed` decimal(10,2),
	`status` enum('pending','in_progress','completed','billed') DEFAULT 'pending',
	`started_at` bigint,
	`completed_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `team_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`preferences` text,
	`corrections` text,
	`do_not_repeat` text,
	`context_digest` text,
	`interaction_count` int DEFAULT 0,
	`agents_used` text,
	`topics_discussed` text,
	`business_name` varchar(128),
	`industry` varchar(64),
	`goals` text,
	`last_active_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `user_memory_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_memory_user_id_unique` UNIQUE(`user_id`)
);
