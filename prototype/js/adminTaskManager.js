document.addEventListener("DOMContentLoaded", function () {
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
    const API_URL = "http://localhost:3000/tasks";

    async function loadAllTasks() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (!loggedInUser || loggedInUser.role !== "Admin") {
                alert("Access denied. Only Admins can view all tasks.");
                return;
            }

            console.log(`📤 Fetching all tasks as Admin: ${loggedInUser.username}`);

            const response = await fetch(`${API_URL}?username=${loggedInUser.username}&role=Admin`);
            if (!response.ok) throw new Error("Failed to fetch tasks.");
            const tasks = await response.json();

            console.log("✅ All tasks received:", tasks);

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
