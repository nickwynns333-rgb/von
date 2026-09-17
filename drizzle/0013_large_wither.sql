CREATE TABLE `ai_media_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`mediaType` enum('VOICE','AVATAR','BOTH') NOT NULL,
	`subjectName` varchar(255) NOT NULL,
	`sourceUrl` varchar(1024),
	`purpose` varchar(512) NOT NULL,
	`rightsConfirmed` boolean NOT NULL DEFAULT false,
	`disclosureConfirmed` boolean NOT NULL DEFAULT false,
	`typedSignature` varchar(255) NOT NULL,
	`status` enum('ACTIVE','REVOKED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`metadata` json,
	CONSTRAINT `ai_media_consents_id` PRIMARY KEY(`id`)
);
