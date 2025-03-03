document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000";
    const generateBtn = document.getElementById("generateEmployeeReportBtn");
    const reportModal = document.getElementById("employeeReportModal");
    const previewBtn = document.getElementById("previewEmployeeReportBtn");
    const downloadBtn = document.getElementById("downloadEmployeeReportBtn");
    const closeBtn = document.getElementById("closeEmployeeReportModalBtn");
    const reportPreview = document.getElementById("employeeReportPreview");
    const startDateInput = document.getElementById("employeeReportStartDate");
    const endDateInput = document.getElementById("employeeReportEndDate");

    // Open the report modal when the button is clicked
    generateBtn.addEventListener("click", () => {
        reportModal.style.display = "block";
        reportPreview.innerHTML = ""; // Clear previous content if any
        downloadBtn.style.display = "none";
    });

    // Close the report modal
    closeBtn.addEventListener("click", () => {
        reportModal.style.display = "none";
        reportPreview.innerHTML = "";
        downloadBtn.style.display = "none";
    });

    // Preview Report: fetch tasks for the logged-in employee and filter by date range
    previewBtn.addEventListener("click", async () => {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser) {
            alert("You must be logged in.");
            return;
        }
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (!startDate || !endDate) {
            alert("Please select a start and end date.");
            return;
        }

        try {
            // Fetch tasks for the employee.
            // Assuming the tasks API filters by userId (employee's own tasks)
            const response = await fetch(`${API_URL}/tasks?userId=${loggedInUser.id}`);
            if (!response.ok) throw new Error("Failed to fetch tasks.");
            const tasks = await response.json();

            // Filter tasks by the provided date range (using task.startDate)
            const filteredTasks = tasks.filter(task => {
                const taskDate = new Date(task.startDate);
                return taskDate >= new Date(startDate) && taskDate <= new Date(endDate);
            });

            // Build preview content
            if (filteredTasks.length === 0) {
                reportPreview.innerHTML = "<p>No tasks found for the selected date range.</p>";
                downloadBtn.style.display = "none";
            } else {
                let html = "<table border='1' style='width:100%; border-collapse: collapse;'>";
                html += "<tr><th>ID</th><th>Title</th><th>Description</th><th>Start Date</th><th>End Date</th><th>Status</th></tr>";
                filteredTasks.forEach(task => {
                    html += `<tr>
              <td>${task.id}</td>
              <td>${task.title}</td>
              <td>${task.description}</td>
              <td>${new Date(task.startDate).toLocaleDateString()}</td>
              <td>${new Date(task.endDate).toLocaleDateString()}</td>
              <td>${task.status}</td>
            </tr>`;
                });
                html += "</table>";
                reportPreview.innerHTML = html;
                downloadBtn.style.display = "inline-block";
            }
        } catch (error) {
            console.error("Error fetching tasks for report:", error);
            alert("Error fetching tasks. Please try again.");
        }
    });

    // Download the preview as a PDF using jsPDF and html2canvas
    downloadBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4"); // portrait, A4 size in millimeters

        doc.html(reportPreview, {
            callback: function (doc) {
                doc.save("employee_task_report.pdf");
            },
            x: 10,
            y: 10,
            width: 180, // PDF target width (A4 ~210mm, leaving margins)
            windowWidth: document.getElementById("employeeReportPreview").offsetWidth, // Use element's natural width
            html2canvas: {
                scale: 0.295 // Adjust scale if needed (reduce if too zoomed in)
            }
        });
    });
});
