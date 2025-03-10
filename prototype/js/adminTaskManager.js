

// Move the loadUsersForAdminAssign function to global scope and parameterize it
window.loadUsersForAdminAssign = async function(dropdownId) {
    try {
        const response = await fetch("http://localhost:3000/users");
        if (!response.ok) throw new Error("Failed to fetch users.");
        const users = await response.json();
        const assignedToSelect = document.getElementById(dropdownId);
        assignedToSelect.innerHTML = '<option value="">Select User</option>';
        users.forEach(user => {
            // Exclude Admins if desired, or include managers & employees
            if (user.role !== "Admin") {
                let option = document.createElement("option");
                option.value = user.id;
                option.textContent = `${user.firstName} (${user.role})`;
                assignedToSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error("Error loading users for task assignment:", error);
    }
};

// Open Assign Task Modal using the correct dropdown ID
window.openAssignTaskModal = async function () {
    document.getElementById("assignTaskModal").style.display = "block";
    // Populate the dropdown with ID "assignTaskAssignedTo"
    await window.loadUsersForAdminAssign("assignTaskAssignedTo");
};

window.closeAssignTaskModal = function () {
    document.getElementById("assignTaskModal").style.display = "none";
};


document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000";

    // Load all tasks from MySQL
    function loadAllTasks() {
        fetch(`${API_URL}/tasks`)
            .then(response => response.json())
            .then(tasks => {
                const taskTableBody = document.getElementById("taskTableBody");
                taskTableBody.innerHTML = ""; // Clear existing data

                tasks.forEach(task => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${task.id}</td>
                        <td>${task.title}</td>
                        <td>${task.description}</td>
                        <td>${new Date(task.startDate).toLocaleDateString()}</td>
                        <td>${new Date(task.endDate).toLocaleDateString()}</td>
                        <td>${task.status}</td>
                        <td>${task.assignedTo || "Unassigned"}</td>
                        <td>${task.createdBy}</td>
                        <td>
                            <button onclick="editTask(${task.id})">✏️ Edit</button>
                            <button onclick="deleteTask(${task.id})">🗑 Delete</button>
                        </td>
                    `;
                    taskTableBody.appendChild(row);
                });
            })
            .catch(error => console.error("Error loading tasks:", error));
    }

    // Delete Task
    window.deleteTask = async function (taskId) {
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: "DELETE" });
            loadAllTasks();
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    // Define assignTask function to create a new task assignment
    window.assignTask = async function () {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser) {
            alert("You must be logged in.");
            return;
        }

        // Get values from the assign task modal
        const title = document.getElementById("taskTitle").value.trim();
        const description = document.getElementById("taskDescription").value.trim();
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;
        const status = document.getElementById("taskStatus").value;
        const assignedTo = document.getElementById("assignTaskAssignedTo").value; // Note the updated ID

        if (!title || !startDate || !endDate || !status || !assignedTo) {
            alert("Please fill in all required fields.");
            return;
        }

        const newTask = {
            title,
            description,
            startDate,
            endDate,
            status,
            assignedTo,         // this should be a user ID from the dropdown
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
            loadAllTasks();
        } catch (error) {
            console.error("Error assigning task:", error);
            alert(`Task assignment failed: ${error.message}`);
        }
    };

    // Open the Edit Task Modal & Load Task Data
    window.editTask = async function (taskId) {
        console.log("📝 Editing Task:", taskId);

        try {
            const response = await fetch(`${API_URL}/tasks/${taskId}`);
            const task = await response.json();

            if (!response.ok) {
                throw new Error(task.message || "Failed to fetch task details.");
            }

            // Get the modal elements using unique IDs for edit modal dropdown
            const titleInput = document.getElementById("editTaskTitle");
            const descriptionInput = document.getElementById("editTaskDescription");
            const startDateInput = document.getElementById("editStartDate");
            const endDateInput = document.getElementById("editEndDate");
            const statusInput = document.getElementById("editTaskStatus");
            const assignedToInput = document.getElementById("editTaskAssignedTo");

            if (!titleInput || !descriptionInput || !startDateInput || !endDateInput || !statusInput || !assignedToInput) {
                throw new Error("Edit Task Modal elements not found.");
            }

            // Populate the fields
            titleInput.value = task.title || "";
            descriptionInput.value = task.description || "";
            startDateInput.value = task.startDate ? task.startDate.split("T")[0] : "";
            endDateInput.value = task.endDate ? task.endDate.split("T")[0] : "";
            statusInput.value = task.status || "Pending";
            // Set assignedTo value if available; otherwise, leave it blank
            assignedToInput.value = task.assignedTo || "";

            // Show the modal
            document.getElementById("editTaskModal").style.display = "block";

            // Attach the task ID to the update button
            document.getElementById("updateTaskBtn").setAttribute("data-task-id", taskId);

            // Load users into the edit modal dropdown (with unique ID)
            await window.loadUsersForAdminAssign("editTaskAssignedTo");
        } catch (error) {
            console.error("❌ Error loading task:", error);
            alert("Error loading task. Check console for details.");
        }
    };

    // Close Edit Task Modal
    window.closeEditTaskModal = function () {
        console.log("❌ Closing Edit Task Modal.");
        document.getElementById("editTaskModal").style.display = "none";
    };

    // Save Edited Task
    document.getElementById("updateTaskBtn").addEventListener("click", async function () {
        const taskId = this.getAttribute("data-task-id");

        const updatedTask = {
            title: document.getElementById("editTaskTitle").value.trim(),
            description: document.getElementById("editTaskDescription").value.trim(),
            startDate: document.getElementById("editStartDate").value,
            endDate: document.getElementById("editEndDate").value,
            status: document.getElementById("editTaskStatus").value,
            assignedTo: document.getElementById("editTaskAssignedTo").value || null
        };

        console.log("🚀 Sending updated task to server:", updatedTask);

        if (!updatedTask.title || !updatedTask.startDate || !updatedTask.endDate || !updatedTask.status || !updatedTask.assignedTo) {
            alert("Please fill in all required fields, including 'Assign to'.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedTask)
            });

            const responseData = await response.json();
            console.log("📡 Server Response:", responseData);

            if (!response.ok) throw new Error(responseData.message || "Failed to update task.");
            alert("✅ Task updated successfully!");
            document.getElementById("editTaskModal").style.display = "none";
            loadAllTasks();
        } catch (error) {
            console.error("Error updating task:", error);
            alert("Error updating task. Check console for details.");
        }
    });

    // Load tasks on page load
    loadAllTasks();
    // Also, load users into the assign task modal on page load (optional)
    window.loadUsersForAdminAssign("assignTaskAssignedTo");
}); 