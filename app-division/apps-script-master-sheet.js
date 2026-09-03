/**
 * NEXAGENT OS — Master Sheet Apps Script
 * Sheet ID: 1747hMprRaXYhGZpGKtOcvshbMG6HHnQXGvBk4q3zGnM
 * GET ?tab=Parts & Stock&key=NexOS-PE
 */

const SHEET_ID = '1747hMprRaXYhGZpGKtOcvshbMG6HHnQXGvBk4q3zGnM';
const ACCESS_KEY = 'NexOS-PE';

function doGet(e) {
  try {
    const key = (e.parameter.key || '').trim();
    if (key !== ACCESS_KEY) {
      return jsonResponse({ error: 'Unauthorized' });
    }

    const tabName = e.parameter.tab || 'Parts & Stock';
    const ss      = SpreadsheetApp.openById(SHEET_ID);
    const sheet   = ss.getSheetByName(tabName);

    if (!sheet) {
      return jsonResponse({ error: 'Tab not found: ' + tabName });
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse([]);
    }

    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1)
      .map((row, i) => {
        const obj = { __row: i + 2 };
        headers.forEach((h, j) => {
          const val = row[j];
          if (val instanceof Date) {
            obj[h] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          } else {
            obj[h] = val;
          }
        });
        return obj;
      })
      .filter(obj => headers.some(h => h && obj[h] !== '' && obj[h] !== null && obj[h] !== undefined));

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
