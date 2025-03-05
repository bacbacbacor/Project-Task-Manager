document.addEventListener("DOMContentLoaded", function () {
    const taskTable = document.getElementById("taskTable").querySelector("tbody");
    const taskModal = document.getElementById("taskModal");
    const editTaskModal = document.getElementById("editTaskModal");
    const API_URL = "http://localhost:3000/tasks";

    async function loadTasks() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            console.log("Logged in user:", loggedInUser);
            // Ensure all required properties exist
            if (!loggedInUser || !loggedInUser.id || !loggedInUser.role || !loggedInUser.office) {
                alert("You must be logged in with proper credentials.");
                return;
            }
            // Corrected: remove the extra '/tasks' from the URL
            const url = `${API_URL}?userId=${loggedInUser.id}&role=${loggedInUser.role}&office=${encodeURIComponent(loggedInUser.office)}`;
            console.log("Fetching tasks from:", url);
            const response = await fetch(url);
            const tasks = await response.json();
            console.log("Tasks fetched:", tasks);

            if (tasks.length === 0) {
                taskTable.innerHTML = "<tr><td colspan='8'>No tasks assigned.</td></tr>";
            } else {
                taskTable.innerHTML = tasks.map(task => `
                    <tr>
                        <td>${task.title}</td>
                        <td>${task.description}</td>
                        <td>${new Date(task.startDate).toLocaleDateString()}</td>
                        <td>${new Date(task.endDate).toLocaleDateString()}</td>
                        <td>${task.status}</td>
                        <td>${task.createdBy || "Unknown"}</td>
                        <td>${task.assignedTo || "Unknown"}</td>
                        <td>
                            <button onclick="editTask(${task.id})">✏️ Edit</button>
                            <button onclick="deleteTask(${task.id})">🗑 Delete</button>
                        </td>
                    </tr>
                `).join("");
            }
            
        } catch (error) {
            console.error("Error loading tasks:", error);
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
            status: document.getElementById("taskStatus").value || "Pending",
            assignedTo: loggedInUser.id,
            createdBy: loggedInUser.id,
            role: loggedInUser.role
        };

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask)
            });
            if (!response.ok) throw new Error("Failed to add task.");
            alert("Task added successfully!");
            loadTasks();
            closeTaskModal();
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Error adding task: " + error.message);
        }
    };

    window.openTaskModal = function () {
        taskModal.style.display = "block";
    };

    window.closeTaskModal = function () {
        taskModal.style.display = "none";
    };

    window.editTask = async function (taskId) {
        try {
          console.log(`Fetching task ${taskId} for editing...`);
          const response = await fetch(`${API_URL}/${taskId}`);
          if (!response.ok) throw new Error("Failed to fetch task details.");
          const task = await response.json();
          console.log("Task data:", task);
      
          // Populate the fields for editing
          document.getElementById("editTaskId").value = task.id;
          document.getElementById("editTaskTitle").value = task.title;
          document.getElementById("editTaskDescription").value = task.description;
          document.getElementById("editStartDate").value = task.startDate ? task.startDate.split("T")[0] : "";
          document.getElementById("editEndDate").value = task.endDate ? task.endDate.split("T")[0] : "";
          document.getElementById("editTaskStatus").value = task.status;
          
          // Instead of loading a dropdown for assignedTo, store it in a global variable
          window.currentTaskAssignedTo = task.assignedTo;
      
          // Show the edit modal
          document.getElementById("editTaskModal").style.display = "block";
        } catch (error) {
          console.error("Error fetching task details:", error);
        }
      };
      

    window.closeEditTaskModal = function () {
        editTaskModal.style.display = "none";
    };

    window.updateTask = async function () {
        const taskId = document.getElementById("editTaskId").value;
      
        const updatedTask = {
          title: document.getElementById("editTaskTitle").value.trim(),
          description: document.getElementById("editTaskDescription").value.trim(),
          startDate: document.getElementById("editStartDate").value,
          endDate: document.getElementById("editEndDate").value,
          status: document.getElementById("editTaskStatus").value,
          // Use the stored assignedTo value
          assignedTo: window.currentTaskAssignedTo || null
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
          console.error("Error updating task:", error);
        }
      };
      

    window.deleteTask = async function(taskId) {
        try {
            await fetch(`${API_URL}/${taskId}`, { method: "DELETE" });
            loadTasks();
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    loadTasks();
});
