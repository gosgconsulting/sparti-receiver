// Drizzle ORM schema definitions
import { pgTable, serial, integer, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

/**
 * Schema for storing Google Sheets data
 * - batch_id: Groups all rows from a single upload
 * - row_number: Sequential number for sorting (1-indexed)
 * - data: JSONB column storing flexible row data
 */
export const sheetData = pgTable(
  "sheet_data",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id").notNull(),
    rowNumber: integer("row_number").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueBatchRow: unique().on(table.batchId, table.rowNumber),
  })
);

/**
 * Type for selecting from sheet_data table
 */
export type SheetData = InferSelectModel<typeof sheetData>;

/**
 * Type for inserting into sheet_data table
 */
export type NewSheetData = InferInsertModel<typeof sheetData>;

