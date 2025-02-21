document.addEventListener("DOMContentLoaded", function () {
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
    const assignedToInput = document.getElementById("assignedTo");
    const assignTaskButton = document.getElementById("assignTaskButton");
    const API_URL = "http://localhost:3000";

    if (!assignTaskButton) {
        console.error("ERROR: Assign Task Button not found in the DOM.");
    } else {
        assignTaskButton.addEventListener("click", assignTask);
        console.log("Assign Task Button linked successfully.");
    }

    async function loadTasks() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser) {
                alert("You must be logged in.");
                return;
            }

            console.log(`Fetching tasks for user: ${loggedInUser.username}`);

            const response = await fetch(`${API_URL}/tasks?username=${loggedInUser.username}&role=${loggedInUser.role}`);
            if (!response.ok) throw new Error("Failed to fetch tasks.");
            let tasks = await response.json();

            console.log("Tasks received:", tasks);

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
            console.error("Error loading tasks:", error);
        }
    }

    async function assignTask() {
        console.log("Assign Task function triggered.");
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser || loggedInUser.role !== "Manager") {
            alert("Only Managers can assign tasks.");
            return;
        }

        let taskTitleInput = document.querySelector("#assignTaskModal #taskTitle"); // More specific selector
        if (!taskTitleInput) {
            console.error("ERROR: Task title input field not found.");
            alert("Task title input field is missing.");
            return;
        }

        const taskTitle = taskTitleInput.value.trim();
        if (!taskTitle) {
            alert("Task title is required.");
            return;
        }



        const assignedToUsername = document.getElementById("assignedTo").value.trim();
        if (!assignedToUsername) {
            alert("Please enter an employee's username.");
            return;
        }

        const taskDescription = document.querySelector("#assignTaskModal #taskDescription").value.trim();
        const startDate = document.querySelector("#assignTaskModal #startDate").value;
        const endDate = document.querySelector("#assignTaskModal #endDate").value;
        const taskStatus = document.querySelector("#assignTaskModal #taskStatus").value || "Pending";

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

        console.log("Sending Task to API:", newTask);

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

            alert("Task assigned successfully!");
            loadTasks();
            closeAssignTaskModal();
        } catch (error) {
            console.error("Error assigning task:", error);
            alert(`Task assignment failed: ${error.message}`);
        }
    }

    window.editTask = async function (taskId) {
        try {
            console.log(`🛠 Fetching task ${taskId} for editing...`);

            const response = await fetch(`http://localhost:3000/tasks/${taskId}`);
            if (!response.ok) throw new Error("Failed to fetch task details.");
            const task = await response.json();

            console.log("Task data:", task);

            document.getElementById("editTaskId").value = task.id;
            document.getElementById("editTaskTitle").value = task.title;
            document.getElementById("editTaskDescription").value = task.description;
            document.getElementById("editStartDate").value = task.startDate;
            document.getElementById("editEndDate").value = task.endDate;
            document.getElementById("editTaskStatus").value = task.status;

            document.getElementById("editTaskModal").style.display = "block";
        } catch (error) {
            console.error("Error fetching task details:", error);
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
            console.error("Error updating task:", error);
        }
    };

    window.closeEditTaskModal = function () {
        document.getElementById("editTaskModal").style.display = "none";
    };

    // Fetch employees for Manager (Only from the same office)
async function loadUsersForManager() {
    try {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        const response = await fetch("http://localhost:3000/users");
        if (!response.ok) throw new Error("Failed to fetch users.");

        const users = await response.json();
        const assignedToSelect = document.getElementById("assignedTo");
        assignedToSelect.innerHTML = '<option value="">Select Employee</option>';

        users.forEach(user => {
            if (user.role === "Employee" && user.office === loggedInUser.office) {
                let option = document.createElement("option");
                option.value = user.username;
                option.textContent = `${user.firstName}`;
                assignedToSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error("Error loading employees:", error);
    }
}

// Call function when modal opens
window.openAssignTaskModal = function () {
    document.getElementById("assignTaskModal").style.display = "block";
    loadUsersForManager();
};




    loadTasks();
});

function openAssignTaskModal() {
    const modal = document.getElementById("assignTaskModal");
    if (modal) {
        modal.style.display = "block";
        console.log("Assign Task Modal Opened");
    } else {
        console.error("ERROR: Assign Task Modal not found in DOM.");
    }
}

function closeAssignTaskModal() {
    const modal = document.getElementById("assignTaskModal");
    if (modal) {
        modal.style.display = "none";
        console.log("Assign Task Modal Closed");
    } else {
        console.error("ERROR: Assign Task Modal not found in DOM.");
    }
}

window.openAssignTaskModal = openAssignTaskModal;
window.closeAssignTaskModal = closeAssignTaskModal;
window.assignTask = assignTask;
window.editTask = editTask;
window.updateTask = updateTask;
