// This is conceptual code for your Sparti Node.js service
const express = require("express");
const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON bodies

// The endpoint that your Google Apps Script POSTs to
app.post("/api/upload-sheet-data", (req, res) => {
  console.log("Received data from Google Sheets");
  const sheetData = req.body.sheetData;

  if (!sheetData) {
    return res.status(400).send("No sheetData provided in the request body.");
  }

  // --- YOUR CUSTOM SERVICE LOGIC GOES HERE ---
  // Example: Log the data, save to a database, or perform a file operation.
  console.log(`Received ${sheetData.length} rows of data.`);
  // Example: console.log(sheetData[0]);

  // Once your service logic is complete:
  res.status(200).send("Data successfully received by the Sparti Service.");
});

app.listen(port, () => {
  console.log(`Sparti Service listening at http://localhost:${port}`);
});
