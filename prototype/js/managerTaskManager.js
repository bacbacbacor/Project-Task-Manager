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
            <td>${task.createdBy || "Unknown"}</td>
            <td>${task.assignedTo || "Unknown"}</td>
            

            <td>
                <button onclick="editTask(${task.id})">✏️ Edit</button>
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

    window.editTask = async function(taskId) {
        try {
          const response = await fetch(`${API_URL}/tasks/${taskId}`);
          if (!response.ok) throw new Error("Failed to fetch task details.");
          const task = await response.json();
          
          // Populate modal fields
          document.getElementById("editTaskId").value = task.id;
          document.getElementById("editTaskTitle").value = task.title;
          document.getElementById("editTaskDescription").value = task.description;
          document.getElementById("editStartDate").value = task.startDate ? task.startDate.split("T")[0] : "";
          document.getElementById("editEndDate").value = task.endDate ? task.endDate.split("T")[0] : "";
          document.getElementById("editTaskStatus").value = task.status;
          
          // Save the current assignedTo value
          window.currentTaskAssignedTo = task.assignedTo;
          
          document.getElementById("editTaskModal").style.display = "block";
        } catch (error) {
          console.error("Error fetching task details for editing:", error);
          alert("Error loading task for editing.");
        }
      };


       // Load only employees from the same office as the logged-in manager.
  window.loadEmployeesForManager = async function () {
    try {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!loggedInUser || loggedInUser.role !== "Manager") {
        console.error("Manager not logged in or incorrect role.");
        return;
      }
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) throw new Error("Failed to fetch users.");
      const users = await response.json();
      const employeeSelect = document.getElementById("managerAssignEmployeeSelect");
      employeeSelect.innerHTML = '<option value="">Select Employee</option>';
      users.forEach(user => {
        // Ensure case-insensitive comparison and trim spaces
        if (
          user.role === "Employee" &&
          user.office.trim().toLowerCase() === loggedInUser.office.trim().toLowerCase()
        ) {
          let option = document.createElement("option");
          option.value = user.id;
          option.textContent = `${user.firstName} ${user.lastName}`;
          employeeSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  // Open the Manager Assign Task Modal and load eligible employees.
  window.openManagerAssignTaskModal = function () {
    document.getElementById("managerAssignTaskModal").style.display = "block";
    window.loadEmployeesForManager();
  };

  // Close the Manager Assign Task Modal.
  window.closeManagerAssignTaskModal = function () {
    document.getElementById("managerAssignTaskModal").style.display = "none";
  };

  // Submit a new task assignment from the manager.
  window.managerAssignTask = async function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser || loggedInUser.role !== "Manager") {
      alert("You must be logged in as a Manager.");
      return;
    }
    // Gather values from the modal.
    const title = document.getElementById("managerAssignTaskTitle").value.trim();
    const description = document.getElementById("managerAssignTaskDescription").value.trim();
    const startDate = document.getElementById("managerAssignStartDate").value;
    const endDate = document.getElementById("managerAssignEndDate").value;
    const status = document.getElementById("managerAssignTaskStatus").value;
    const assignedTo = document.getElementById("managerAssignEmployeeSelect").value;

    if (!title || !startDate || !endDate || !status || !assignedTo) {
      alert("Please fill in all required fields.");
      return;
    }

    const taskData = {
      title,
      description,
      startDate,
      endDate,
      status,
      assignedTo,         // This should be the employee's numeric ID.
      createdBy: loggedInUser.id
    };

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      alert("Task assigned successfully!");
      window.closeManagerAssignTaskModal();
      // Optionally reload tasks or update the UI accordingly.
      // loadTasks();
    } catch (error) {
      console.error("Error assigning task:", error);
      alert("Error assigning task: " + error.message);
    }
  };
      

    // Load tasks on page load
    loadTasks();

    // Make assignTask globally accessible
    window.assignTask = assignTask;
});



window.closeAssignTaskModal = function () {
    document.getElementById("assignTaskModal").style.display = "none";
};
