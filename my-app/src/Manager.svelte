<!-- Manager.svelte -->
<script>
  import { onMount } from "svelte";

  let managerName = "";
  let tasks = [];
  let employees = [];
  let loggedInUser;

  // New view state: "tasks" (default) or "report"
  let currentView = "tasks";

  // Modals
  let showAssignTaskModal = false;
  let showEditTaskModal = false;
  let showReportModal = false;

  // Form data for new task
  let newTask = {
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Pending",
    assignedTo: ""
  };

  // Form data for editing a task
  let editTaskData = {
    id: null,
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "",
    assignedTo: ""
  };

  // Report state
  let reportPreviewHtml = "";
  let reportStartDate = "";
  let reportEndDate = "";
  let reportUserId = "";

  const API_URL = "http://localhost:3000";

  onMount(() => {
    loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser) {
      managerName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
      loadTasks();
      loadEmployeesForManager();
    }
  });

  async function loadTasks() {
    try {
      if (!loggedInUser) return;
      const url = `${API_URL}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}&office=${encodeURIComponent(
        loggedInUser.office
      )}`;
      const res = await fetch(url);
      tasks = await res.json();
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }

  async function loadEmployeesForManager() {
    try {
      if (!loggedInUser) return;
      const res = await fetch(`${API_URL}/users`);
      const allUsers = await res.json();
      employees = allUsers.filter(u =>
        u.role === "Employee" &&
        u.office.trim().toLowerCase() === loggedInUser.office.trim().toLowerCase()
      );
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  }

  async function assignTask() {
    if (!loggedInUser) {
      alert("You must be logged in as a Manager.");
      return;
    }
    const taskToSend = { ...newTask, createdBy: loggedInUser.id };
    if (!taskToSend.title || !taskToSend.startDate || !taskToSend.endDate || !taskToSend.assignedTo) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskToSend)
      });
      const data = await res.json();
      console.log("Task assigned:", data);
      await loadTasks();
      showAssignTaskModal = false;
      newTask = { title: "", description: "", startDate: "", endDate: "", status: "Pending", assignedTo: "" };
    } catch (error) {
      console.error("Error assigning task:", error);
      alert("Error assigning task.");
    }
  }

  async function editTask(taskId) {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`);
      const task = await res.json();
      editTaskData = {
        id: task.id,
        title: task.title,
        description: task.description,
        startDate: task.startDate ? task.startDate.split("T")[0] : "",
        endDate: task.endDate ? task.endDate.split("T")[0] : "",
        status: task.status,
        assignedTo: task.assignedTo
      };
      showEditTaskModal = true;
    } catch (error) {
      console.error("Error fetching task details:", error);
    }
  }

  async function updateTask() {
    try {
      const res = await fetch(`${API_URL}/tasks/${editTaskData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTaskData)
      });
      const data = await res.json();
      console.log("Task updated:", data);
      await loadTasks();
      showEditTaskModal = false;
    } catch (error) {
      console.error("Error updating task:", error);
    }
  }

  async function deleteTask(taskId) {
    try {
      await fetch(`${API_URL}/tasks/${taskId}`, { method: "DELETE" });
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }

  async function previewReport() {
    if (!reportUserId || !reportStartDate || !reportEndDate) {
      alert("Please select a user and a date range.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/tasks?userId=${reportUserId}`);
      const allTasks = await res.json();
      const filtered = allTasks.filter(task => {
        const taskDate = new Date(task.startDate);
        return taskDate >= new Date(reportStartDate) && taskDate <= new Date(reportEndDate);
      });
      if (filtered.length === 0) {
        reportPreviewHtml = "<p>No tasks found for the selected criteria.</p>";
      } else {
        let html = `<table border='1' style='width:100%; border-collapse: collapse;'>
            <tr>
              <th>ID</th><th>Title</th><th>Description</th>
              <th>Start Date</th><th>End Date</th><th>Status</th>
            </tr>`;
        filtered.forEach(task => {
          html += `<tr>
              <td>${task.id}</td>
              <td>${task.title}</td>
              <td>${task.description}</td>
              <td>${new Date(task.startDate).toLocaleDateString()}</td>
              <td>${new Date(task.endDate).toLocaleDateString()}</td>
              <td>${task.status}</td>
            </tr>`;
        });
        html += "</table>";
        reportPreviewHtml = html;
      }
    } catch (error) {
      console.error("Error generating report:", error);
    }
  }

  function downloadReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.html(reportPreviewHtml, {
      callback: function(doc) {
        doc.save("task_report.pdf");
      },
      x: 10,
      y: 10,
      html2canvas: { scale: 0.295 }
    });
  }

  function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "/";
  }

  function setView(view) {
    currentView = view;
  }
