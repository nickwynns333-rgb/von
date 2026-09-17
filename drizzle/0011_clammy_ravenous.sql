CREATE TABLE `member_pricing_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vwAccountId` int,
	`program` enum('HFN','JOINFORCE') NOT NULL,
	`sourceMemberId` varchar(64) NOT NULL,
	`purpose` enum('OWN_USE') NOT NULL DEFAULT 'OWN_USE',
	`discountPercent` int NOT NULL,
	`status` enum('ACTIVE','SUSPENDED','REVOKED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
	`verifiedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`lastVerifiedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_pricing_entitlements_id` PRIMARY KEY(`id`)
);
