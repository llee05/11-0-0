ALTER TABLE `snapshot_players` ADD `edition_year` integer;--> statement-breakpoint
ALTER TABLE `snapshot_players` ADD `source_id` text REFERENCES rating_sources(id);--> statement-breakpoint
ALTER TABLE `country_snapshots` ADD `kind` text DEFAULT 'country' NOT NULL;--> statement-breakpoint
ALTER TABLE `country_snapshots` ADD `period_label` text;