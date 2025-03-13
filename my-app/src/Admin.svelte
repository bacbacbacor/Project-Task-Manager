<!-- Admin.svelte -->
<script>
  import { onMount } from "svelte";

  let adminName = "";
  let totalUsers = 0;
  let totalManagers = 0;
  let totalEmployees = 0;
  let users = [];
  let tasks = [];
  let offices = [];

  // View State: "tasks", "userManagement", or "report"
  let currentView = "tasks";

  // Modal controls
  let showUserModal = false;
  let showEditUserModal = false;
  let showAssignTaskModal = false;
  let showEditTaskModal = false;
  let showReportModal = false;

  // Form data for new user
  let newUser = {
    role: "",
    office: "",
    firstName: "",
    lastName: "",
    number: "",
    address: "",
    birthday: "",
  };

  // Form data for editing user
  let editUserData = {
    id: null,
    firstName: "",
    lastName: "",
    role: "",
    office: "",
    number: "",
    address: "",
    birthday: "",
  };

  // Form data for new task assignment
  let newTask = {
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Pending",
    assignedTo: "",
    createdBy: "",
  };

  // Form data for editing task
  let editTaskData = {
    id: null,
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "",
    assignedTo: "",
  };

  // Report generation
  let reportUserId = "";
  let reportStartDate = "";
  let reportEndDate = "";
  let reportPreviewHtml = "";

  const API_URL = "http://localhost:3000";

  onMount(() => {
    window.scrollTo(0, 0);
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      alert("No logged-in user found. Please log in.");
      window.location.href = "/";
      return;
    }
    // If you specifically only allow Admin to access this view, you can check role here:
    // if (loggedInUser.role.toLowerCase() !== "admin") {
    //   alert("Access denied. Admin only.");
    //   logout();
    //   return;
    // }

    adminName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
    loadUsers();
    loadTasks();
    loadOffices();
  });

  async function loadUsers() {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      users = data;
      totalUsers = data.length;
      totalManagers = data.filter((u) => u.role === "Manager").length;
      totalEmployees = data.filter((u) => u.role === "Employee").length;
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }

  async function loadOffices() {
    try {
      const res = await fetch(`${API_URL}/offices`);
      offices = await res.json();
    } catch (error) {
      console.error("Error loading offices:", error);
    }
  }

  // KEY FIX: If the user is a Manager, append &office= to the query string
  async function loadTasks() {
    try {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!loggedInUser) return;

      let url = `${API_URL}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}`;

      // If user is Manager, tasks.js route requires office
      if (loggedInUser.role === "Manager") {
        url += `&office=${encodeURIComponent(loggedInUser.office)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        // If it's a 400 or something else, log the error text
        const errText = await res.text();
        console.error("Error fetching tasks:", errText);
        // Set tasks to empty array to avoid RangeError
        tasks = [];
        return;
      }

      tasks = await res.json();
      console.log("Admin tasks loaded:", tasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }

  async function addUser() {
    if (!newUser.firstName || !newUser.lastName || !newUser.office) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      console.log("User added:", data);
      await loadUsers();
      showUserModal = false;
      newUser = {
        role: "",
        office: "",
        firstName: "",
        lastName: "",
        number: "",
        address: "",
        birthday: "",
      };
    } catch (error) {
      console.error("Error adding user:", error);
    }
  }

  async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await fetch(`${API_URL}/users/${userId}`, { method: "DELETE" });
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }

  async function editUser(userId) {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`);
      const data = await res.json();
      editUserData = { ...data };
      showEditUserModal = true;
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  }

  async function updateUser() {
    try {
      const res = await fetch(`${API_URL}/users/${editUserData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUserData),
      });
      const data = await res.json();
      console.log("User updated:", data);
      await loadUsers();
      showEditUserModal = false;
    } catch (error) {
      console.error("Error updating user:", error);
    }
  }

  async function assignTask() {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      alert("You must be logged in.");
      return;
    }
    newTask.createdBy = loggedInUser.id;
    if (
      !newTask.title ||
      !newTask.startDate ||
      !newTask.endDate ||
      !newTask.assignedTo
    ) {
      alert("Please fill in all required fields for the task.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      const data = await res.json();
      console.log("Task assigned:", data);
      await loadTasks();
      showAssignTaskModal = false;
      newTask = {
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "Pending",
        assignedTo: "",
        createdBy: "",
      };
    } catch (error) {
      console.error("Error assigning task:", error);
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
        assignedTo: task.assignedTo,
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
        body: JSON.stringify(editTaskData),
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
      // Use admin or manager credentials to fetch tasks
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

      let url = `${API_URL}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}`;
      if (loggedInUser.role === "Manager") {
        url += `&office=${encodeURIComponent(loggedInUser.office)}`;
      }

      const res = await fetch(url);
      const allTasks = await res.json();

      // Filter tasks by date range and matching user (assigned or created)
      const filtered = allTasks.filter((task) => {
        const taskDate = new Date(task.startDate);
        const inDateRange = taskDate >= new Date(reportStartDate) && taskDate <= new Date(reportEndDate);
        const userMatch = task.assignedToId == reportUserId || task.createdById == reportUserId;
        return inDateRange && userMatch;
      });
      if (filtered.length === 0) {
        reportPreviewHtml = "<p>No tasks found for the selected criteria.</p>";
      } else {
        let html = `<table border='1' style='width:100%; border-collapse: collapse;'>
            <tr>
              <th>ID</th><th>Title</th><th>Description</th>
              <th>Start Date</th><th>End Date</th><th>Status</th>
            </tr>`;
        filtered.forEach((task) => {
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
      callback: function (doc) {
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
    console.log("Changing view to:", view);
    currentView = view;
  }
</script>

<div class="admin-container">
  <aside class="side-panel">
    <h1>Admin Dashboard</h1>
    <button class="nav-btn" on:click={() => setView("tasks")}>
      View All Tasks
    </button>
    <button class="nav-btn" on:click={() => setView("userManagement")}>
      User Management
    </button>
    <button class="nav-btn" on:click={() => setView("report")}>
      Generate Task Report
    </button>
    <button class="logout-btn" on:click={logout}>Logout</button>
  </aside>

  <main>
    {#if currentView === "tasks"}
      <section class="task-section">
        <h2>All Tasks</h2>
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#if tasks.length === 0}
              <tr><td colspan="9">No tasks found.</td></tr>
            {:else}
              {#each tasks as task}
                <tr>
                  <td>{task.id}</td>
                  <td>{task.title}</td>
                  <td>{task.description}</td>
                  <td>{new Date(task.startDate).toLocaleDateString()}</td>
                  <td>{new Date(task.endDate).toLocaleDateString()}</td>
                  <td>{task.status}</td>
                  <td>{task.assignedTo || "Unassigned"}</td>
                  <td>{task.createdBy}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="edit-btn" on:click={() => editTask(task.id)}>
                        ✏️ Edit
                      </button>
                      <button class="delete-btn" on:click={() => deleteTask(task.id)}>
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
        <button class="primary-btn" on:click={() => (showAssignTaskModal = true)}>
          ➕ Assign Task
        </button>
      </section>
    {:else if currentView === "userManagement"}
      <section class="user-management">
        <section class="dashboard-cards">
          <div class="card">
            <h3>Total Users</h3>
            <p>{totalUsers}</p>
          </div>
          <div class="card">
            <h3>Managers</h3>
            <p>{totalManagers}</p>
          </div>
          <div class="card">
            <h3>Employees</h3>
            <p>{totalEmployees}</p>
          </div>
        </section>
        <button class="primary-btn" on:click={() => (showUserModal = true)}>
          ➕ Add User
        </button>
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Office</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each users as user}
              <tr>
                <td>{user.id}</td>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.role}</td>
                <td>{user.office || "N/A"}</td>
                <td>
                  <div class="action-buttons">
                    <button class="edit-btn" on:click={() => editUser(user.id)}>
                      ✏️ Edit
                    </button>
                    <button class="delete-btn" on:click={() => deleteUser(user.id)}>
                      🗑 Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {:else if currentView === "report"}
      <section class="report-view">
        <h2>Generate Task Report</h2>
        <button id="generateReport" class="primary-btn" on:click={() => { showReportModal = true; }}>
          Generate Task Report
        </button>
      </section>
    {/if}
  </main>

  <!-- Modals -->
  {#if showUserModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Add New User</h2>
        <label for="selectRole">Select Role:</label>
        <select bind:value={newUser.role}>
          <option value="" disabled>Select Role</option>
          <option value="Manager">Manager</option>
          <option value="Employee">Employee</option>
        </select>
        {#if newUser.role}
          <label for="selectOffice">Select Office:</label>
          <select bind:value={newUser.office}>
            <option value="" disabled>Select Office</option>
            {#each offices as office}
              <option value={office.officeName}>{office.officeName}</option>
            {/each}
          </select>
          <label for="fName">First Name:</label>
          <input id="fName" type="text" bind:value={newUser.firstName} />
          <label for="lName">Last Name:</label>
          <input id="lName" type="text" bind:value={newUser.lastName} />
          <label for="phoneNum">Phone Number:</label>
          <input id="phoneNum" type="text" bind:value={newUser.number} />
          <label for="address">Address:</label>
          <input id="address" type="text" bind:value={newUser.address} />
          <label for="birthday">Birthday:</label>
          <input id="birthday" type="date" bind:value={newUser.birthday} />
          <div class="modal-actions">
            <button class="primary-btn" on:click={addUser}>Save User</button>
            <button class="cancel-btn" on:click={() => (showUserModal = false)}>
              Cancel
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if showEditUserModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Edit User</h2>
        <input type="hidden" bind:value={editUserData.id} />
        <label for="fName">First Name:</label>
        <input id="fName" type="text" bind:value={editUserData.firstName} />
        <label for="lName">Last Name:</label>
        <input id="lName" type="text" bind:value={editUserData.lastName} />
        <label for="role">Role:</label>
        <select id="role" bind:value={editUserData.role}>
          <option value="Manager">Manager</option>
          <option value="Employee">Employee</option>
        </select>
        <label for="office">Office:</label>
        <select id="office" bind:value={editUserData.office}>
          {#each offices as office}
            <option value={office.officeName}>{office.officeName}</option>
          {/each}
        </select>
        <label for="phoneNum">Phone Number:</label>
        <input id="phoneNum" type="text" bind:value={editUserData.number} />
        <label for="address">Address:</label>
        <input id="address" type="text" bind:value={editUserData.address} />
        <label for="birthday">Birthday:</label>
        <input id="birthday" type="date" bind:value={editUserData.birthday} />
        <div class="modal-actions">
          <button class="primary-btn" on:click={updateUser}>Save Changes</button>
          <button class="cancel-btn" on:click={() => (showEditUserModal = false)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showAssignTaskModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Assign Task</h2>
        <label for="taskTitle">Title:</label>
        <input id="taskTitle" type="text" bind:value={newTask.title} required />
        <label for="taskDescription">Description:</label>
        <textarea id="taskDescription" bind:value={newTask.description} required></textarea>
        <label for="taskStart">Start Date:</label>
        <input id="taskStart" type="date" bind:value={newTask.startDate} required />
        <label for="taskEnd">End Date:</label>
        <input id="taskEnd" type="date" bind:value={newTask.endDate} required />
        <label for="taskStatus">Status:</label>
        <select id="taskStatus" bind:value={newTask.status}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <label for="taskAssignedTo">Assign to:</label>
        <select id="taskAssignedTo" bind:value={newTask.assignedTo} required>
          <option value="" disabled>Select User</option>
          {#each users as user (user.id)}
            <option value={user.id}>
              {user.firstName} {user.lastName} ({user.role})
            </option>
          {/each}
        </select>
        <button class="primary-btn" on:click={assignTask}>Assign Task</button>
        <button class="cancel-btn" on:click={() => (showAssignTaskModal = false)}>
          Cancel
        </button>
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
        <label for="editTaskAssignedTo">Assign to:</label>
        <select id="editTaskAssignedTo" bind:value={editTaskData.assignedTo} required>
          <option value="" disabled>Select User</option>
          {#each users as user (user.id)}
            <option value={user.id}>
              {user.firstName} {user.lastName} ({user.role})
            </option>
          {/each}
        </select>
        <button class="primary-btn" on:click={updateTask}>Save Changes</button>
        <button class="cancel-btn" on:click={() => (showEditTaskModal = false)}>
          Cancel
        </button>
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
          {#each users as user (user.id)}
            <option value={user.id}>
              {user.firstName} {user.lastName} ({user.role})
            </option>
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
  .admin-container {
    font-family: Arial, sans-serif;
    background-color: #f4f7f9;
    min-height: 100vh;
  }
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
    transition: background-color 0.2s, box-shadow 0.2s;
  }
  .nav-btn:hover {
    background-color: #2c3e50;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  .logout-btn {
    background-color: #e74c3c;
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    cursor: pointer;
    color: #ecf0f1;
    font-size: 14px;
    transition: background-color 0.2s, box-shadow 0.2s;
  }
  .logout-btn:hover {
    background-color: #c0392b;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  main {
    margin-left: 270px;
    margin-top: 20px;
    padding: 20px;
    box-sizing: border-box;
  }
  .report-view {
    text-align: center;
    margin-top: 60px;
  }
  .user-management {
    margin-top: 60px;
    text-align: center;
  }
  .dashboard-cards {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin: 20px auto;
    flex-wrap: nowrap;
  }
  .card {
    background: #fff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    width: 200px;
    text-align: center;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
  .card h3 {
    margin: 0 0 10px;
    color: #333;
  }
  .card p {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0;
  }
  .admin-table {
    width: 100%;
    margin: 20px 0;
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
    border-radius: 6px;
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
