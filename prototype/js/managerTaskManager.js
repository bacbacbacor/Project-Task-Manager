document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000";
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
    const assignTaskButton = document.getElementById("assignTaskButton");

    if (!assignTaskButton) {
        console.error("❌ ERROR: Assign Task Button not found in the DOM.");
    } else {
        assignTaskButton.addEventListener("click", assignTask);
        console.log("✅ Assign Task Button linked successfully.");
    }

    // ✅ Load tasks for Manager
    async function loadTasks() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser) {
                alert("You must be logged in.");
                return;
            }

            console.log(`📡 Fetching tasks for Manager: ${loggedInUser.username}`);

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

    // ✅ Assign Task (Manager to Employee in the Same Office)
    async function assignTask() {
        console.log("📌 Assign Task function triggered.");
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    
        if (!loggedInUser || loggedInUser.role !== "Manager") {
            alert("❌ Only Managers can assign tasks.");
            return;
        }
    
        // ✅ Get the correct input fields for "Assign Task" Modal
        const taskTitleInput = document.getElementById("assignTaskTitle");
        if (!taskTitleInput) {
            console.error("❌ ERROR: Assign Task title input field not found.");
            alert("Assign Task title input field is missing.");
            return;
        }
    
        const taskTitle = taskTitleInput.value.trim();
        console.log("🔍 Title Retrieved:", taskTitle);
    
        const taskDescription = document.getElementById("assignTaskDescription").value.trim();
        const startDate = document.getElementById("assignStartDate").value;
        const endDate = document.getElementById("assignEndDate").value;
        const taskStatus = document.getElementById("assignTaskStatus").value || "Pending";
        const assignedTo = document.getElementById("assignedTo").value;
    
        if (!taskTitle) {
            alert("⚠ Task title is required.");
            return;
        }
        if (!taskDescription) {
            alert("⚠ Task description is required.");
            return;
        }
        if (!startDate) {
            alert("⚠ Start date is required.");
            return;
        }
        if (!endDate) {
            alert("⚠ End date is required.");
            return;
        }
        if (!assignedTo) {
            alert("⚠ You must assign this task to an employee.");
            return;
        }
    
        const newTask = {
            title: taskTitle,
            description: taskDescription,
            startDate,
            endDate,
            status: taskStatus,
            assignedTo,
            createdBy: loggedInUser.id
        };
    
        console.log("🚀 Sending Task to API:", newTask);
    
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
            document.getElementById("assignTaskModal").style.display = "none";
            loadTasks();
        } catch (error) {
            console.error("❌ Error assigning task:", error);
            alert(`Task assignment failed: ${error.message}`);
        }
    }
    
    

    // ✅ Load employees for Manager (Only from the same office)
    async function loadUsersForManager() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser || loggedInUser.role !== "Manager") {
                console.error("Manager not found or incorrect role.");
                return;
            }
    
            const response = await fetch(`${API_URL}/users`);
            if (!response.ok) throw new Error("Failed to fetch users.");
    
            const users = await response.json();
            const assignedToSelect = document.getElementById("assignedTo");
            assignedToSelect.innerHTML = '<option value="">Select User</option>';
    
            users.forEach(user => {
                // Include both employees and managers from the same office, excluding the logged-in manager
                if (user.office === loggedInUser.office && user.id !== loggedInUser.id) {
                    let option = document.createElement("option");
                    option.value = user.id;
                    option.textContent = `${user.firstName} (${user.role})`;
                    assignedToSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error("Error loading users:", error);
        }
    }
    

    // ✅ Open Assign Task Modal
    window.openAssignTaskModal = function () {
        document.getElementById("assignTaskModal").style.display = "block";
        loadUsersForManager();
    };

    // ✅ Close Assign Task Modal
    window.closeAssignTaskModal = function () {
        document.getElementById("assignTaskModal").style.display = "none";
    };

    // ✅ Delete Task
    window.deleteTask = async function (taskId) {
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: "DELETE" });
            loadTasks();
        } catch (error) {
            console.error("❌ Error deleting task:", error);
        }
    };

    // ✅ Load tasks when the page loads
    loadTasks();
});

// ✅ Ensure the Assign Task Modal functions are accessible globally
window.openAssignTaskModal = openAssignTaskModal;
window.closeAssignTaskModal = closeAssignTaskModal;
window.assignTask = assignTask;
window.deleteTask = deleteTask;
