CREATE TABLE `prospect_followup_preparations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`prospectId` int NOT NULL,
	`presentationId` int NOT NULL,
	`channel` enum('EMAIL','SMS') NOT NULL,
	`recipientName` varchar(255),
	`recipientAddress` varchar(320) NOT NULL,
	`subject` varchar(255),
	`body` longtext NOT NULL,
	`status` enum('DRAFT','PENDING_REVIEW','APPROVED','SENT','CANCELLED') NOT NULL DEFAULT 'PENDING_REVIEW',
	`consentSnapshot` json,
	`approvedAt` timestamp,
	`approvedBy` int,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_followup_preparations_id` PRIMARY KEY(`id`)
);
