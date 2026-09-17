CREATE TABLE `availability_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(8) NOT NULL DEFAULT '09:00',
	`endTime` varchar(8) NOT NULL DEFAULT '17:00',
	`isEnabled` boolean NOT NULL DEFAULT true,
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Chicago',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availability_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocked_times` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL DEFAULT 'Blocked',
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`isAllDay` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_times_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_agent_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookingId` int,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`action` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booking_agent_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventTypeId` int,
	`guestName` varchar(256) NOT NULL,
	`guestEmail` varchar(320) NOT NULL,
	`guestPhone` varchar(32),
	`guestNotes` text,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Chicago',
	`status` enum('pending','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'pending',
	`location` varchar(512),
	`locationType` enum('in_person','phone','video','other') NOT NULL DEFAULT 'in_person',
	`meetingLink` varchar(1024),
	`cancelReason` text,
	`rescheduleCount` int NOT NULL DEFAULT 0,
	`reminderSentAt` timestamp,
	`confirmationSentAt` timestamp,
	`bookedVia` enum('ai_agent','manual','online_form','phone','sms') NOT NULL DEFAULT 'manual',
	`aiSummary` text,
	`crmContactId` int,
	`icalUid` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`description` text,
	`durationMinutes` int NOT NULL DEFAULT 30,
	`bufferBeforeMinutes` int NOT NULL DEFAULT 0,
	`bufferAfterMinutes` int NOT NULL DEFAULT 0,
	`location` varchar(512),
	`locationType` enum('in_person','phone','video','other') NOT NULL DEFAULT 'in_person',
	`color` varchar(16) NOT NULL DEFAULT '#1A6FFF',
	`maxBookingsPerDay` int,
	`requiresConfirmation` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`price` decimal(10,2),
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_types_id` PRIMARY KEY(`id`)
);
