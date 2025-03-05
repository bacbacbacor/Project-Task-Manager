document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000";
    const generateReportBtn = document.getElementById("generateReportBtn");
    const reportModal = document.getElementById("reportModal");
    const selectUserReport = document.getElementById("selectUserReport");
    const previewReportBtn = document.getElementById("previewReportBtn");
    const downloadReportBtn = document.getElementById("downloadReportBtn");
    const closeReportModalBtn = document.getElementById("closeReportModalBtn");
    const reportPreview = document.getElementById("reportPreview");

    // Open the Report Modal and load users
    generateReportBtn.addEventListener("click", async () => {
        reportModal.style.display = "block";
        await loadUsersForReport();
    });

    // Close the Report Modal
    closeReportModalBtn.addEventListener("click", () => {
        reportModal.style.display = "none";
        reportPreview.innerHTML = "";
        downloadReportBtn.style.display = "none";
    });

    // Load managers and employees (excluding Admin) into the dropdown
    async function loadUsersForReport() {
        try {
            const response = await fetch(`${API_URL}/users`);
            if (!response.ok) throw new Error("Failed to load users.");
            const users = await response.json();
            selectUserReport.innerHTML = '<option value="">Select a user</option>';
            users.forEach(user => {
                if (user.role === "Manager" || user.role === "Employee") {
                    const option = document.createElement("option");
                    option.value = user.id;
                    option.textContent = `${user.firstName} ${user.lastName} (${user.role})`;
                    selectUserReport.appendChild(option);
                }
            });
        } catch (error) {
            console.error("Error loading users for report:", error);
        }
    }

    // Preview Report: fetch tasks for the selected user and filter by date range
    previewReportBtn.addEventListener("click", async () => {
        const userId = selectUserReport.value;
        const startDate = document.getElementById("reportStartDate").value;
        const endDate = document.getElementById("reportEndDate").value;
        if (!userId || !startDate || !endDate) {
            alert("Please select a user and date range.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/tasks?userId=${userId}`);
            if (!response.ok) throw new Error("Failed to fetch tasks.");
            const tasks = await response.json();
            // Filter tasks by the provided date range (using task.startDate)
            const filteredTasks = tasks.filter(task => {
                const taskDate = new Date(task.startDate);
                return taskDate >= new Date(startDate) && taskDate <= new Date(endDate);
            });

            if (filteredTasks.length === 0) {
                reportPreview.innerHTML = "<p>No tasks found for the selected criteria.</p>";
                downloadReportBtn.style.display = "none";
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
                downloadReportBtn.style.display = "inline-block";
            }
        } catch (error) {
            console.error("Error fetching tasks for report:", error);
        }
    });

    // Download Report as PDF using jsPDF 
    downloadReportBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.html(reportPreview, {
            callback: function (doc) {
                doc.save("task_report.pdf");
            },
            x: 10,
            y: 10,
            html2canvas: {
                scale: 0.295, 
            }
        });

    });
});
// 