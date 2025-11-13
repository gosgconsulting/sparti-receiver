// Drizzle ORM database connection and utilities
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sheetData, type SheetData } from "./schema";
import { eq, asc } from "drizzle-orm";
import type { StoreSheetDataResult, SheetDataRow, RowError } from "../types";
import { AppError, getErrorMessage, formatErrorMessage } from "../utils/errors";
import dotenv from "dotenv";

dotenv.config();

/**
 * Create PostgreSQL connection pool
 */
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "sparti_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Create Drizzle database instance
 */
export const db = drizzle(pool, { schema: { sheetData } });

/**
 * Test database connection
 * @returns Promise<boolean> - true if connection successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  const queryResult = await pool.query("SELECT NOW()").catch((error: unknown) => {
    console.error(
      "[testing] Database connection error:",
      getErrorMessage(error)
    );
    return null;
  });

  if (!queryResult) {
    return false;
  }

  console.log("[testing] Database connection successful");
  return true;
}

/**
 * Initialize database schema (create tables if they don't exist)
 * Run migrations using: npm run db:migrate
 * @returns Promise<void>
 */
export async function initializeSchema(): Promise<void> {
  const queryResult = await pool.query(`
    CREATE TABLE IF NOT EXISTS sheet_data (
      id SERIAL PRIMARY KEY,
      batch_id INTEGER NOT NULL,
      row_number INTEGER NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_batch_row UNIQUE (batch_id, row_number)
    );
    
    CREATE INDEX IF NOT EXISTS idx_sheet_data_batch_id ON sheet_data(batch_id);
    CREATE INDEX IF NOT EXISTS idx_sheet_data_row_number ON sheet_data(batch_id, row_number);
  `).catch((error: unknown) => {
    const errorMessage = formatErrorMessage(
      "Schema initialization error",
      getErrorMessage(error)
    );
    console.error(`[testing] ${errorMessage}`);
    throw new AppError(errorMessage, 500);
  });

  if (queryResult) {
    console.log("[testing] Schema initialized successfully");
  }
}

/**
 * Get the next batch ID for a new upload
 * @param tableName - Name of the table (default: 'sheet_data')
 * @returns Promise<number> - The next batch ID
 */
async function getNextBatchId(tableName: string = "sheet_data"): Promise<number> {
  const batchIdResult = await pool.query(`
    SELECT COALESCE(MAX(batch_id), 0) + 1 AS next_batch_id 
    FROM ${tableName}
  `).catch((error: unknown) => {
    const errorMessage = formatErrorMessage(
      "Failed to get next batch ID",
      getErrorMessage(error)
    );
    throw new AppError(errorMessage, 500);
  });

  if (!batchIdResult || !batchIdResult.rows[0]) {
    throw new AppError("Failed to retrieve batch ID from database", 500);
  }

  const batchId = parseInt(batchIdResult.rows[0].next_batch_id as string, 10);

  if (isNaN(batchId)) {
    throw new AppError("Invalid batch ID returned from database", 500);
  }

  return batchId;
}

/**
 * Insert rows individually when batch insert fails
 * @param insertData - Array of data to insert
 * @param sheetDataArray - Original sheet data array for error reporting
 * @returns Promise<{inserted: number, errors: RowError[]}>
 */
async function insertRowsIndividually(
  insertData: Array<{ batchId: number; rowNumber: number; data: SheetDataRow }>,
  sheetDataArray: SheetDataRow[]
): Promise<{ inserted: number; errors: RowError[] }> {
  let insertedCount = 0;
  const errors: RowError[] = [];

  for (let i = 0; i < insertData.length; i++) {
    const insertResult = await db.insert(sheetData).values(insertData[i]).catch((rowError: unknown) => {
      const errorMessage = getErrorMessage(rowError);
      errors.push({
        rowIndex: i,
        rowNumber: i + 1,
        rowData: sheetDataArray[i],
        error: errorMessage,
      });
      console.error(`[testing] Error inserting row ${i + 1}:`, errorMessage);
      return null;
    });

    if (insertResult) {
      insertedCount++;
    }
  }

  return { inserted: insertedCount, errors };
}

