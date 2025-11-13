// Sparti Node.js service - TypeScript version
import express, { Request, Response } from "express";
import {
  testConnection,
  initializeSchema,
  storeSheetData,
  fetchBatchData,
  getAllBatchIds,
} from "./db";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";
import { sendErrorResponse, sendSuccessResponse } from "./utils/errors";
import { SheetDataRow, StoreSheetDataResult } from "./types";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || "3000", 10);

// Middleware to parse JSON bodies with 100MB limit
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Initialize database schema and test connection on startup
(async (): Promise<void> => {
  await initializeSchema().catch((err) => {
    console.error("[testing] Failed to initialize database schema:", err.message);
  });

  const connectionResult = await testConnection().catch((err) => {
    console.error("[testing] Failed to connect to database:", err.message);
    return false;
  });

  if (!connectionResult) {
    console.warn("[testing] Database connection failed on startup, but server will continue");
  }
})();

// Type for upload request body
interface UploadRequestBody {
  sheetData?: SheetDataRow[];
}

// The endpoint that your Google Apps Script POSTs to
app.post(
  "/api/upload-sheet-data",
  asyncHandler(async (req: Request<unknown, unknown, UploadRequestBody>, res: Response) => {
    console.log("[testing] Received data from Google Sheets");
    const { sheetData } = req.body;

    // Early returns for validation errors
    if (!sheetData) {
      sendErrorResponse(
        res,
        "No sheetData provided in the request body",
        400
      );
      return;
    }

    if (!Array.isArray(sheetData)) {
      sendErrorResponse(
        res,
        "sheetData must be an array",
        400
      );
      return;
    }

    if (sheetData.length === 0) {
      sendErrorResponse(
        res,
        "sheetData array cannot be empty",
        400
      );
      return;
    }

    console.log(`[testing] Received ${sheetData.length} rows of data.`);
    console.log(`[testing] First row sample:`, JSON.stringify(sheetData[0], null, 2));

    // Store data to PostgreSQL using Drizzle ORM
    const result: StoreSheetDataResult = await storeSheetData(sheetData);

    // Handle partial success (some rows failed)
    if (result.errors.length > 0) {
      console.warn(`[testing] Completed with ${result.errors.length} errors`);
      sendSuccessResponse(
        res,
        {
          batchId: result.batchId,
          inserted: result.inserted,
          errors: result.errors,
        },
        207,
        `Data stored with ${result.errors.length} errors`
      );
      return;
    }

    // Full success
    sendSuccessResponse(
      res,
      {
        batchId: result.batchId,
        inserted: result.inserted,
      },
      200,
      `Successfully stored ${result.inserted} rows to database`
    );
  })
);

// Health check endpoint
app.get(
  "/health",
  asyncHandler(async (_req: Request, res: Response) => {
    const dbConnected = await testConnection();
    const status = dbConnected ? "healthy" : "unhealthy";
    const databaseStatus = dbConnected ? "connected" : "disconnected";

    sendSuccessResponse(
      res,
      {
        status,
        database: databaseStatus,
      },
      dbConnected ? 200 : 503
    );
  })
);

// Endpoint to fetch all rows for a specific batch_id
app.get(
  "/api/batch/:batchId",
  asyncHandler(async (req: Request, res: Response) => {
    const batchIdParam = (req.params as { batchId: string }).batchId;
    const batchId = parseInt(batchIdParam, 10);

    // Early return for invalid batchId
    if (isNaN(batchId) || batchId < 1) {
      sendErrorResponse(
        res,
        `Invalid batchId: ${batchIdParam}. Must be a positive number.`,
        400
      );
      return;
    }

    const rows = await fetchBatchData(batchId);

    // Early return if no data found
    if (rows.length === 0) {
      sendErrorResponse(
        res,
        `No data found for batch_id: ${batchId}`,
        404
      );
      return;
    }

    sendSuccessResponse(
      res,
      {
        batchId,
        count: rows.length,
        data: rows,
      },
      200
    );
  })
);

// Endpoint to list all batch IDs
app.get(
  "/api/batches",
  asyncHandler(async (_req: Request, res: Response) => {
    const batchIds = await getAllBatchIds();

    sendSuccessResponse(
      res,
      {
        count: batchIds.length,
        batchIds,
      },
      200
    );
  })
);

// Apply error handling middleware (must be last)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Sparti Service listening at http://localhost:${port}`);
});

