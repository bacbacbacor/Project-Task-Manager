document.addEventListener("DOMContentLoaded", function () {
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
    const taskModal = document.getElementById("taskModal");
    const editTaskModal = document.getElementById("editTaskModal"); 
    const API_URL = "http://localhost:3000/tasks";

    async function loadTasks() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser) {
                alert("You must be logged in.");
                return;
            }

            console.log(`📤 Fetching tasks for user: ${loggedInUser.username}`);

            const response = await fetch(
                `http://localhost:3000/tasks?username=${loggedInUser.username}&role=${loggedInUser.role}`
            );
            if (!response.ok) throw new Error("Failed to fetch tasks.");
            const tasks = await response.json();

            console.log("✅ Tasks received:", tasks);

            taskTable.innerHTML = "";

            if (tasks.length === 0) {
                taskTable.innerHTML = "<tr><td colspan='6'>No tasks assigned.</td></tr>";
                return;
            }

            tasks.forEach(task => {
                let row = `
                    <tr>
                        <td>${task.title}</td>
                        <td>${task.description}</td>
                        <td>${task.startDate}</td>
                        <td>${task.endDate}</td>
                        <td>${task.status}</td>
                        <td>
                            <button onclick="editTask(${task.id})">✏️ Edit</button>
                            <button onclick="deleteTask(${task.id})">🗑 Delete</button>
                        </td>
                    </tr>
                `;
                taskTable.innerHTML += row;
            });
        } catch (error) {
            console.error("❌ Error loading tasks:", error);
        }
    }

    window.openTaskModal = function () {
        taskModal.style.display = "block";
    };

    window.closeTaskModal = function () {
        taskModal.style.display = "none";
    };

    window.addTask = async function () {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser) {
            alert("You must be logged in.");
            return;
        }
    
        const newTask = {
            title: document.getElementById("taskTitle").value.trim(),
            description: document.getElementById("taskDescription").value.trim(),
            startDate: document.getElementById("startDate").value,
            endDate: document.getElementById("endDate").value,
            status: "Pending",
            assignedTo: loggedInUser.username, // Employee assigns to self
            createdBy: loggedInUser.username,
            role: loggedInUser.role // Ensure it passes the role
        };
    
        try {
            const response = await fetch("http://localhost:3000/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask)
            });
    
            if (!response.ok) throw new Error("Failed to add task.");
            alert("Task added successfully!");
    
            loadTasks(); 
            closeTaskModal();
        } catch (error) {
            console.error("❌ Error adding task:", error);
        }
    };
    

    window.editTask = async function (taskId) {
        try {
            console.log(`🛠 Fetching task ${taskId} for editing...`);

            const response = await fetch(`${API_URL}/${taskId}`);
            if (!response.ok) throw new Error("Failed to fetch task details.");
            const task = await response.json();

            console.log("✅ Task data:", task);

            document.getElementById("editTaskId").value = task.id;
            document.getElementById("editTaskTitle").value = task.title;
            document.getElementById("editTaskDescription").value = task.description;
            document.getElementById("editStartDate").value = task.startDate;
            document.getElementById("editEndDate").value = task.endDate;
            document.getElementById("editTaskStatus").value = task.status;

            editTaskModal.style.display = "block"; 
        } catch (error) {
            console.error("❌ Error fetching task details:", error);
        }
    };

    
    window.closeEditTaskModal = function () {
        editTaskModal.style.display = "none";
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
            const response = await fetch(`${API_URL}/${taskId}`, {
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

    window.deleteTask = async function (taskId) {
        try {
            await fetch(`${API_URL}/${taskId}`, { method: "DELETE" });
            loadTasks();
        } catch (error) {
            console.error("❌ Error deleting task:", error);
        }
    };

    loadTasks();
});