</script>

<div class="manager-container">
  <aside class="side-panel">
    <h1>Manager Dashboard</h1>
    <button class="nav-btn" on:click={() => setView("tasks")}>My Tasks</button>
    <button class="nav-btn" on:click={() => setView("report")}>Generate Task Report</button>
    <button class="logout-btn" on:click={logout}>Logout</button>
  </aside>

  <main>
    <h2>Welcome, {managerName}!</h2>

    {#if currentView === "tasks"}
      <section class="task-section">
        <h2>Tasks</h2>
        <button class="primary-btn" on:click={() => (showAssignTaskModal = true)}>➕ Add Task</button>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Assigned by</th>
              <th>Assigned To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#if tasks.length === 0}
              <tr><td colspan="8">No tasks assigned.</td></tr>
            {:else}
              {#each tasks as task}
                <tr>
                  <td>{task.title}</td>
                  <td>{task.description}</td>
                  <td>{new Date(task.startDate).toLocaleDateString()}</td>
                  <td>{new Date(task.endDate).toLocaleDateString()}</td>
                  <td>{task.status}</td>
                  <td>{task.createdBy || "Unknown"}</td>
                  <td>{task.assignedTo || "Unknown"}</td>
                  <td>
                    <button class="edit-btn" on:click={() => editTask(task.id)}>✏️ Edit</button>
                    <button class="delete-btn" on:click={() => deleteTask(task.id)}>🗑 Delete</button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </section>
    {:else if currentView === "report"}
      <section class="report-view">
        <h2>Generate Task Report</h2>
        <button class="primary-btn" on:click={() => { showReportModal = true; }}>
          Generate Task Report
        </button>
      </section>
    {/if}
  </main>

  <!-- Modals -->
  {#if showAssignTaskModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Assign Task</h2>
        <label for="managerTaskTitle">Title:</label>
        <input id="managerTaskTitle" type="text" bind:value={newTask.title} required />
        <label for="managerTaskDescription">Description:</label>
        <textarea id="managerTaskDescription" bind:value={newTask.description} required></textarea>
        <label for="managerTaskStartDate">Start Date:</label>
        <input id="managerTaskStartDate" type="date" bind:value={newTask.startDate} required />
        <label for="managerTaskEndDate">End Date:</label>
        <input id="managerTaskEndDate" type="date" bind:value={newTask.endDate} required />
        <label for="managerTaskStatus">Status:</label>
        <select id="managerTaskStatus" bind:value={newTask.status}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <label for="managerTaskAssignedTo">Assign to:</label>
        <select id="managerTaskAssignedTo" bind:value={newTask.assignedTo} required>
          <option value="" disabled>Select User</option>
          {#each employees as emp}
            <option value={emp.id}>{emp.firstName} ({emp.role})</option>
          {/each}
        </select>
        <button class="primary-btn" on:click={assignTask}>Assign Task</button>
        <button class="cancel-btn" on:click={() => (showAssignTaskModal = false)}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if showEditTaskModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Edit Task</h2>
        <input type="hidden" bind:value={editTaskData.id} />
        <label for="editTaskTitle">Title:</label>
        <input id="editTaskTitle" type="text" bind:value={editTaskData.title} required />
        <label for="editTaskDescription">Description:</label>
        <textarea id="editTaskDescription" bind:value={editTaskData.description} required></textarea>
        <label for="editTaskStartDate">Start Date:</label>
        <input id="editTaskStartDate" type="date" bind:value={editTaskData.startDate} required />
        <label for="editTaskEndDate">End Date:</label>
        <input id="editTaskEndDate" type="date" bind:value={editTaskData.endDate} required />
        <label for="editTaskStatus">Status:</label>
        <select id="editTaskStatus" bind:value={editTaskData.status}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <label for="editTaskAssignedTo">Assign to:</label>
        <select id="editTaskAssignedTo" bind:value={editTaskData.assignedTo} required>
          <option value="" disabled>Select User</option>
          {#each employees as emp}
            <option value={emp.id}>{emp.firstName} ({emp.role})</option>
          {/each}
        </select>
        <button class="primary-btn" on:click={updateTask}>Save Changes</button>
        <button class="cancel-btn" on:click={() => (showEditTaskModal = false)}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if showReportModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Task Report</h2>
        <label for="reportUserSelect">Select User:</label>
        <select id="reportUserSelect" bind:value={reportUserId}>
          <option value="" disabled>Select a user</option>
          {#each employees as emp}
            <option value={emp.id}>{emp.firstName} {emp.lastName} ({emp.role})</option>
          {/each}
        </select>
        <label for="reportStartDateInput">Start Date:</label>
        <input id="reportStartDateInput" type="date" bind:value={reportStartDate} />
        <label for="reportEndDateInput">End Date:</label>
        <input id="reportEndDateInput" type="date" bind:value={reportEndDate} />
        <button class="primary-btn" on:click={previewReport}>Preview Report</button>
        {#if reportPreviewHtml}
          <div class="report-preview">
            {@html reportPreviewHtml}
          </div>
          <button class="primary-btn" on:click={downloadReport}>Download PDF</button>
        {/if}
        <button class="cancel-btn" on:click={() => { showReportModal = false; reportPreviewHtml = ""; }}>
          Close
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    font-family: Arial, sans-serif;
    background-color: #f4f7f9;
    margin: 0;
    padding: 0;
    text-align: center;
  }

  /* Side Panel */
  .side-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 250px;
    height: 100vh;
    background-color: #2d3e50;
    color: #ecf0f1;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
    z-index: 999;
  }

  .nav-btn {
    background-color: #34495e;
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    cursor: pointer;
    color: #ecf0f1;
    font-size: 14px;
    transition: background-color 0.2s;
  }
  .nav-btn:hover {
    background-color: #2c3e50;
  }

  .logout-btn {
    background-color: #e74c3c;
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    cursor: pointer;
    color: #ecf0f1;
    font-size: 14px;
    transition: background-color 0.2s;
  }
  .logout-btn:hover {
    background-color: #c0392b;
  }

  main {
    margin-left: 150px;
    margin-top: 500px;
    padding: 20px;
    box-sizing: border-box;
    text-align: left;
  }

  h2 {
    color: #333;
  }

  .admin-table {
    width: 90%;
    margin: 20px auto;
    border-collapse: collapse;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  .admin-table th,
  .admin-table td {
    border: 1px solid #ddd;
    padding: 10px;
    text-align: center;
  }
  .admin-table th {
    background-color: #2980b9;
    color: #fff;
  }
  .admin-table tr:hover {
    background-color: #f2f2f2;
  }

  .primary-btn {
    margin: 5px;
    padding: 10px 16px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    background-color: #2980b9;
    color: #fff;
    transition: background-color 0.2s, box-shadow 0.2s;
  }
  .primary-btn:hover {
    background-color: #1f6391;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .edit-btn,
  .delete-btn {
    margin: 2px;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s, box-shadow 0.2s;
  }
  .edit-btn {
    background-color: #f39c12;
    color: #fff;
  }
  .edit-btn:hover {
    background-color: #d68910;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  .delete-btn {
    background-color: #e74c3c;
    color: #fff;
  }
  .delete-btn:hover {
    background-color: #c0392b;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .cancel-btn {
    margin: 5px;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background-color: #bdc3c7;
    color: #333;
    transition: background-color 0.2s, box-shadow 0.2s;
  }
  .cancel-btn:hover {
    background-color: #95a5a6;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .report-preview {
    margin-top: 20px;
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #ddd;
    padding: 10px;
    background: #ecf0f1;
    border-radius: 6px;
  }

  .modal-overlay {
    display: flex;
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    align-items: center;
    justify-content: center;
    z-index: 999;
  }

  .modal-content {
    background: #fff;
    width: 90%;
    max-width: 600px;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
    text-align: left;
  }

  .modal-content h2 {
    margin-top: 0;
    color: #333;
  }

  .modal-content label {
    display: block;
    margin-top: 10px;
    font-weight: bold;
  }

  .modal-content input,
  .modal-content textarea,
  .modal-content select {
    width: 100%;
    margin-bottom: 10px;
    padding: 8px;
    box-sizing: border-box;
    border-radius: 6px;
    border: 1px solid #ccc;
    font-size: 14px;
  }
</style>
