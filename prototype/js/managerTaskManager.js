document.addEventListener("DOMContentLoaded", function () {
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
    const assignedToInput = document.getElementById("assignedTo");
    const assignTaskButton = document.getElementById("assignTaskButton");
    const API_URL = "http://localhost:3000";

    if (!assignTaskButton) {
        console.error("❌ ERROR: Assign Task Button not found in the DOM.");
    } else {
        assignTaskButton.addEventListener("click", assignTask);
        console.log("✅ Assign Task Button linked successfully.");
    }

    async function loadTasks() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser) {
                alert("You must be logged in.");
                return;
            }

            console.log(`📤 Fetching tasks for user: ${loggedInUser.username}`);

            const response = await fetch(`${API_URL}/tasks?username=${loggedInUser.username}&role=${loggedInUser.role}`);
            if (!response.ok) throw new Error("Failed to fetch tasks.");
            let tasks = await response.json();

            console.log("✅ Tasks received:", tasks);

            taskTable.innerHTML = tasks.length === 0
                ? "<tr><td colspan='7'>No tasks assigned.</td></tr>"
                : tasks.map(task => `
                    <tr>
                        <td>${task.title}</td>
                        <td>${task.description}</td>
                        <td>${task.startDate}</td>
                        <td>${task.endDate}</td>
                        <td>${task.status}</td>
                        <td>${task.assignedTo || "Unknown"}</td>
                        <td>
                            <button onclick="deleteTask(${task.id})">🗑 Delete</button>
                        </td>
                    </tr>
                `).join("");
        } catch (error) {
            console.error("❌ Error loading tasks:", error);
        }
    }

    async function assignTask() {
        console.log("📌 Assign Task function triggered.");

        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser || loggedInUser.role !== "Manager") {
            alert("Only Managers can assign tasks.");
            return;
        }

        // Ensure the task title input field is found and its value is captured correctly
        const taskTitleInput = document.getElementById("taskTitle");
        if (!taskTitleInput) {
            console.error("❌ ERROR: Task title input field not found in the DOM.");
            alert("Task title input field is missing.");
            return;
        }

        const taskTitle = taskTitleInput.value.trim();
        console.log("📌 Task Title Retrieved:", taskTitle);

        if (!taskTitle) {
            alert("Task title is required.");
            return;
        }

        const assignedToUsername = document.getElementById("assignedTo").value.trim();
        if (!assignedToUsername) {
            alert("Please enter an employee's username.");
            return;
        }

        const taskDescription = document.getElementById("taskDescription").value.trim();
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;
        const taskStatus = document.getElementById("taskStatus").value || "Pending";

        const newTask = {
            title: taskTitle,
            description: taskDescription,
            startDate: startDate,
            endDate: endDate,
            status: taskStatus,
            assignedTo: assignedToUsername,
            createdBy: loggedInUser.username,
            createdByName: loggedInUser.firstName,
            role: loggedInUser.role
        };

        console.log("📤 Sending Task to API:", newTask);

        try {
            const response = await fetch("http://localhost:3000/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask)
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(`Failed to assign task: ${errorMessage}`);
            }

            alert("✅ Task assigned successfully!");
            loadTasks();
            closeAssignTaskModal();
        } catch (error) {
            console.error("❌ Error assigning task:", error);
            alert(`Task assignment failed: ${error.message}`);
        }
    }

    window.editTask = async function (taskId) {
        try {
            console.log(`🛠 Fetching task ${taskId} for editing...`);
    
            const response = await fetch(`http://localhost:3000/tasks/${taskId}`);
            if (!response.ok) throw new Error("Failed to fetch task details.");
            const task = await response.json();
    
            console.log("✅ Task data:", task);
    
            document.getElementById("editTaskId").value = task.id;
            document.getElementById("editTaskTitle").value = task.title;
            document.getElementById("editTaskDescription").value = task.description;
            document.getElementById("editStartDate").value = task.startDate;
            document.getElementById("editEndDate").value = task.endDate;
            document.getElementById("editTaskStatus").value = task.status;
    
            document.getElementById("editTaskModal").style.display = "block"; 
        } catch (error) {
            console.error("❌ Error fetching task details:", error);
        }
    };

    window.updateTask = async function () {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        const taskId = document.getElementById("editTaskId").value;
    
        const updatedTask = {
            username: loggedInUser.username, 
            title: document.getElementById("editTaskTitle").value.trim(),
            description: document.getElementById("editTaskDescription").value.trim(),
            startDate: document.getElementById("editStartDate").value,
            endDate: document.getElementById("editEndDate").value,
            status: document.getElementById("editTaskStatus").value
        };
    
        try {
            const response = await fetch(`http://localhost:3000/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedTask)
            });
    
            if (!response.ok) throw new Error("Failed to update task.");
            const data = await response.json();
            console.log("Task updated:", data);
    
            loadTasks();
            closeEditTaskModal();
        } catch (error) {
            console.error("❌ Error updating task:", error);
        }
    };
    
    window.closeEditTaskModal = function () {
        document.getElementById("editTaskModal").style.display = "none";
    };

    document.addEventListener("DOMContentLoaded", function () {
        const API_URL = "http://localhost:3000/tasks";
        const previewContainer = document.getElementById("previewReport");
        const downloadBtn = document.getElementById("downloadReport");
        const reportModal = document.getElementById("reportModal");
        const closeModalBtn = document.getElementById("closeReportModal");
    
        function openReportModal() {
            reportModal.style.display = "block";
        }
    
        function closeReportModal() {
            reportModal.style.display = "none";
        }
    
        closeModalBtn.addEventListener("click", closeReportModal);
    
        async function fetchTasksForReport(userType, userIdentifier, startDate, endDate) {
            try {
                let url = `${API_URL}?startDate=${startDate}&endDate=${endDate}`;
    
                if (userType === "Admin") {
                    url += `&username=${userIdentifier}`; // Admin selects Manager/Employee
                } else {
                    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
                    url += `&username=${loggedInUser.username}`;
                }
    
                const response = await fetch(url);
                if (!response.ok) throw new Error("Failed to fetch tasks.");
                return await response.json();
            } catch (error) {
                console.error("❌ Error fetching tasks for report:", error);
                return [];
            }
        }
    
        window.previewReport = async function () {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            const userType = loggedInUser.role;
            let userIdentifier = "";
    
            if (userType === "Admin") {
                userIdentifier = document.getElementById("selectUser").value || "";
            }
    
            const startDate = document.getElementById("startDate").value;
            const endDate = document.getElementById("endDate").value;
    
            if (!startDate || !endDate) {
                alert("Please select a valid date range.");
                return;
            }
    
            const tasks = await fetchTasksForReport(userType, userIdentifier, startDate, endDate);
    
            if (tasks.length === 0) {
                previewContainer.innerHTML = "<p>No tasks found for the selected period.</p>";
                return;
            }
    
            let html = `<h3>Task Report (${startDate} - ${endDate})</h3><table border='1'><tr>
                <th>Title</th><th>Description</th><th>Status</th><th>Assigned To</th><th>Start Date</th><th>End Date</th>
            </tr>`;
    
            tasks.forEach(task => {
                html += `<tr>
                    <td>${task.title}</td>
                    <td>${task.description}</td>
                    <td>${task.status}</td>
                    <td>${task.assignedTo}</td>
                    <td>${task.startDate}</td>
                    <td>${task.endDate}</td>
                </tr>`;
            });
    
            html += "</table>";
            previewContainer.innerHTML = html;
            downloadBtn.style.display = "block";
        };
    
        window.generatePDF = function () {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text("Task Report", 10, 10);
            doc.autoTable({ html: "#previewReport table" });
            doc.save("Task_Report.pdf");
        };
    
       
    });
    

document.addEventListener("DOMContentLoaded", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser.role !== "Admin") {
        document.getElementById("adminUserSelection").style.display = "none";
    }
});


    loadTasks();
});

function openAssignTaskModal() {
    const modal = document.getElementById("assignTaskModal");
    if (modal) {
        modal.style.display = "block";
        console.log("✅ Assign Task Modal Opened");
    } else {
        console.error("❌ ERROR: Assign Task Modal not found in DOM.");
    }
}

function closeAssignTaskModal() {
    const modal = document.getElementById("assignTaskModal");
    if (modal) {
        modal.style.display = "none";
        console.log("✅ Assign Task Modal Closed");
    } else {
        console.error("❌ ERROR: Assign Task Modal not found in DOM.");
    }
}

window.openAssignTaskModal = openAssignTaskModal;
window.closeAssignTaskModal = closeAssignTaskModal;
window.assignTask = assignTask;
window.editTask = editTask;
window.updateTask = updateTask;

document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000/tasks";
    const previewContainer = document.getElementById("previewReport");
    const downloadBtn = document.getElementById("downloadReport");
    const reportModal = document.getElementById("reportModal");
    const closeModalBtn = document.getElementById("closeReportModal");

    function openReportModal() {
        if (reportModal) {
            reportModal.style.display = "block";
        } else {
            console.error("❌ ERROR: Report modal not found in DOM.");
        }
    }

    function closeReportModal() {
        if (reportModal) {
            reportModal.style.display = "none";
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", closeReportModal);
    } else {
        console.error("❌ ERROR: Close button not found.");
    }

    async function fetchTasksForReport(startDate, endDate) {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser) {
                alert("You must be logged in.");
                return [];
            }

            let url = `${API_URL}?startDate=${startDate}&endDate=${endDate}&username=${loggedInUser.username}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch tasks.");
            return await response.json();
        } catch (error) {
            console.error("❌ Error fetching tasks for report:", error);
            return [];
        }
    }

    window.previewReport = async function () {
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;

        if (!startDate || !endDate) {
            alert("Please select a valid date range.");
            return;
        }

        const tasks = await fetchTasksForReport(startDate, endDate);

        if (tasks.length === 0) {
            previewContainer.innerHTML = "<p>No tasks found for the selected period.</p>";
            return;
        }

        let html = `<h3>Task Report (${startDate} - ${endDate})</h3><table border='1'><tr>
            <th>Title</th><th>Description</th><th>Status</th><th>Assigned To</th><th>Start Date</th><th>End Date</th>
        </tr>`;

        tasks.forEach(task => {
            html += `<tr>
                <td>${task.title}</td>
                <td>${task.description}</td>
                <td>${task.status}</td>
                <td>${task.assignedTo}</td>
                <td>${task.startDate}</td>
                <td>${task.endDate}</td>
            </tr>`;
        });

        html += "</table>";
        previewContainer.innerHTML = html;
        downloadBtn.style.display = "block";
    };

    window.generatePDF = function () {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Task Report", 10, 10);
        doc.autoTable({ html: "#previewReport table" });
        doc.save("Task_Report.pdf");
    };

 
    window.closeReportModal = closeReportModal;
});

window.openReportModal = openReportModal;