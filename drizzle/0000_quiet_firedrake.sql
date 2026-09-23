CREATE TABLE `station_master` (
	`station_id` integer PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `station_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`station_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `station_photos_object_key_unique` ON `station_photos` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_station_photos_station_created` ON `station_photos` (`station_id`,`created_at`,`id`);