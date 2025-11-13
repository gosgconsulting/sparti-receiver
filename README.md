# Sparti Receiver Service

A TypeScript Node.js service that receives data from Google Sheets and stores it in PostgreSQL using Drizzle ORM.

## Features

- **TypeScript**: Fully typed codebase with strict type checking
- **Type Safety**: End-to-end type safety with Drizzle ORM and TypeScript
- **Error Handling**: Graceful error handling with early returns and clear error messages
- **Code Quality**: ESLint configured for TypeScript best practices
- Receives data from Google Sheets via POST endpoint
- Stores data in PostgreSQL with batch tracking
- Each upload gets a unique `batch_id` for easy retrieval
- Rows are numbered for proper sorting
- Flexible JSONB storage for dynamic schemas

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sparti_db
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=3000
```

### 3. Build TypeScript

```bash
# Compile TypeScript to JavaScript
npm run build
```

### 4. Initialize Database

The schema will be automatically created on first run. Alternatively, you can use Drizzle migrations:

```bash
# Generate migration files
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## API Endpoints

### POST `/api/upload-sheet-data`

Upload data from Google Sheets.

**Note:** Maximum request size is 100MB. For larger datasets, consider splitting the data into multiple requests.

**Request Body:**
```json
{
  "sheetData": [
    {"column1": "value1", "column2": "value2"},
    {"column1": "value3", "column2": "value4"}
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Successfully stored 2 rows to database",
  "data": {
    "batchId": 1,
    "inserted": 2
  }
}
```

**Partial Success Response (some rows failed):**
```json
{
  "success": true,
  "message": "Data stored with 1 errors",
  "data": {
    "batchId": 1,
    "inserted": 1,
    "errors": [
      {
        "rowIndex": 1,
        "rowNumber": 2,
        "rowData": {...},
        "error": "Error message"
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "No sheetData provided in the request body"
}
```

### GET `/api/batch/:batchId`

Fetch all rows for a specific batch, ordered by row number.

**Success Response:**
```json
{
  "success": true,
  "data": {
    "batchId": 1,
    "count": 2,
    "data": [
      {
        "id": 1,
        "batchId": 1,
        "rowNumber": 1,
        "data": {"column1": "value1", "column2": "value2"},
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

**Error Response (batch not found):**
```json
{
  "success": false,
  "error": "No data found for batch_id: 999"
}
```

### GET `/api/batches`

List all batch IDs.

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5,
    "batchIds": [1, 2, 3, 4, 5]
  }
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected"
  }
}
```

## Database Schema

The `sheet_data` table structure:

- `id` - Auto-incrementing primary key
- `batch_id` - Groups all rows from a single upload
- `row_number` - Sequential number for sorting (1-indexed)
- `data` - JSONB column storing flexible row data
- `created_at` - Timestamp of when the row was created

## Technology Stack

### TypeScript
- **Strict Mode**: Full type safety with strict TypeScript configuration
- **Type Inference**: Leverages Drizzle's excellent type inference
- **Developer Experience**: IntelliSense, autocomplete, and compile-time error checking

### Drizzle ORM
- **Lightweight**: Minimal overhead, fast performance
- **Type-Safe**: Full TypeScript support with excellent inference
- **Flexible**: SQL-like syntax, easy to understand
- **JSONB Support**: Excellent handling of flexible JSON data
- **Migrations**: Simple and powerful migration system

### Error Handling
- **Early Returns**: Clean code with early returns instead of nested try-catch
- **Clear Messages**: Descriptive error messages with context
- **Graceful Degradation**: Application continues running even when errors occur
- **Type-Safe Errors**: Custom `AppError` class with status codes

## Development

### Development Mode (with hot reload)

```bash
# Start development server with TypeScript (no build step required)
npm run dev
```

### Production Build

```bash
# Compile TypeScript to JavaScript
npm run build

# Start production server (runs compiled JavaScript)
npm start
```

### Code Quality

```bash
# Run ESLint to check for code issues
npm run lint

# Auto-fix ESLint issues
npm run lint:fix
```

### Database Operations

```bash
# Generate database migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Project Structure

```
sparti-receiver/
├── db/
│   ├── index.ts      # Drizzle database connection and functions
│   └── schema.ts     # Database schema definitions with type exports
├── middleware/
│   └── errorHandler.ts  # Express error handling middleware
├── types/
│   └── index.ts      # Shared TypeScript type definitions
├── utils/
│   └── errors.ts     # Error handling utilities and AppError class
├── dist/             # Compiled JavaScript (generated)
├── drizzle/          # Generated migration files
├── index.ts          # Express server and API endpoints
├── drizzle.config.ts # Drizzle configuration
├── tsconfig.json     # TypeScript configuration
├── .eslintrc.js      # ESLint configuration
└── package.json
```

## TypeScript Features

### Type Safety
- All functions have explicit return types
- Request/response types are fully typed
- Database operations use Drizzle's inferred types
- Custom error types with `AppError` class

### Error Handling
- Early returns for validation errors
- Graceful error handling that doesn't crash the app
- Clear, descriptive error messages
- Type-safe error responses

### Code Quality
- ESLint with TypeScript-specific rules
- Strict TypeScript configuration
- No implicit any types
- Comprehensive type checking

