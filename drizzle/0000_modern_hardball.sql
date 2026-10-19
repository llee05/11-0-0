CREATE TABLE `snapshot_players` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`person_id` text NOT NULL,
	`rank` integer NOT NULL,
	`raw_rating` integer NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	FOREIGN KEY (`snapshot_id`) REFERENCES `country_snapshots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_rank_unique` ON `snapshot_players` (`snapshot_id`,`rank`);--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_person_unique` ON `snapshot_players` (`snapshot_id`,`person_id`);--> statement-breakpoint
CREATE TABLE `catalogue_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`fide_id` text,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rating_periods` (
	`year` integer PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`reference_median` real NOT NULL,
	`adjustment` real NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `rating_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `country_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`federation` text NOT NULL,
	`country_name` text NOT NULL,
	`flag` text NOT NULL,
	`year` integer NOT NULL,
	`listed_count` integer NOT NULL,
	FOREIGN KEY (`year`) REFERENCES `rating_periods`(`year`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rating_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`list_date` text NOT NULL,
	`sha256` text NOT NULL,
	`notes` text NOT NULL
);