/**
 * Store sheet data to PostgreSQL using Drizzle ORM
 * All rows from the same upload share the same batch_id
 * Each row has a row_number for sorting purposes
 * @param sheetDataArray - Array of row objects from Google Sheets
 * @param tableName - Name of the table (default: 'sheet_data', must match schema)
 * @returns Promise<StoreSheetDataResult>
 */
export async function storeSheetData(
  sheetDataArray: SheetDataRow[],
  tableName: string = "sheet_data"
): Promise<StoreSheetDataResult> {
  // Early return for invalid input
  if (!sheetDataArray || !Array.isArray(sheetDataArray)) {
    throw new AppError(
      "sheetData must be an array",
      400
    );
  }

  if (sheetDataArray.length === 0) {
    throw new AppError(
      "sheetData array cannot be empty",
      400
    );
  }

  // Get the next batch_id
  const batchId = await getNextBatchId(tableName);
  console.log(`[testing] Generated batch_id: ${batchId} for ${sheetDataArray.length} rows`);

  // Prepare data for batch insert
  const insertData = sheetDataArray.map((row, index) => ({
    batchId,
    rowNumber: index + 1, // 1-indexed
    data: row, // Drizzle will automatically handle JSONB conversion
  }));

  // Try batch insert first
  const batchInsertResult = await db.insert(sheetData).values(insertData).catch((insertError: unknown) => {
    console.warn(
      `[testing] Batch insert failed, attempting individual inserts:`,
      getErrorMessage(insertError)
    );
    return null;
  });

  // If batch insert succeeded
  if (batchInsertResult) {
    const insertedCount = insertData.length;
    console.log(
      `[testing] Successfully inserted ${insertedCount} rows with batch_id: ${batchId}`
    );
    return {
      success: true,
      batchId,
      inserted: insertedCount,
      errors: [],
    };
  }

  // Fallback to individual inserts
  const { inserted, errors } = await insertRowsIndividually(insertData, sheetDataArray);

  console.log(
    `[testing] Inserted ${inserted} rows with batch_id: ${batchId}, ${errors.length} errors`
  );

  return {
    success: true,
    batchId,
    inserted,
    errors,
  };
}

/**
 * Fetch all rows for a specific batch_id, ordered by row_number
 * @param batchId - The batch_id to fetch
 * @returns Promise<SheetData[]> - Array of row objects
 */
export async function fetchBatchData(batchId: number): Promise<SheetData[]> {
  if (isNaN(batchId) || batchId < 1) {
    throw new AppError(
      `Invalid batchId: ${batchId}. Must be a positive number.`,
      400
    );
  }

  const rows = await db
    .select()
    .from(sheetData)
    .where(eq(sheetData.batchId, batchId))
    .orderBy(asc(sheetData.rowNumber))
    .catch((error: unknown) => {
      const errorMessage = formatErrorMessage(
        "Failed to fetch batch data",
        getErrorMessage(error)
      );
      throw new AppError(errorMessage, 500);
    });

  return rows;
}

/**
 * Get all batch IDs (useful for listing all uploads)
 * @returns Promise<number[]> - Array of batch IDs
 */
export async function getAllBatchIds(): Promise<number[]> {
  const result = await pool.query(`
    SELECT DISTINCT batch_id 
    FROM sheet_data 
    ORDER BY batch_id DESC
  `).catch((error: unknown) => {
    const errorMessage = formatErrorMessage(
      "Failed to fetch batch IDs",
      getErrorMessage(error)
    );
    throw new AppError(errorMessage, 500);
  });

  if (!result || !result.rows) {
    return [];
  }

  return result.rows.map((row: { batch_id: number }) => row.batch_id);
}

// Export pool for advanced usage if needed
export { pool };

