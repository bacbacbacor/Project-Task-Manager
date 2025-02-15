document.addEventListener("DOMContentLoaded", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    if (!loggedInUser) {
        window.location.href = "index.html";
        return;
    }

    const taskTable = document.getElementById("taskTable").querySelector("tbody");

    function loadTasks() {
        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        taskTable.innerHTML = ""; // Clear table before loading

        tasks.forEach((task, index) => {
            if (loggedInUser.role === "Employee" && task.assignedTo !== loggedInUser.username) return;
            if (loggedInUser.role === "Manager" && task.office !== loggedInUser.office) return;

            let row = `
                <tr>
                    <td>${task.taskName}</td>
                    <td>${task.assignedTo}</td>
                    <td>
                        <select onchange="updateStatus(${index}, this.value)">
                            <option value="To Do" ${task.status === "To Do" ? "selected" : ""}>To Do</option>
                            <option value="Ongoing" ${task.status === "Ongoing" ? "selected" : ""}>Ongoing</option>
                            <option value="Completed" ${task.status === "Completed" ? "selected" : ""}>Completed</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="editTask(${index})">Edit</button>
                        <button onclick="deleteTask(${index})">Delete</button>
                    </td>
                </tr>
            `;
            taskTable.innerHTML += row;
        });
    }

    function saveTasks(tasks) {
        localStorage.setItem("tasks", JSON.stringify(tasks));
        loadTasks(); // Reload the task list after saving
    }

    window.addTask = function () {
        const taskName = prompt("Enter Task Name:");
        if (!taskName) return;

        const newTask = {
            taskName,
            assignedTo: loggedInUser.username,
            status: "To Do",
            createdDate: new Date().toISOString(),
        };

        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks.push(newTask);
        saveTasks(tasks); // Save & reload tasks
    };

    window.editTask = function (index) {
        let tasks = JSON.parse(localStorage.getItem("tasks"));
        let newName = prompt("Edit Task Name:", tasks[index].taskName);
        if (newName) {
            tasks[index].taskName = newName;
            saveTasks(tasks);
        }
    };

    window.deleteTask = function (index) {
        let tasks = JSON.parse(localStorage.getItem("tasks"));
        if (confirm("Are you sure you want to delete this task?")) {
            tasks.splice(index, 1);
            saveTasks(tasks);
        }
    };

    window.updateStatus = function (index, newStatus) {
        let tasks = JSON.parse(localStorage.getItem("tasks"));
        tasks[index].status = newStatus;
        saveTasks(tasks);
    };

    loadTasks(); // Load tasks on page load
});

