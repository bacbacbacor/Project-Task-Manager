document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000";
    const generateBtn = document.getElementById("generateManagerReportBtn");
    const reportModal = document.getElementById("managerReportModal");
    const userSelect = document.getElementById("managerReportUserSelect");
    const previewBtn = document.getElementById("previewManagerReportBtn");
    const downloadBtn = document.getElementById("downloadManagerReportBtn");
    const closeBtn = document.getElementById("closeManagerReportModalBtn");
    const reportPreview = document.getElementById("managerReportPreview");
    const startDateInput = document.getElementById("managerReportStartDate");
    const endDateInput = document.getElementById("managerReportEndDate");

    generateBtn.addEventListener("click", async () => {
        reportModal.style.display = "block";
        await loadEmployeesForReport();
    });

    closeBtn.addEventListener("click", () => {
        reportModal.style.display = "none";
        reportPreview.innerHTML = "";
        downloadBtn.style.display = "none";
    });

    async function loadEmployeesForReport() {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser || loggedInUser.role !== "Manager") {
            alert("You must be logged in as a Manager.");
            return;
        }
        userSelect.innerHTML = `<option value="self">My Tasks</option>`;

        try {
            const response = await fetch(`${API_URL}/users`);
            if (!response.ok) throw new Error("Failed to load users.");
            const users = await response.json();
            users.forEach(user => {
                if (user.role === "Employee" && user.office.trim().toLowerCase() === loggedInUser.office.trim().toLowerCase()) {
                    let option = document.createElement("option");
                    option.value = user.id;
                    option.textContent = `${user.firstName} ${user.lastName} (${user.role})`;
                    userSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error("Error loading employees for report:", error);
        }
    }

    previewBtn.addEventListener("click", async () => {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser) {
            alert("You must be logged in.");
            return;
        }
        const selectedValue = userSelect.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (!startDate || !endDate) {
            alert("Please select a date range.");
            return;
        }
        try {
            let tasks = [];
            if (selectedValue === "self") {
                const response = await fetch(`${API_URL}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}&office=${encodeURIComponent(loggedInUser.office)}`);
                if (!response.ok) throw new Error("Failed to fetch tasks.");
                tasks = await response.json();
            } else {
                const response = await fetch(`${API_URL}/tasks?userId=${selectedValue}`);
                if (!response.ok) throw new Error("Failed to fetch tasks.");
                tasks = await response.json();
            }
            const filteredTasks = tasks.filter(task => {
                const taskDate = new Date(task.startDate);
                return taskDate >= new Date(startDate) && taskDate <= new Date(endDate);
            });

            if (filteredTasks.length === 0) {
                reportPreview.innerHTML = "<p>No tasks found for the selected criteria.</p>";
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
        }
    });

    downloadBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4"); 

        doc.html(document.getElementById("managerReportPreview"), {
            callback: function (doc) {
                doc.save("manager_task_report.pdf");
            },
            x: 10,
            y: 10,
            width: 180, 
            windowWidth: document.getElementById("managerReportPreview").offsetWidth, 
            html2canvas: {
                scale: 0.295 
            }
        });

    });
});
