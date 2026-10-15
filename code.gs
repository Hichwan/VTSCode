// ======================================
// CONFIGURATION
// ======================================

// Google Spreadsheet ID
const SHEET_ID =
  '1_ZBCRItoqQh04XFjMhKS5jBXRraZ29JoaY8mPAeXG-I';

// Google Drive Screenshot Folder ID
const FOLDER_ID =
  '1UWKa4cLoQVB3pUJtsCYG4NduXiKXcY_Q';

// Maximum number of tasks
const MAX_TASKS = 44;


// ======================================
// LOAD WEBSITE
// ======================================

function doGet() {

  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Veterinary Neurology Skills Tracker')
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1'
    );

}


// ======================================
// SAVE PATIENT RECORD
// ======================================

function savePatient(data) {

  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    // ----------------------------------
    // VALIDATE PATIENT INFORMATION
    // ----------------------------------

    if (
      !data ||
      !String(data.patientID || '').trim() ||
      !String(data.patientName || '').trim()
    ) {

      throw new Error(
        'Patient ID and Patient Name are required.'
      );

    }


    // ----------------------------------
    // COLLECT COMPLETED TASKS
    // ----------------------------------

    const tasks = Array.isArray(data.completedTasks)
      ? data.completedTasks
      : [];

    if (
      tasks.length > MAX_TASKS ||
      tasks.some(
        task =>
          typeof task !== 'string' ||
          task.length > 500
      )
    ) {

      throw new Error(
        'Invalid task selection.'
      );

    }


    // ----------------------------------
    // VALIDATE SCREENSHOT
    // ----------------------------------

    if (
      typeof data.screenshot !== 'string' ||
      !data.screenshot.startsWith(
        'data:image/png;base64,'
      )
    ) {

      throw new Error(
        'Screenshot is missing or invalid.'
      );

    }


    const imageBytes = Utilities.base64Decode(
      data.screenshot.split(',')[1]
    );

    if (imageBytes.length > 8 * 1024 * 1024) {

      throw new Error(
        'Screenshot exceeds the 8 MB limit.'
      );

    }


    // ----------------------------------
    // OPEN GOOGLE SHEET
    // ----------------------------------

    const spreadsheet = SpreadsheetApp.openById(
      SHEET_ID
    );

    const sheet = spreadsheet.getSheets()[0];


    // ----------------------------------
    // OPEN GOOGLE DRIVE FOLDER
    // ----------------------------------

    const folder = DriveApp.getFolderById(
      FOLDER_ID
    );


    // ----------------------------------
    // GENERATE DATE AND TIME
    // ----------------------------------

    const now = new Date();

    const timezone = Session.getScriptTimeZone();

    const date = Utilities.formatDate(
      now,
      timezone,
      'yyyy-MM-dd'
    );

    const time = Utilities.formatDate(
      now,
      timezone,
      'HHmmss'
    );


    // ----------------------------------
    // GENERATE SCREENSHOT FILENAME
    // ----------------------------------

    const safeID = String(data.patientID)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);

    const filename =
      safeID + '_' +
      date + '_' +
      time + '_' +
      Utilities.getUuid().slice(0, 8) +
      '.png';


    // ----------------------------------
    // CREATE SPREADSHEET HEADERS
    // ----------------------------------

    const headers = [

      'Date',
      'Patient ID',
      'Patient Name',
      'Species',
      'Breed'

    ];


    for (let i = 1; i <= MAX_TASKS; i++) {

      headers.push('Task ' + i);

    }


    headers.push('Screenshot');


    // Automatically add headers
    // if spreadsheet is empty

    if (sheet.getLastRow() === 0) {

      sheet.appendRow(headers);

    }


    // ----------------------------------
    // PROTECT SPREADSHEET VALUES
    // ----------------------------------

    function safeCell(value) {

      const text = String(value ?? '');

      if (/^\s*[=+\-@]/.test(text)) {

        return "'" + text;

      }

      return text;

    }


    // ----------------------------------
    // SAVE SCREENSHOT TO GOOGLE DRIVE
    // ----------------------------------

    const screenshotBlob = Utilities.newBlob(

      imageBytes,

      'image/png',

      filename

    );


    const screenshotFile = folder.createFile(
      screenshotBlob
    );


    // ----------------------------------
    // CREATE PATIENT SPREADSHEET ROW
    // ----------------------------------

    const row = [

      date,

      safeCell(data.patientID),

      safeCell(data.patientName),

      safeCell(data.species),

      safeCell(data.breed)

    ];


    // Add completed tasks only

    tasks.forEach(task => {

      row.push(safeCell(task));

    });


    // Fill remaining task columns
    // with empty cells

    while (row.length < 5 + MAX_TASKS) {

      row.push('');

    }


    // Add screenshot link

    row.push(
      screenshotFile.getUrl()
    );


    // ----------------------------------
    // SAVE PATIENT ROW
    // ----------------------------------

    sheet.appendRow(row);

    SpreadsheetApp.flush();


    // ----------------------------------
    // RETURN SUCCESS MESSAGE
    // ----------------------------------

    return {

      success: true,

      filename: filename,

      screenshotURL: screenshotFile.getUrl()

    };

  } finally {

    lock.releaseLock();

  }

}
