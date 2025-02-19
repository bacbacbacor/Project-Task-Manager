document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000/tasks";
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
    const assignTaskModal = document.getElementById("assignTaskModal");

    
    async function loadAllTasks() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser || (loggedInUser.role !== "Admin" && loggedInUser.role !== "Manager")) {
                alert("Access denied. Only Admins and Managers can view tasks.");
                return;
            }

            console.log(`📤 Fetching tasks for ${loggedInUser.role}: ${loggedInUser.username}`);

            const response = await fetch(`${API_URL}?username=${loggedInUser.username}&role=${loggedInUser.role}`);
            if (!response.ok) throw new Error("Failed to fetch tasks.");
            const tasks = await response.json();

            console.log("✅ Tasks received:", tasks);

            taskTable.innerHTML = "";

            if (tasks.length === 0) {
                taskTable.innerHTML = "<tr><td colspan='8'>No tasks available.</td></tr>";
                return;
            }

            tasks.forEach(task => {
                let row = `
                    <tr>
                        <td>${task.id}</td>
                        <td>${task.title}</td>
                        <td>${task.description}</td>
                        <td>${task.startDate}</td>
                        <td>${task.endDate}</td>
                        <td>${task.status}</td>
                        <td>${task.assignedTo}</td>
                        <td>${task.createdBy}</td>
                        <td>
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

    
    window.openAssignTaskModal = function () {
        assignTaskModal.style.display = "block";
    };

    
    window.closeAssignTaskModal = function () {
        assignTaskModal.style.display = "none";
    };


    window.assignTask = async function () {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser || (loggedInUser.role !== "Admin" && loggedInUser.role !== "Manager")) {
            alert("Access denied. Only Admins and Managers can assign tasks.");
            return;
        }

        const newTask = {
            title: document.getElementById("taskTitle").value.trim(),
            description: document.getElementById("taskDescription").value.trim(),
            startDate: document.getElementById("startDate").value,
            endDate: document.getElementById("endDate").value,
            status: document.getElementById("taskStatus").value,
            assignedTo: document.getElementById("assignedTo").value.trim(),
            createdBy: loggedInUser.firstName,
            role: loggedInUser.role
        };

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask)
            });

            if (!response.ok) throw new Error("Failed to assign task.");
            const data = await response.json();
            console.log("✅ Task assigned:", data);

            alert("Task assigned successfully!");
            document.getElementById("assignTaskForm").reset();
            closeAssignTaskModal();
            loadAllTasks(); 
        } catch (error) {
            console.error("❌ Error assigning task:", error);
        }
    };

    window.deleteTask = async function (taskId) {
        try {
            await fetch(`${API_URL}/${taskId}`, { method: "DELETE" });
            loadAllTasks();
        } catch (error) {
            console.error("❌ Error deleting task:", error);
        }
    };

    loadAllTasks();
});
