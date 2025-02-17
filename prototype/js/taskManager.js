document.addEventListener("DOMContentLoaded", function () {
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
    const taskModal = document.getElementById("taskModal");
    const API_URL = "http://localhost:3000/tasks";

    async function loadTasks() {
        try {
            const response = await fetch(API_URL);
            const tasks = await response.json();

            taskTable.innerHTML = "";
            tasks.forEach(task => {
                let row = `
                    <tr>
                        <td>${task.title}</td>
                        <td>${task.description}</td>
                        <td>${task.startDate}</td>
                        <td>${task.endDate}</td>
                        <td>${task.status}</td>
                        <td>
                            <button onclick="deleteTask(${task.id})">🗑 Delete</button>
                        </td>
                    </tr>
                `;
                taskTable.innerHTML += row;
            });
        } catch (error) {
            console.error("Error loading tasks:", error);
        }
    }

    window.openTaskModal = function () {
        taskModal.style.display = "block";
    };

    window.closeTaskModal = function () {
        taskModal.style.display = "none";
    };

    window.addTask = async function () {
        const newTask = {
            title: document.getElementById("taskTitle").value.trim(),
            description: document.getElementById("taskDescription").value.trim(),
            startDate: document.getElementById("startDate").value,
            endDate: document.getElementById("endDate").value,
            status: document.getElementById("taskStatus").value,
            assignedTo: JSON.parse(localStorage.getItem("loggedInUser")).username,
            createdBy: JSON.parse(localStorage.getItem("loggedInUser")).username
        };

        try {
            await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask)
            });

            loadTasks();
            closeTaskModal();
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    window.deleteTask = async function (taskId) {
        try {
            await fetch(`${API_URL}/${taskId}`, { method: "DELETE" });
            loadTasks();
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    loadTasks();
});
