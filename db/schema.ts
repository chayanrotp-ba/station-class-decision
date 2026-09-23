import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const stationMaster=sqliteTable('station_master',{
 stationId:integer('station_id').primaryKey(),
 displayName:text('display_name').notNull(),
 notes:text('notes').notNull().default(''),
 revision:integer('revision').notNull().default(1),
 updatedAt:text('updated_at').notNull(),
 updatedBy:text('updated_by').notNull(),
});
export const stationPhotos=sqliteTable('station_photos',{
 id:text('id').primaryKey(),stationId:integer('station_id').notNull(),
 objectKey:text('object_key').notNull().unique(),filename:text('filename').notNull(),
 contentType:text('content_type').notNull(),size:integer('size').notNull(),
 caption:text('caption').notNull().default(''),createdAt:text('created_at').notNull(),createdBy:text('created_by').notNull(),
},t=>[index('idx_station_photos_station_created').on(t.stationId,t.createdAt,t.id)]);
