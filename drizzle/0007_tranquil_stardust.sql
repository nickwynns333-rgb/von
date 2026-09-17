CREATE TABLE `collections_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`contact_id` int,
	`company_id` int,
	`invoice_number` varchar(50),
	`amount` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`due_date` bigint,
	`status` enum('draft','sent','overdue','paid','disputed','written_off') DEFAULT 'draft',
	`description` text,
	`payment_link` varchar(500),
	`chase_count` int DEFAULT 0,
	`last_chased_at` bigint,
	`paid_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `collections_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comm_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('whatsapp','sms','email','webchat','instagram','telegram','facebook','voice') NOT NULL,
	`name` varchar(100) NOT NULL,
	`config` json,
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `comm_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comm_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(200),
	`phone` varchar(30),
	`email` varchar(200),
	`avatar_url` varchar(500),
	`tags` json,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `comm_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comm_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`user_id` int NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`sender` enum('contact','agent','ai') NOT NULL DEFAULT 'contact',
	`content` text NOT NULL,
	`content_type` enum('text','image','audio','video','file','template') DEFAULT 'text',
	`media_url` varchar(500),
	`status` enum('sent','delivered','read','failed') DEFAULT 'sent',
	`ai_model` varchar(100),
	`created_at` bigint NOT NULL,
	CONSTRAINT `comm_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`contact_id` int,
	`channel_type` enum('whatsapp','sms','email','webchat','instagram','telegram','facebook','voice') NOT NULL DEFAULT 'webchat',
	`subject` varchar(300),
	`status` enum('open','snoozed','resolved','spam') DEFAULT 'open',
	`assigned_to` enum('ai_sales','ai_support','ai_receptionist','ai_collections','human'),
	`assigned_agent_id` int,
	`last_message_at` bigint,
	`unread_count` int DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`industry` varchar(100),
	`website` varchar(300),
	`phone` varchar(30),
	`address` text,
	`annual_revenue` decimal(15,2),
	`employee_count` int,
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `crm_companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`first_name` varchar(100),
	`last_name` varchar(100),
	`email` varchar(200),
	`phone` varchar(30),
	`company_id` int,
	`title` varchar(100),
	`tags` json,
	`notes` text,
	`lead_score` int DEFAULT 0,
	`source` varchar(100),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `crm_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`pipeline_id` int NOT NULL,
	`stage_id` varchar(50) NOT NULL,
	`title` varchar(200) NOT NULL,
	`value` decimal(15,2),
	`currency` varchar(10) DEFAULT 'USD',
	`contact_id` int,
	`company_id` int,
	`probability` int DEFAULT 50,
	`expected_close_date` bigint,
	`status` enum('open','won','lost') DEFAULT 'open',
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `crm_deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_pipelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`stages` json NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `crm_pipelines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`due_at` bigint,
	`status` enum('todo','in_progress','done') DEFAULT 'todo',
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`contact_id` int,
	`deal_id` int,
	`company_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `crm_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legal_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`type` enum('nda','msa','sow','employment','contractor','service','custom') NOT NULL DEFAULT 'custom',
	`content` text,
	`status` enum('draft','review','signed','expired') DEFAULT 'draft',
	`contact_id` int,
	`company_id` int,
	`expires_at` bigint,
	`signed_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `legal_contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` int NOT NULL,
	`worker_id` int NOT NULL,
	`hours_worked` decimal(8,2),
	`gross_pay` decimal(10,2),
	`deductions` decimal(10,2) DEFAULT '0.00',
	`net_pay` decimal(10,2),
	`notes` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `payroll_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`period_start` bigint NOT NULL,
	`period_end` bigint NOT NULL,
	`total_gross` decimal(15,2),
	`total_net` decimal(15,2),
	`status` enum('draft','approved','paid') DEFAULT 'draft',
	`notes` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `payroll_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('employee','contractor') NOT NULL DEFAULT 'contractor',
	`email` varchar(200),
	`phone` varchar(30),
	`pay_rate` decimal(10,2),
	`pay_type` enum('hourly','salary','per_task') DEFAULT 'hourly',
	`tax_id` varchar(50),
	`bank_details` json,
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `payroll_workers_id` PRIMARY KEY(`id`)
);
