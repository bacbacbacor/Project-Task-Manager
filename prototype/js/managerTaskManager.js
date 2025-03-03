document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000";
    const taskTable = document.getElementById("taskTable").querySelector("tbody");

    // Load tasks for Manager
    async function loadTasks() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser) {
                alert("You must be logged in.");
                return;
            }
            console.log("Logged In User:", loggedInUser);
            const url = `${API_URL}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}&office=${loggedInUser.office}`;
            console.log("Fetching tasks from:", url);
            fetch(url)
                .then(response => response.json())
                .then(tasks => {
                    console.log("✅ Tasks fetched from API:", tasks);
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
                })
                .catch(error => console.error("Error loading tasks:", error));
        } catch (error) {
            console.error("❌ Error loading tasks:", error);
        }
    }

    // Assign Task (Manager to Employee in the Same Office)
    async function assignTask() {
        console.log("📌 Assign Task function triggered.");
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser || loggedInUser.role !== "Manager") {
            alert("❌ Only Managers can assign tasks.");
            return;
        }
        // Get values from the assign task modal
        const taskTitle = document.getElementById("assignTaskTitle").value.trim();
        const taskDescription = document.getElementById("assignTaskDescription").value.trim();
        const startDate = document.getElementById("assignStartDate").value;
        const endDate = document.getElementById("assignEndDate").value;
        const taskStatus = document.getElementById("assignTaskStatus").value || "Pending";
        const assignedTo = document.getElementById("assignedTo").value; // Must be numeric ID

        if (!taskTitle || !taskDescription || !startDate || !endDate || !assignedTo) {
            alert("Please fill in all required fields.");
            return;
        }

        const newTask = {
            title: taskTitle,
            description: taskDescription,
            startDate,
            endDate,
            status: taskStatus,
            assignedTo: assignedTo,
            createdBy: loggedInUser.id
        };

        console.log("🚀 Sending Task to API:", newTask);
        try {
            const response = await fetch(`${API_URL}/tasks`, {
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

    // Load employees for Manager (only those in the same office)
    async function loadUsersForManager() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser || loggedInUser.role !== "Manager") {
                console.error("Manager not found or incorrect role.");
                return;
            }
            const response = await fetch("http://localhost:3000/users");
            if (!response.ok) throw new Error("Failed to fetch users.");
            const users = await response.json();
            const assignedToSelect = document.getElementById("assignedTo");
            assignedToSelect.innerHTML = '<option value="">Select User</option>';
            users.forEach(user => {
                // Only include employees in the same office (exclude managers and self)
                if (user.office === loggedInUser.office && user.role === "Employee") {
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

    // Make loadUsersForManager globally accessible
    window.loadUsersForManager = loadUsersForManager;

    // Delete Task
    window.deleteTask = async function (taskId) {
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: "DELETE" });
            loadTasks();
        } catch (error) {
            console.error("❌ Error deleting task:", error);
        }
    };

    // Load tasks on page load
    loadTasks();

    // Make assignTask globally accessible
    window.assignTask = assignTask;
});

// Open and Close Assign Task Modal (now defined globally)
window.openAssignTaskModal = function () {
    document.getElementById("assignTaskModal").style.display = "block";
    window.loadUsersForManager(); // use the globally accessible function
};

window.closeAssignTaskModal = function () {
    document.getElementById("assignTaskModal").style.display = "none";
};
