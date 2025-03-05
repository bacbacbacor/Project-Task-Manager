<!-- my-app/src/routes/admin/+page.svelte -->
<script>
  import { onMount } from 'svelte';

  // ---------------------
  // Dashboard State
  // ---------------------
  let adminName = "Admin"; // Update based on logged-in info if needed
  let totalUsers = 0;
  let totalManagers = 0;
  let totalEmployees = 0;
  let users = [];
  let tasks = [];
  let reportPreviewElement;

  

  // ---------------------
  // Modal Controls
  // ---------------------
  let showUserModal = false;
  let showEditUserModal = false;
  let showAssignTaskModal = false;
  let showEditTaskModal = false;
  let showReportModal = false;

  // ---------------------
  // New User Form Fields (Add User)
  // ---------------------
  let userRole = "";
  let userOffice = "";
  let firstName = "";
  let lastName = "";
  let number = "";
  let address = "";
  let birthday = "";

  // ---------------------
  // Edit User Form Fields
  // ---------------------
  let editUserId = "";
  let editFirstName = "";
  let editLastName = "";
  let editRole = "";
  let editOffice = "";
  let editNumber = "";
  let editAddress = "";
  let editBirthday = "";

  // ---------------------
  // Task Form Fields (Assign Task)
  // ---------------------
  let taskTitle = "";
  let taskDescription = "";
  let startDate = "";
  let endDate = "";
  let taskStatus = "Pending"; // default value
  let assignTaskAssignedTo = ""; // holds the selected assignee's id

  // ---------------------
  // Task Form Fields (Edit Task)
  // ---------------------
  let editTaskId = "";
  let editTaskTitle = "";
  let editTaskDescription = "";
  let editStartDate = "";
  let editEndDate = "";
  let editTaskStatus = "";
  let currentTaskAssignedTo = null;

  // ---------------------
  // Data for Dropdowns
  // ---------------------
  let assignmentUsers = []; // non‑Admin users for task assignment
  let offices = []; // dynamically loaded offices

  // ---------------------
  // Report (Compile Tasks) Variables
  // ---------------------
  let reportUsers = [];  // users available for report (e.g. Manager/Employee)
  let selectedUserReport = "";
  let reportStartDate = "";
  let reportEndDate = "";
  let reportPreviewHtml = "";

  // ---------------------
  // API URLs
  // ---------------------
  const USER_API_URL = "http://localhost:3000/users";
  const TASK_API_URL = "http://localhost:3000/tasks";
  const OFFICES_API_URL = "http://localhost:3000/offices";

  // ---------------------
  // Load Data Functions
  // ---------------------
  async function loadUsers() {
    try {
      const res = await fetch(USER_API_URL);
      const data = await res.json();
      users = data;
      totalUsers = users.length;
      totalManagers = users.filter(u => u.role === "Manager").length;
      totalEmployees = users.filter(u => u.role === "Employee").length;
    } catch (e) {
      console.error("Error loading users:", e);
    }
  }

  async function loadTasks() {
    try {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!loggedInUser || !loggedInUser.id || !loggedInUser.role || !loggedInUser.office) {
        alert("You must be logged in with proper credentials.");
        return;
      }
      const url = `${TASK_API_URL}?userId=${loggedInUser.id}&role=${loggedInUser.role}&office=${encodeURIComponent(loggedInUser.office)}`;
      const res = await fetch(url);
      const data = await res.json();
      tasks = data;
    } catch (e) {
      console.error("Error loading tasks:", e);
    }
  }

  async function loadOffices() {
    try {
      const res = await fetch(OFFICES_API_URL);
      if (!res.ok) throw new Error("Failed to load offices.");
      offices = await res.json();
    } catch (error) {
      console.error("Error loading offices:", error);
    }
  }

  async function loadAssignmentUsers() {
    try {
      const res = await fetch(USER_API_URL);
      if (!res.ok) throw new Error("Failed to fetch users.");
      const data = await res.json();
      // Filter out Admin users for assignment
      assignmentUsers = data.filter(user => user.role !== "Admin");
    } catch (error) {
      console.error("Error loading assignment users:", error);
    }
  }

  // ---------------------
  // Report Loading Functions
  // ---------------------
  async function loadUsersForReport() {
    try {
      const res = await fetch(USER_API_URL);
      const data = await res.json();
      // For report, include Managers and Employees
      reportUsers = data.filter(user => user.role === "Manager" || user.role === "Employee");
    } catch (error) {
      console.error("Error loading users for report:", error);
    }
  }
  
  async function previewReport() {
    if (!selectedUserReport || !reportStartDate || !reportEndDate) {
      alert("Please select a user and date range.");
      return;
    }
    try {
      const res = await fetch(`${TASK_API_URL}?userId=${selectedUserReport}`);
      if (!res.ok) throw new Error("Failed to fetch tasks.");
      const tasksData = await res.json();
      // Filter tasks based on startDate and endDate
      const filteredTasks = tasksData.filter(task => {
        const taskDate = new Date(task.startDate);
        return taskDate >= new Date(reportStartDate) && taskDate <= new Date(reportEndDate);
      });
      if (filteredTasks.length === 0) {
        reportPreviewHtml = "<p>No tasks found for the selected criteria.</p>";
      } else {
        let html = "<table border='1' style='width:100%; border-collapse: collapse;'>";
        html += "<tr><th>ID</th><th>Title</th><th>Description</th><th>Start Date</th><th>End Date</th><th>Status</th></tr>";
        filteredTasks.forEach(task => {
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
      console.error("Error previewing report:", error);
    }
  }

  async function downloadReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.html(reportPreviewElement, {
    callback: function (doc) {
      doc.save("task_report.pdf");
    },
    x: 10,
    y: 10,
    html2canvas: { scale: 0.295 }
  });
}
  

  async function openReportModal() {
    showReportModal = true;
    await loadUsersForReport();
  }
  function closeReportModal() {
    showReportModal = false;
    selectedUserReport = "";
    reportStartDate = "";
    reportEndDate = "";
    reportPreviewHtml = "";
  }

  // ---------------------
  // Logout Functionality
  // ---------------------
  function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "/";
  }

  // ---------------------
  // User Modal Functions (Add User)
  // ---------------------
  function openUserModal() {
    showUserModal = true;
  }
  function closeUserModal() {
    showUserModal = false;
    userRole = "";
    userOffice = "";
    firstName = "";
    lastName = "";
    number = "";
    address = "";
    birthday = "";
  }
  async function addUser() {
    if (!firstName || !lastName || !number || !address || !birthday || !userOffice || !userRole) {
      alert("Please fill in all required fields.");
      return;
    }
    const newUser = { role: userRole, office: userOffice, firstName, lastName, number, address, birthday };
    try {
      const res = await fetch(USER_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      console.log("User added:", data);
      await loadUsers();
      closeUserModal();
    } catch (e) {
      console.error("Error adding user:", e);
    }
  }

  // ---------------------
  // User Edit Modal Functions
  // ---------------------
  async function editUser(userId) {
    try {
      const res = await fetch(`${USER_API_URL}/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user details.");
      const user = await res.json();
      editUserId = user.id;
      editFirstName = user.firstName || "";
      editLastName = user.lastName || "";
      editRole = user.role || "";
      editOffice = user.office || "";
      editNumber = user.number || "";
      editAddress = user.address || "";
      editBirthday = user.birthday || "";
      showEditUserModal = true;
    } catch (e) {
      console.error("Error fetching user details:", e);
    }
  }
  function closeEditUserModal() {
    showEditUserModal = false;
  }
  async function updateUser() {
    if (!editFirstName || !editLastName || !editRole || !editOffice) {
      alert("Please fill in all required fields.");
      return;
    }
    const updatedUser = {
      firstName: editFirstName,
      lastName: editLastName,
      role: editRole,
      office: editOffice,
      number: editNumber,
      address: editAddress,
      birthday: editBirthday
    };
    try {
      const res = await fetch(`${USER_API_URL}/${editUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update user.");
      alert("User updated successfully!");
      await loadUsers();
      closeEditUserModal();
    } catch (e) {
      console.error("Error updating user:", e);
      alert("Error updating user: " + e.message);
    }
  }

  // ---------------------
  // Task Modal Functions (Assign Task)
  // ---------------------
  async function openAssignTaskModal() {
    await loadAssignmentUsers();
    showAssignTaskModal = true;
  }
  function closeAssignTaskModal() {
    showAssignTaskModal = false;
    taskTitle = "";
    taskDescription = "";
    startDate = "";
    endDate = "";
    taskStatus = "Pending";
    assignTaskAssignedTo = "";
  }
  async function assignTask() {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      alert("You must be logged in.");
      return;
    }
    if (!taskTitle || !startDate || !endDate || !taskStatus || !assignTaskAssignedTo) {
      alert("Please fill in all required fields.");
      return;
    }
    const newTask = {
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      startDate,
      endDate,
      status: taskStatus,
      assignedTo: assignTaskAssignedTo,
      createdBy: loggedInUser.id,
      role: loggedInUser.role
    };
    try {
      const res = await fetch(TASK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
      });
      if (!res.ok) throw new Error("Failed to assign task.");
      alert("Task assigned successfully!");
      await loadTasks();
      closeAssignTaskModal();
    } catch (e) {
      console.error("Error assigning task:", e);
      alert("Error assigning task: " + e.message);
    }
  }

  // ---------------------
  // Task Modal Functions (Edit Task)
  // ---------------------
  async function editTask(taskId) {
    try {
      const res = await fetch(`${TASK_API_URL}/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task details.");
      const task = await res.json();
      editTaskId = task.id;
      editTaskTitle = task.title;
      editTaskDescription = task.description;
      editStartDate = task.startDate ? task.startDate.split("T")[0] : "";
      editEndDate = task.endDate ? task.endDate.split("T")[0] : "";
      editTaskStatus = task.status;
      currentTaskAssignedTo = task.assignedTo;
      showEditTaskModal = true;
    } catch (e) {
      console.error("Error fetching task details:", e);
    }
  }
  function closeEditTaskModal() {
    showEditTaskModal = false;
  }
  async function updateTask() {
    const updatedTask = {
      title: editTaskTitle.trim(),
      description: editTaskDescription.trim(),
      startDate: editStartDate,
      endDate: editEndDate,
      status: editTaskStatus,
      assignedTo: currentTaskAssignedTo || null
    };
    try {
      const res = await fetch(`${TASK_API_URL}/${editTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask)
      });
      if (!res.ok) throw new Error("Failed to update task.");
      const data = await res.json();
      console.log("Task updated:", data);
      await loadTasks();
      closeEditTaskModal();
    } catch (e) {
      console.error("Error updating task:", e);
      alert("Error updating task. Check console for details.");
    }
  }
  async function deleteTask(taskId) {
    try {
      await fetch(`${TASK_API_URL}/${taskId}`, { method: "DELETE" });
      await loadTasks();
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  }

  // ---------------------
  // On Mount: Load initial data
  // ---------------------
  onMount(() => {
    loadUsers();
    loadTasks();
    loadOffices();
  });


  
</script>

<header>
  <h1>Admin Dashboard</h1>
  <button on:click={logout}>Logout</button>
</header>

<main>
  <h2>Welcome, {adminName}!</h2>
  
  <!-- Dashboard Cards -->
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

  <!-- User Management Section -->
  <section class="user-management">
    <h3>User Management</h3>
    <button class="add-user-btn" on:click={openUserModal}>➕ Add User</button>
    <table id="userTable">
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
              <button on:click={() => editUser(user.id)}>✏️ Edit</button>
              <button on:click={() => deleteUser(user.id)}>🗑 Delete</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <!-- Task Management Section -->
  <section class="task-management">
    <h2>All Tasks (Admin View)</h2>
    <button on:click={openAssignTaskModal}>➕ Assign Task</button>
    <table id="taskTable">
      <thead>
        <tr>
          <th>Title</th>
          <th>Description</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Status</th>
          <th>Created By</th>
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
                <button on:click={() => editTask(task.id)}>✏️ Edit</button>
                <button on:click={() => deleteTask(task.id)}>🗑 Delete</button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </section>

  <!-- Report Section (Compile Tasks) -->
  <section class="report-section">
    <button on:click={openReportModal}>Generate Task Report</button>
  </section>
</main>

<!-- User Modal (Add User) -->
{#if showUserModal}
  <div class="modal">
    <div class="modal-content">
      <h2>Add New User</h2>
      <label>Select Role:</label>
      <select bind:value={userRole}>
        <option value="" disabled>Select Role</option>
        <option value="Manager">Manager</option>
        <option value="Employee">Employee</option>
      </select>

      <label>Select Office:</label>
      <select bind:value={userOffice}>
        <option value="" disabled>Select Office</option>
        {#each offices as office}
          <option value={office.officeName}>{office.officeName}</option>
        {/each}
      </select>

      <label>First Name:</label>
      <input type="text" bind:value={firstName} />

      <label>Last Name:</label>
      <input type="text" bind:value={lastName} />

      <label>Phone Number:</label>
      <input type="text" bind:value={number} />

      <label>Address:</label>
      <input type="text" bind:value={address} />

      <label>Birthday:</label>
      <input type="date" bind:value={birthday} />

      <button class="save-user-btn" on:click={addUser}>Save User</button>
      <button class="cancel-btn" on:click={closeUserModal}>Cancel</button>
    </div>
  </div>
{/if}

<!-- Edit User Modal -->
{#if showEditUserModal}
  <div class="modal">
    <div class="modal-content">
      <h2>Edit User</h2>
      <input type="hidden" bind:value={editUserId}>

      <label>First Name:</label>
      <input type="text" bind:value={editFirstName} />

      <label>Last Name:</label>
      <input type="text" bind:value={editLastName} />

      <label>Role:</label>
      <select bind:value={editRole}>
        <option value="" disabled>Select Role</option>
        <option value="Manager">Manager</option>
        <option value="Employee">Employee</option>
      </select>

      <label>Office:</label>
      <select bind:value={editOffice}>
        <option value="" disabled>Select Office</option>
        {#each offices as office}
          <option value={office.officeName}>{office.officeName}</option>
        {/each}
      </select>

      <label>Phone Number:</label>
      <input type="text" bind:value={editNumber} />

      <label>Address:</label>
      <input type="text" bind:value={editAddress} />

      <label>Birthday:</label>
      <input type="date" bind:value={editBirthday} />

      <button on:click={updateUser}>💾 Save Changes</button>
      <button on:click={closeEditUserModal}>Cancel</button>
    </div>
  </div>
{/if}

<!-- Assign Task Modal -->
{#if showAssignTaskModal}
  <div class="modal">
    <div class="modal-content">
      <h2>Assign Task</h2>
      <label>Title:</label>
      <input type="text" bind:value={taskTitle} required>

      <label>Description:</label>
      <textarea bind:value={taskDescription} required></textarea>

      <label>Start Date:</label>
      <input type="date" bind:value={startDate} required>

      <label>End Date:</label>
      <input type="date" bind:value={endDate} required>

      <label>Status:</label>
      <select bind:value={taskStatus}>
        <option value="Pending">Pending</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
      </select>

      <label>Assign to:</label>
      <select bind:value={assignTaskAssignedTo}>
        <option value="" disabled>Select User</option>
        {#each assignmentUsers as user}
          <option value={user.id}>{user.firstName} ({user.role})</option>
        {/each}
      </select>

      <button on:click={assignTask}>Assign Task</button>
      <button on:click={closeAssignTaskModal}>Cancel</button>
    </div>
  </div>
{/if}

<!-- Edit Task Modal -->
{#if showEditTaskModal}
  <div class="modal">
    <div class="modal-content">
      <h2>Edit Task</h2>
      <input type="hidden" bind:value={editTaskId}>

      <label>Title:</label>
      <input type="text" bind:value={editTaskTitle} required>

      <label>Description:</label>
      <textarea bind:value={editTaskDescription} required></textarea>

      <label>Start Date:</label>
      <input type="date" bind:value={editStartDate} required>

      <label>End Date:</label>
      <input type="date" bind:value={editEndDate} required>

      <label>Status:</label>
      <select bind:value={editTaskStatus}>
        <option value="Pending">Pending</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
      </select>

      <button on:click={updateTask}>Save Changes</button>
      <button on:click={closeEditTaskModal}>Cancel</button>
    </div>
  </div>
{/if}

<!-- Report Modal (Compile Tasks) -->
{#if showReportModal}
  <div class="modal">
    <div class="modal-content">
      <h2>Task Report</h2>
      <label>Select User:</label>
      <select bind:value={selectedUserReport}>
        <option value="" disabled>Select a user</option>
        {#each reportUsers as user}
          <option value={user.id}>{user.firstName} {user.lastName} ({user.role})</option>
        {/each}
      </select>

      <label>Start Date:</label>
      <input type="date" bind:value={reportStartDate}>

      <label>End Date:</label>
      <input type="date" bind:value={reportEndDate}>

      <button on:click={previewReport}>Preview Report</button>
      <button on:click={downloadReport}>Download PDF</button>
      <button on:click={closeReportModal}>Close</button>

      <!-- Bind the report preview container -->
      <div class="report-preview" bind:this={reportPreviewElement} innerHTML={reportPreviewHtml}></div>
    </div>
  </div>
{/if}

  
<style>
  header {
    background-color: #007BFF;
    color: white;
    padding: 15px;
    text-align: center;
  }
  main {
    padding: 20px;
  }
  .dashboard-cards {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 20px;
  }
  .card {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    width: 200px;
    text-align: center;
  }
  .user-management, .task-management, .report-section {
    margin: 20px auto;
    width: 80%;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  .add-user-btn {
    background: #28a745;
    color: white;
    border: none;
    padding: 10px 15px;
    cursor: pointer;
    border-radius: 5px;
    margin-bottom: 15px;
  }
  .add-user-btn:hover {
    background: #218838;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  table th, table td {
    border: 1px solid #ddd;
    padding: 10px;
    text-align: center;
  }
  table th {
    background: #007BFF;
    color: white;
  }
  /* Modal Styles */
  .modal {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-content {
    background: white;
    padding: 20px;
    width: 50%;
    border-radius: 8px;
    text-align: left;
  }
  button {
    background: #007BFF;
    color: white;
    border: none;
    padding: 10px;
    cursor: pointer;
    border-radius: 5px;
    margin-right: 5px;
  }
  button:hover {
    background: #0056b3;
  }
  .cancel-btn {
    background: #dc3545;
  }
  .cancel-btn:hover {
    background: #c82333;
  }
  .report-preview {
    margin-top: 15px;
  }
</style>


