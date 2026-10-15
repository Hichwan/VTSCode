// ======================================
// CONFIGURATION
// ======================================

// Replace with your deployed backend URL.
// Do not put GitHub access tokens here.

const API_URL = "YOUR_BACKEND_URL";


// ======================================
// CURRENT DATE
// ======================================

function updateDate() {

    const today = new Date();

    const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    };

    document.getElementById("currentDate").textContent =
        today.toLocaleDateString("en-US", options);

}

updateDate();

setInterval(updateDate, 60000);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateDate();
});


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
