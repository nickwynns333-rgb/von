ALTER TABLE `wb_revisions` ADD `parentRevisionId` int;--> statement-breakpoint
ALTER TABLE `wb_revisions` ADD `engine` varchar(80) DEFAULT 'MANUS_INTERNAL';--> statement-breakpoint
ALTER TABLE `wb_revisions` ADD `model` varchar(255);--> statement-breakpoint
ALTER TABLE `wb_revisions` ADD `qualityStatus` varchar(40) DEFAULT 'accepted';--> statement-breakpoint
ALTER TABLE `wb_sites` ADD `activeRevisionId` int;