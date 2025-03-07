<!-- Employee.svelte -->
<script>
    import { onMount } from "svelte";
  
    // State variables
    let employeeName = "";
    let tasks = [];
    let loggedInUser;
    let showTaskModal = false;
    let showEditTaskModal = false;
  
    // Form data for adding a new task
    let newTask = {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "Pending"
    };
  
    // Form data for editing an existing task
    let editTaskData = {
      id: null,
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      status: ""
    };
  
    // Report generation state
    let reportPreviewHtml = "";
    let reportStartDate = "";
    let reportEndDate = "";
  
    const API_URL = "http://localhost:3000";
  
    onMount(() => {
      loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (loggedInUser) {
        employeeName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
        loadTasks();
      }
    });
  
    // Load tasks for the logged-in employee
    async function loadTasks() {
      try {
        const res = await fetch(`${API_URL}/tasks?userId=${loggedInUser.id}`);
        tasks = await res.json();
      } catch (error) {
        console.error("Error loading tasks:", error);
      }
    }
  
    // Add a new task
    async function addTask() {
      if (!newTask.title || !newTask.startDate || !newTask.endDate) {
        alert("Please fill in all required fields.");
        return;
      }
      try {
        const taskData = {
          ...newTask,
          // For employees, tasks are self-managed
          assignedTo: loggedInUser.id,
          createdBy: loggedInUser.id
        };
        const res = await fetch(`${API_URL}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData)
        });
        const data = await res.json();
        console.log("Task added:", data);
        await loadTasks();
        showTaskModal = false;
        // Reset the new task form
        newTask = {
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          status: "Pending"
        };
      } catch (error) {
        console.error("Error adding task:", error);
      }
    }
  
    // Open task for editing
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
          status: task.status
        };
        showEditTaskModal = true;
      } catch (error) {
        console.error("Error fetching task details:", error);
      }
    }
  
    // Update an existing task
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
  
    // Delete a task
    async function deleteTask(taskId) {
      try {
        await fetch(`${API_URL}/tasks/${taskId}`, { method: "DELETE" });
        await loadTasks();
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  
    // Preview report by filtering tasks by date range
    async function previewReport() {
      if (!reportStartDate || !reportEndDate) {
        alert("Please select a date range.");
        return;
      }
      try {
        const res = await fetch(`${API_URL}/tasks?userId=${loggedInUser.id}`);
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
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
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
  
    // Download the report as a PDF using jsPDF and html2canvas
    function downloadReport() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.html(reportPreviewHtml, {
        callback: function (doc) {
          doc.save("task_report.pdf");
        },
        x: 10,
        y: 10,
        html2canvas: { scale: 0.295 }
      });
    }
  
    // Log out the user
    function logout() {
      localStorage.removeItem("loggedInUser");
      window.location.href = "/";
    }
  </script>
  
  <main>
    <header>
      <h1>Employee Dashboard</h1>
      <button on:click={logout}>Logout</button>
    </header>
  
    <h2>Welcome, {employeeName}!</h2>
  
    <!-- Task list -->
    <section>
      <button on:click={() => showTaskModal = true}>➕ Add Task</button>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if tasks.length === 0}
            <tr>
              <td colspan="6">No tasks found.</td>
            </tr>
          {:else}
            {#each tasks as task}
              <tr>
                <td>{task.title}</td>
                <td>{task.description}</td>
                <td>{new Date(task.startDate).toLocaleDateString()}</td>
                <td>{new Date(task.endDate).toLocaleDateString()}</td>
                <td>{task.status}</td>
                <td>
                  <button on:click={() => editTask(task.id)}>✏️ Edit</button>
                  <button on:click={() => deleteTask(task.id)}>🗑 Delete</button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </section>
  
    <!-- Task Report Section -->
    <section>
      <h2>Task Report</h2>
      <label for="reportStartDate">Start Date:</label>
      <input id="reportStartDate" type="date" bind:value={reportStartDate} />
      <label for="reportEndDate">End Date:</label>
      <input id="reportEndDate" type="date" bind:value={reportEndDate} />
      <button on:click={previewReport}>Preview Report</button>
      {#if reportPreviewHtml}
        <div class="report-preview">
          {@html reportPreviewHtml}
        </div>
        <button on:click={downloadReport}>Download PDF</button>
      {/if}
    </section>
  
    <!-- Add Task Modal -->
    {#if showTaskModal}
      <div class="modal">
        <div class="modal-content">
          <h2>Add Task</h2>
          <label for="newTaskTitle">Title:</label>
          <input id="newTaskTitle" type="text" bind:value={newTask.title} required />
          
          <label for="newTaskDescription">Description:</label>
          <textarea id="newTaskDescription" bind:value={newTask.description} required></textarea>
          
          <label for="newTaskStart">Start Date:</label>
          <input id="newTaskStart" type="date" bind:value={newTask.startDate} required />
          
          <label for="newTaskEnd">End Date:</label>
          <input id="newTaskEnd" type="date" bind:value={newTask.endDate} required />
          
          <label for="newTaskStatus">Status:</label>
          <select id="newTaskStatus" bind:value={newTask.status}>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          
          <button on:click={addTask}>Add Task</button>
          <button on:click={() => showTaskModal = false}>Cancel</button>
        </div>
      </div>
    {/if}
  
    <!-- Edit Task Modal -->
    {#if showEditTaskModal}
      <div class="modal">
        <div class="modal-content">
          <h2>Edit Task</h2>
          <input type="hidden" bind:value={editTaskData.id} />
          
          <label for="editTaskTitle">Title:</label>
          <input id="editTaskTitle" type="text" bind:value={editTaskData.title} required />
          
          <label for="editTaskDescription">Description:</label>
          <textarea id="editTaskDescription" bind:value={editTaskData.description} required></textarea>
          
          <label for="editTaskStart">Start Date:</label>
          <input id="editTaskStart" type="date" bind:value={editTaskData.startDate} required />
          
          <label for="editTaskEnd">End Date:</label>
          <input id="editTaskEnd" type="date" bind:value={editTaskData.endDate} required />
          
          <label for="editTaskStatus">Status:</label>
          <select id="editTaskStatus" bind:value={editTaskData.status}>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          
          <button on:click={updateTask}>Save Changes</button>
          <button on:click={() => showEditTaskModal = false}>Cancel</button>
        </div>
      </div>
    {/if}
  </main>
  
  <style>
    :global(body) {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
      text-align: center;
    }
    
    header {
      background-color: #007bff;
      color: white;
      padding: 15px;
    }
    
    table {
      width: 80%;
      margin: 20px auto;
      border-collapse: collapse;
    }
    
    table th,
    table td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: center;
    }
    
    table th {
      background-color: #007bff;
      color: white;
    }
    
    button {
      margin: 5px;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      opacity: 0.8;
    }
    
    .modal {
      display: block;
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    .modal-content {
      background: white;
      margin: 10% auto;
      padding: 20px;
      width: 50%;
      border-radius: 8px;
      text-align: left;
    }
  </style>
  