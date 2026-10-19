import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const sources = sqliteTable('rating_sources', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  url: text('url').notNull(),
  listDate: text('list_date').notNull(),
  sha256: text('sha256').notNull(),
  notes: text('notes').notNull(),
});
export const periods = sqliteTable('rating_periods', {
  year: integer('year').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sources.id),
  referenceMedian: real('reference_median').notNull(),
  adjustment: real('adjustment').notNull(),
});
export const snapshots = sqliteTable('country_snapshots', {
  id: text('id').primaryKey(),
  federation: text('federation').notNull(),
  countryName: text('country_name').notNull(),
  flag: text('flag').notNull(),
  year: integer('year').notNull().references(() => periods.year),
  listedCount: integer('listed_count').notNull(),
});
export const people = sqliteTable('players', {
  id: text('id').primaryKey(),
  fideId: text('fide_id'),
  name: text('name').notNull(),
});
export const editions = sqliteTable('snapshot_players', {
  id: text('id').primaryKey(),
  snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
  personId: text('person_id').notNull().references(() => people.id),
  rank: integer('rank').notNull(),
  rawRating: integer('raw_rating').notNull(),
  rating: integer('rating').notNull(),
  title: text('title'),
}, table => [uniqueIndex('snapshot_rank_unique').on(table.snapshotId, table.rank), uniqueIndex('snapshot_person_unique').on(table.snapshotId, table.personId)]);
export const metadata = sqliteTable('catalogue_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
