<!-- Admin.svelte -->
<script>
    import { onMount } from "svelte";
  
    // State variables
    let adminName = "";
    let totalUsers = 0;
    let totalManagers = 0;
    let totalEmployees = 0;
    let users = [];
    let tasks = [];
    let offices = [];
  
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
      birthday: ""
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
      birthday: ""
    };
  
    // Form data for new task assignment
    let newTask = {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "Pending",
      assignedTo: "",
      createdBy: ""
    };
  
    // Form data for editing task
    let editTaskData = {
      id: null,
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "",
      assignedTo: ""
    };
  
    // Report generation
    let reportUserId = "";
    let reportStartDate = "";
    let reportEndDate = "";
    let reportPreviewHtml = "";
  
    const API_URL = "http://localhost:3000";
  
    onMount(() => {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (loggedInUser) {
        adminName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
      }
      loadUsers();
      loadTasks();
      loadOffices();
    });
  
    // ---------------------
    // Users & Offices
    // ---------------------
    async function loadUsers() {
      try {
        const res = await fetch(`${API_URL}/users`);
        const data = await res.json();
        users = data;
        totalUsers = data.length;
        totalManagers = data.filter(u => u.role === "Manager").length;
        totalEmployees = data.filter(u => u.role === "Employee").length;
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
  
    async function addUser() {
      if (!newUser.firstName || !newUser.lastName || !newUser.office) {
        alert("Please fill in all required fields.");
        return;
      }
      try {
        const res = await fetch(`${API_URL}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser)
        });
        const data = await res.json();
        console.log("User added:", data);
        await loadUsers();
        showUserModal = false;
        // Reset form
        newUser = {
          role: "",
          office: "",
          firstName: "",
          lastName: "",
          number: "",
          address: "",
          birthday: ""
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
          body: JSON.stringify(editUserData)
        });
        const data = await res.json();
        console.log("User updated:", data);
        await loadUsers();
        showEditUserModal = false;
      } catch (error) {
        console.error("Error updating user:", error);
      }
    }
  
    // ---------------------
    // Tasks
    // ---------------------
    async function loadTasks() {
      try {
        // For Admin, load all tasks
        const res = await fetch(`${API_URL}/tasks`);
        tasks = await res.json();
      } catch (error) {
        console.error("Error loading tasks:", error);
      }
    }
  
    async function assignTask() {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!loggedInUser) {
        alert("You must be logged in.");
        return;
      }
      newTask.createdBy = loggedInUser.id;
      if (!newTask.title || !newTask.startDate || !newTask.endDate || !newTask.assignedTo) {
        alert("Please fill in all required fields for the task.");
        return;
      }
      try {
        const res = await fetch(`${API_URL}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTask)
        });
        const data = await res.json();
        console.log("Task assigned:", data);
        await loadTasks();
        showAssignTaskModal = false;
        // Reset form
        newTask = {
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          status: "Pending",
          assignedTo: "",
          createdBy: ""
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
  
    // ---------------------
    // Report Generation
    // ---------------------
    async function loadUsersForReport() {
      try {
        const res = await fetch(`${API_URL}/users`);
        const data = await res.json();
        // Filter to managers & employees only
        users = data.filter(user => user.role === "Manager" || user.role === "Employee");
      } catch (error) {
        console.error("Error loading users for report:", error);
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
        callback: function (doc) {
          doc.save("task_report.pdf");
        },
        x: 10,
        y: 10,
        html2canvas: { scale: 0.295 }
      });
    }
  
    // Logout
    function logout() {
      localStorage.removeItem("loggedInUser");
      window.location.href = "/";
    }
  </script>
  
  <!-- GLOBALIZE body styling to avoid the “unused CSS selector” warning -->
  <style>
    :global(body) {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
      text-align: center;
    }
  
    header {
      background-color: #007BFF;
      color: white;
      padding: 15px;
    }
  
    .dashboard-cards {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin: 20px 0;
    }
  
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      width: 200px;
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
      background-color: #007BFF;
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
      left: 0; top: 0;
      width: 100%; height: 100%;
      background-color: rgba(0,0,0,0.5);
    }
  
    .modal-content {
      background: white;
      margin: 10% auto;
      padding: 20px;
      width: 50%;
      border-radius: 8px;
      text-align: left;
    }
    .modal-content h2 {
      margin-top: 0;
    }
  </style>
  
  <!-- Markup -->
  <div>
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
  
      <!-- User Management -->
      <section>
        <h3>User Management</h3>
        <button on:click={() => (showUserModal = true)}>➕ Add User</button>
        <table>
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
  
      <!-- Tasks -->
      <h2>All Tasks (Admin View)</h2>
      <table>
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
                <button on:click={() => editTask(task.id)}>✏️ Edit</button>
                <button on:click={() => deleteTask(task.id)}>🗑 Delete</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
  
      <button on:click={() => (showAssignTaskModal = true)}>➕ Assign Task</button>
      <button
        on:click={() => {
          showReportModal = true;
          loadUsersForReport();
        }}
      >
        Generate Task Report
      </button>
    </main>
  
    <!-- Add User Modal -->
    {#if showUserModal}
      <div class="modal">
        <div class="modal-content">
          <h2>Add New User</h2>
  
          <label for="addUserRoleSelect">Select Role:</label>
          <select id="addUserRoleSelect" bind:value={newUser.role}>
            <option value="" disabled>Select Role</option>
            <option value="Manager">Manager</option>
            <option value="Employee">Employee</option>
          </select>
  
          {#if newUser.role}
            <label for="addUserOfficeSelect">Select Office:</label>
            <select id="addUserOfficeSelect" bind:value={newUser.office}>
              <option value="" disabled>Select Office</option>
              {#each offices as office}
                <option value={office.officeName}>{office.officeName}</option>
              {/each}
            </select>
  
            <label for="addUserFirstName">First Name:</label>
            <input id="addUserFirstName" type="text" bind:value={newUser.firstName} />
  
            <label for="addUserLastName">Last Name:</label>
            <input id="addUserLastName" type="text" bind:value={newUser.lastName} />
  
            <label for="addUserPhone">Phone Number:</label>
            <input id="addUserPhone" type="text" bind:value={newUser.number} />
  
            <label for="addUserAddress">Address:</label>
            <input id="addUserAddress" type="text" bind:value={newUser.address} />
  
            <label for="addUserBirthday">Birthday:</label>
            <input id="addUserBirthday" type="date" bind:value={newUser.birthday} />
  
            <button on:click={addUser}>Save User</button>
            <button on:click={() => (showUserModal = false)}>Cancel</button>
          {/if}
        </div>
      </div>
    {/if}
  
    <!-- Edit User Modal -->
    {#if showEditUserModal}
      <div class="modal">
        <div class="modal-content">
          <h2>Edit User</h2>
          <input type="hidden" bind:value={editUserData.id} />
  
          <label for="editUserFirstName">First Name:</label>
          <input
            id="editUserFirstName"
            type="text"
            bind:value={editUserData.firstName}
          />
  
          <label for="editUserLastName">Last Name:</label>
          <input
            id="editUserLastName"
            type="text"
            bind:value={editUserData.lastName}
          />
  
          <label for="editUserRoleSelect">Role:</label>
          <select id="editUserRoleSelect" bind:value={editUserData.role}>
            <option value="Manager">Manager</option>
            <option value="Employee">Employee</option>
          </select>
  
          <label for="editUserOfficeSelect">Office:</label>
          <select id="editUserOfficeSelect" bind:value={editUserData.office}>
            {#each offices as office}
              <option value={office.officeName}>{office.officeName}</option>
            {/each}
          </select>
  
          <label for="editUserPhone">Phone Number:</label>
          <input id="editUserPhone" type="text" bind:value={editUserData.number} />
  
          <label for="editUserAddress">Address:</label>
          <input id="editUserAddress" type="text" bind:value={editUserData.address} />
  
          <label for="editUserBirthday">Birthday:</label>
          <input id="editUserBirthday" type="date" bind:value={editUserData.birthday} />
  
          <button on:click={updateUser}>Save Changes</button>
          <button on:click={() => (showEditUserModal = false)}>Cancel</button>
        </div>
      </div>
    {/if}
  
    <!-- Assign Task Modal -->
    {#if showAssignTaskModal}
      <div class="modal">
        <div class="modal-content">
          <h2>Assign a Task</h2>
  
          <label for="assignTaskTitle">Title:</label>
          <input
            id="assignTaskTitle"
            type="text"
            bind:value={newTask.title}
            required
          />
  
          <label for="assignTaskDescription">Description:</label>
          <textarea
            id="assignTaskDescription"
            bind:value={newTask.description}
            required
          ></textarea>
  
          <label for="assignTaskStartDate">Start Date:</label>
          <input
            id="assignTaskStartDate"
            type="date"
            bind:value={newTask.startDate}
            required
          />
  
          <label for="assignTaskEndDate">End Date:</label>
          <input
            id="assignTaskEndDate"
            type="date"
            bind:value={newTask.endDate}
            required
          />
  
          <label for="assignTaskStatus">Status:</label>
          <select id="assignTaskStatus" bind:value={newTask.status}>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
  
          <label for="assignTaskAssignedTo">Assign to:</label>
          <select
            id="assignTaskAssignedTo"
            bind:value={newTask.assignedTo}
            required
          >
            <option value="" disabled>Select User</option>
            {#each users as user (user.id)}
              {#if user.role !== "Admin"}
                <option value={user.id}>{user.firstName} ({user.role})</option>
              {/if}
            {/each}
          </select>
  
          <button on:click={assignTask}>Assign Task</button>
          <button on:click={() => (showAssignTaskModal = false)}>Cancel</button>
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
          <input
            id="editTaskTitle"
            type="text"
            bind:value={editTaskData.title}
            required
          />
  
          <label for="editTaskDescription">Description:</label>
          <textarea
            id="editTaskDescription"
            bind:value={editTaskData.description}
            required
          ></textarea>
  
          <label for="editTaskStartDate">Start Date:</label>
          <input
            id="editTaskStartDate"
            type="date"
            bind:value={editTaskData.startDate}
            required
          />
  
          <label for="editTaskEndDate">End Date:</label>
          <input
            id="editTaskEndDate"
            type="date"
            bind:value={editTaskData.endDate}
            required
          />
  
          <label for="editTaskStatus">Status:</label>
          <select id="editTaskStatus" bind:value={editTaskData.status}>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
  
          <label for="editTaskAssignedTo">Assign to:</label>
          <select
            id="editTaskAssignedTo"
            bind:value={editTaskData.assignedTo}
            required
          >
            <option value="" disabled>Select User</option>
            {#each users as user (user.id)}
              {#if user.role !== "Admin"}
                <option value={user.id}>{user.firstName} ({user.role})</option>
              {/if}
            {/each}
          </select>
  
          <button on:click={updateTask}>Save Changes</button>
          <button on:click={() => (showEditTaskModal = false)}>Cancel</button>
        </div>
      </div>
    {/if}
  
    <!-- Report Modal -->
    {#if showReportModal}
      <div class="modal">
        <div class="modal-content">
          <h2>Task Report</h2>
  
          <label for="reportUserSelect">Select User:</label>
          <select
            id="reportUserSelect"
            bind:value={reportUserId}
          >
            <option value="" disabled>Select a user</option>
            {#each users as user (user.id)}
              {#if user.role === "Manager" || user.role === "Employee"}
                <option value={user.id}>
                  {user.firstName} {user.lastName} ({user.role})
                </option>
              {/if}
            {/each}
          </select>
  
          <label for="reportStartDateInput">Start Date:</label>
          <input
            id="reportStartDateInput"
            type="date"
            bind:value={reportStartDate}
          />
  
          <label for="reportEndDateInput">End Date:</label>
          <input
            id="reportEndDateInput"
            type="date"
            bind:value={reportEndDate}
          />
  
          <button on:click={previewReport}>Preview Report</button>
  
          {#if reportPreviewHtml}
            <div class="report-preview">
              {@html reportPreviewHtml}
            </div>
            <button on:click={downloadReport}>Download PDF</button>
          {/if}
  
          <button
            on:click={() => {
              showReportModal = false;
              reportPreviewHtml = "";
            }}
          >
            Close
          </button>
        </div>
      </div>
    {/if}
  </div>
  