// ====================================
// CONFIGURATION
// ====================================

// Replace with your Google Sheet ID
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID";

// Replace with your Google Drive folder ID
const FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";


// ====================================
// LOAD WEBSITE
// ====================================

function doGet() {

  return HtmlService
    .createHtmlOutputFromFile("Index")
    .setTitle("Veterinary Patient Task Tracker")
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1"
    );

}


// ====================================
// SAVE PATIENT
// ====================================

function savePatient(data) {

  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    if (!data.patientID || !data.patientName) {
      throw new Error("Missing patient information.");
    }

    const sheet = SpreadsheetApp
      .openById(SHEET_ID)
      .getSheets()[0];

    const folder = DriveApp.getFolderById(FOLDER_ID);

    // Generate date and time on server
    const now = new Date();

    const timezone = Session.getScriptTimeZone();

    const date = Utilities.formatDate(
      now,
      timezone,
      "yyyy-MM-dd"
    );

    const time = Utilities.formatDate(
      now,
      timezone,
      "HHmmss"
    );

    const safeID = String(data.patientID)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);

    const filename =
      safeID + "_" + date + "_" + time + "_" +
      Utilities.getUuid().slice(0, 8) + ".png";


    // ====================================
    // SAVE SCREENSHOT
    // ====================================

    const base64 = data.screenshot.split(",")[1];

    if (!base64) {
      throw new Error("Invalid screenshot.");
    }

    const imageBytes = Utilities.base64Decode(base64);

    const blob = Utilities.newBlob(
      imageBytes,
      "image/png",
      filename
    );

    const file = folder.createFile(blob);


    // ====================================
    // SAVE SPREADSHEET ROW
    // ====================================

    const tasks = Array.isArray(data.completedTasks)
      ? data.completedTasks.slice(0, 20)
      : [];

    // Prevent values from being interpreted as formulas.
    function safeCell(value) {
      const text = String(value ?? "");

      return /^[\s]*[=+\-@]/.test(text)
        ? "'" + text
        : text;
    }

    const row = [
      date,
      safeCell(data.patientID),
      safeCell(data.patientName),
      safeCell(data.species),
      safeCell(data.breed)
    ];

    // Add completed tasks in consecutive columns
    tasks.forEach(task => {
      row.push(safeCell(task));
    });

    // Fill remaining task columns
    while (row.length < 25) {
      row.push("");
    }

    // Add screenshot link
    row.push(file.getUrl());

    sheet.appendRow(row);

    SpreadsheetApp.flush();

    return {
      success: true,
      filename: filename
    };

  } finally {

    lock.releaseLock();

  }

}});


// ======================================
// SAVE PATIENT
// ======================================

async function savePatient() {

    const saveButton =
        document.getElementById("saveButton");

    const status =
        document.getElementById("saveStatus");

    if (saveButton.disabled) return;

    // PATIENT INFORMATION

    const patientID =
        document.getElementById("patientID").value.trim();

    const patientName =
        document.getElementById("patientName").value.trim();

    const species =
        document.getElementById("species").value;

    const breed =
        document.getElementById("breed").value.trim();


    // VALIDATION

    if (!patientID || !patientName) {

        alert("Please enter Patient ID and Patient Name.");

        return;

    }


    // COMPLETED TASKS ONLY

    const completedTasks = [];

    document.querySelectorAll(
        '.task-grid input[type="checkbox"]:checked'
    ).forEach(checkbox => {

        completedTasks.push(checkbox.value);

    });


    // DATE AND TIME

    const now = new Date();

    const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    const time = [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0")
    ].join("");


    // CREATE FILE NAME

    const safeID =
        patientID.replace(/[^a-zA-Z0-9_-]/g, "_");

    const filename =
        `${safeID}_${date}_${time}.png`;


    // START SAVING

    saveButton.disabled = true;

    status.textContent = "Saving patient record...";


    try {

        // GENERATE SCREENSHOT

        const screenshotArea =
            document.getElementById("screenshotArea");

        const canvas = await html2canvas(
            screenshotArea,
            {
                backgroundColor: "#ffffff",
                scale: 2
            }
        );

        const screenshot =
            canvas.toDataURL("image/png");


        // CREATE RECORD

        const patientRecord = {

            date: date,

            patientID: patientID,

            patientName: patientName,

            species: species,

            breed: breed,

            completedTasks: completedTasks,

            screenshot: screenshot,

            filename: filename

        };


        // SEND TO BACKEND

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(patientRecord)

        });


        if (!response.ok) {

            throw new Error(
                `Save failed: ${response.status}`
            );

        }


        // SUCCESS

        status.textContent =
            "Patient record saved successfully!";

        alert("Patient record saved successfully!");


    } catch (error) {

        console.error(error);

        status.textContent =
            "Unable to save patient record.";

        alert(
            "The record could not be saved. " +
            "Please try again."
        );

    } finally {

        saveButton.disabled = false;

    }

}


// ======================================
// CLEAR FORM
// ======================================

function clearForm() {

    const confirmed = confirm(
        "Are you sure you want to clear the form?"
    );

    if (!confirmed) return;


    document.getElementById("patientID").value = "";

    document.getElementById("patientName").value = "";

    document.getElementById("species").value = "";

    document.getElementById("breed").value = "";


    document.querySelectorAll(
        '.task-grid input[type="checkbox"]'
    ).forEach(checkbox => {

        checkbox.checked = false;

    });


    document.getElementById("saveStatus").textContent = "";

}
