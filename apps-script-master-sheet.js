/**
 * NEXAGENT OS — Master Sheet Apps Script
 * Deploy this as a Web App in Google Apps Script on the Auto Workshop PE Master Sheet.
 *
 * Sheet ID: 1747hMprRaXYhGZpGKtOcvshbMG6HHnQXGvBk4q3zGnM
 *
 * HOW TO DEPLOY:
 * 1. Open the Master Sheet in Google Sheets
 * 2. Extensions → Apps Script
 * 3. Delete any existing code, paste this entire file
 * 4. Click Save (disk icon)
 * 5. Click Deploy → New Deployment
 * 6. Type: Web App
 * 7. Execute as: Me (rubendiedericks24@gmail.com)
 * 8. Who has access: Anyone
 * 9. Click Deploy → Copy the Web App URL
 * 10. Paste the URL into SHEETS_SCRIPT_URL in inventory-stock-manager.html
 *     (and into operations-dashboard.html when M7 is fixed)
 *
 * This script runs as Ruben's account. The sheet stays PRIVATE.
 * No API key. No public access to the sheet. POPIA compliant.
 *
 * USAGE:
 * GET ?tab=Parts & Stock          → returns all rows as JSON array
 * GET ?tab=Job Bookings           → returns all rows as JSON array
 * GET ?tab=Quotes                 → returns all rows as JSON array
 * GET ?tab=Invoices               → returns all rows as JSON array
 * GET ?tab=Leads                  → returns all rows as JSON array
 * GET ?tab=Timesheet              → returns all rows as JSON array (once M5 tab is created)
 */

const SHEET_ID = '1747hMprRaXYhGZpGKtOcvshbMG6HHnQXGvBk4q3zGnM';

function doGet(e) {
  try {
    const tabName = e.parameter.tab || 'Parts & Stock';
    const ss      = SpreadsheetApp.openById(SHEET_ID);
    const sheet   = ss.getSheetByName(tabName);

    if (!sheet) {
      return jsonResponse({ error: 'Tab not found: ' + tabName });
    }

    const data    = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse([]);  // empty sheet — return empty array
    }

    const headers = data[0].map(h => String(h).trim());
    const rows    = data.slice(1)
      .map((row, i) => {
        const obj = { __row: i + 2 };  // physical sheet row number (1-based, +1 for header)
        headers.forEach((h, j) => {
          const val = row[j];
          // Convert dates to readable strings, keep numbers as numbers
          if (val instanceof Date) {
            obj[h] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          } else {
            obj[h] = val;
          }
        });
        return obj;
      })
      .filter(obj => headers.some(h => h && obj[h] !== '' && obj[h] !== null && obj[h] !== undefined));  // skip blank rows

    return jsonResponse(rows);

  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
