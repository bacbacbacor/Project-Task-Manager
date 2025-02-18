document.addEventListener("DOMContentLoaded", function () {
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
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
            const { managerTasks, employeeTasks } = await response.json();
    
            console.log("✅ Manager's Tasks:", managerTasks);
            console.log("✅ Employee Tasks:", employeeTasks);
    
            // **Render Manager's Tasks**
            document.getElementById("managerTasksTableBody").innerHTML = managerTasks.length === 0
                ? "<tr><td colspan='7'>No tasks assigned.</td></tr>"
                : managerTasks.map(task => `
                    <tr>
                        <td>${task.title}</td>
                        <td>${task.description}</td>
                        <td>${task.startDate}</td>
                        <td>${task.endDate}</td>
                        <td>${task.status}</td>
                        <td>${task.source}</td>
                        <td>
                            <button onclick="editTask(${task.id})">✏️ Edit</button>
                            <button onclick="deleteTask(${task.id})">🗑 Delete</button>
                        </td>
                    </tr>
                `).join("");
    
            // **Render Employees' Tasks**
            document.getElementById("employeeTasksTableBody").innerHTML = employeeTasks.length === 0
                ? "<tr><td colspan='7'>No tasks assigned to employees.</td></tr>"
                : employeeTasks.map(task => `
                    <tr>
                        <td>${task.title}</td>
                        <td>${task.description}</td>
                        <td>${task.startDate}</td>
                        <td>${task.endDate}</td>
                        <td>${task.status}</td>
                        <td>${task.source}</td>
                        <td>
                            <button onclick="editTask(${task.id})">✏️ Edit</button>
                            <button onclick="deleteTask(${task.id})">🗑 Delete</button>
                        </td>
                    </tr>
                `).join("");
        } catch (error) {
            console.error("❌ Error loading tasks:", error);
        }
    }
    
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
            assignedTo: loggedInUser.username,
            createdBy: loggedInUser.username,
            role: loggedInUser.role // Ensure the role is included
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
    
    
    loadAllTasks();
});
