<!-- manager.svelte -->
<script>
  import { onMount } from "svelte";
  let managerName = "";
  let tasks = [];
  let employees = [];
  let loggedInUser;
  let currentView = "tasks";
  let showAssignTaskModal = false;
  let showEditTaskModal = false;
  let showReportModal = false;
  let showChangePasswordModal = false;
  let showProfileModal = false; // New: Edit Profile modal
  let currentPassword = "";
  let newPassword = "";
  let confirmNewPassword = "";

  // For assigning a new task
  let newTask = {
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Pending",
    assignedTo: "",
  };

  let editTaskData = {
    id: null,
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "",
    assignedTo: "",
  };

  // For report generation
  let reportPreviewHtml = "";
  let reportStartDate = "";
  let reportEndDate = "";
  let reportUserId = "";

  const API_URL = "http://localhost:3000";

  // For editing manager profile
  let profileData = {
    firstName: "",
    lastName: "",
    birthday: "",
    number: "",
    address: ""
  };

  onMount(() => {
    loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser) {
      managerName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
      // Initialize profileData with current manager info
      profileData = {
        firstName: loggedInUser.firstName || "",
        lastName: loggedInUser.lastName || "",
        birthday: loggedInUser.birthday || "",
        number: loggedInUser.number || "",
        address: loggedInUser.address || ""
      };
      loadTasks();
      loadEmployees();
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

  async function loadEmployees() {
    try {
      if (!loggedInUser) return;
      const res = await fetch(`${API_URL}/users`);
      const allUsers = await res.json();
      employees = allUsers.filter(
        (u) =>
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
    if (
      !taskToSend.title ||
      !taskToSend.startDate ||
      !taskToSend.endDate ||
      !taskToSend.assignedTo
    ) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskToSend),
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
      };
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
      const url = `${API_URL}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}&office=${encodeURIComponent(
        loggedInUser.office
      )}`;
      const res = await fetch(url);
      const allTasks = await res.json();
      const filtered = allTasks.filter((task) => {
        const filterStart = new Date(reportStartDate);
        const filterEnd = new Date(reportEndDate);
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.endDate);
        const overlaps = taskStart <= filterEnd && taskEnd >= filterStart;
        let belongsToUser = false;
        if (reportUserId == loggedInUser.id) {
          // For "Myself", include only tasks assigned to the manager
          belongsToUser = task.assignedTo == reportUserId;
        } else {
          // For an employee, include tasks where they are either the creator or the assignee
          belongsToUser =
            task.createdBy == reportUserId || task.assignedTo == reportUserId;
        }
        return belongsToUser && overlaps;
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
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF generation library not loaded. Please contact your administrator.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.html(reportPreviewHtml, {
      callback: function (doc) {
        doc.save("task_report.pdf");
      },
      x: 10,
      y: 10,
      html2canvas: { scale: 0.295 },
    });
  }

  // ---------------------
  // Change Password Feature
  // ---------------------
  async function changePassword() {
    if (newPassword !== confirmNewPassword) {
      alert("New passwords do not match.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loggedInUser.username,
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error updating password.");
      } else {
        alert("Password updated successfully.");
        showChangePasswordModal = false;
        currentPassword = "";
        newPassword = "";
        confirmNewPassword = "";
      }
    } catch (error) {
      console.error("Error changing password:", error);
      alert("Error changing password.");
    }
  }

  // ---------------------
  // Edit Profile Feature for Manager
  // ---------------------
  async function updateProfile() {
    // Build updatedProfile object: if a field is blank, use the current value.
    const updatedProfile = {
      firstName: profileData.firstName.trim() || loggedInUser.firstName,
      lastName: profileData.lastName.trim() || loggedInUser.lastName,
      // Required fields from backend:
      role: loggedInUser.role,
      office: loggedInUser.office,
      birthday: profileData.birthday.trim() || loggedInUser.birthday,
      number: profileData.number.trim() || loggedInUser.number,
      address: profileData.address.trim() || loggedInUser.address,
    };
    try {
      const res = await fetch(`${API_URL}/users/${loggedInUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error updating profile.");
      } else {
        alert("Profile updated successfully.");
        // Update localStorage and loggedInUser with updated info
        const newUserData = { ...loggedInUser, ...updatedProfile };
        localStorage.setItem("loggedInUser", JSON.stringify(newUserData));
        managerName = `${newUserData.firstName} ${newUserData.lastName}`;
        showProfileModal = false;
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile.");
    }
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
    <!-- New Buttons for Change Password and Edit Profile -->
    
    <button class="nav-btn" on:click={() => showProfileModal = true}>Edit Profile</button>
    <button class="logout-btn" on:click={logout}>Logout</button>
  </aside>
  <main>
    {#if currentView === "tasks"}
      <section class="task-section">
        <div class="task-container">
          <div class="title-container">
            <h2 class="title-task">Tasks</h2>
          </div>
          <div class="horizontal-container">
            <div class="welcome-msg">
              <h2 class="manager-title">Manager:</h2>
              <h2 class="manager-name">{managerName}</h2>
            </div>
            <div class="button-container">
              <button class="primary-btn-add" on:click={() => (showAssignTaskModal = true)}>➕ Add Task</button>
            </div>
          </div>
          <div class="table-container">
            <table class="admin-table">
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
                        <button class="edit-btn" on:click={() => editTask(task.id)}>Edit ✏️</button>
                        <button class="delete-btn" on:click={() => deleteTask(task.id)}>Delete 🗑</button>
                      </td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    {:else if currentView === "report"}
      <div class="report-view-container">
        <section class="report-view">
          <div>
            <h2 class="title-task-report">Generate Task Report</h2>
          </div>
          <div class="dropdown-container">
            <div class="dropdown">
              <label class="title-dropdown" for="reportUserSelect">Select User:</label>
              <select id="reportUserSelect" bind:value={reportUserId}>
                <option value="" disabled>Select a user</option>
                <option value={loggedInUser.id}>Myself (Manager)</option>
                {#each employees as emp}
                  <option value={emp.id}>{emp.firstName} {emp.lastName} ({emp.role})</option>
                {/each}
              </select>
            </div>
            <div class="dropdown">
              <label class="title-dropdown" for="reportStartDateInput">Start Date:</label>
              <input id="reportStartDateInput" type="date" bind:value={reportStartDate} />
            </div>
            <div class="dropdown">
              <label class="title-dropdown" for="reportEndDateInput">End Date:</label>
              <input id="reportEndDateInput" type="date" bind:value={reportEndDate} />
            </div>
          </div>
          <button class="primary-btn" on:click={previewReport}>Preview Report</button>
          {#if reportPreviewHtml}
            <div class="report-preview">
              {@html reportPreviewHtml}
            </div>
            <button class="primary-btn" on:click={downloadReport}>Download PDF</button>
          {/if}
        </section>
      </div>
    {/if}
  </main>

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
          <option value={loggedInUser.id}>Assign to Myself</option>
          {#each employees as emp}
            <option value={emp.id}>{emp.firstName} ({emp.role})</option>
          {/each}
        </select>
        <div class="modal-actions">
          <button class="primary-btn" on:click={assignTask}>Assign Task</button>
          <button class="cancel-btn" on:click={() => (showAssignTaskModal = false)}>Cancel</button>
        </div>
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
        <div class="modal-actions">
          <button class="primary-btn" on:click={updateTask}>Save Changes</button>
          <button class="cancel-btn" on:click={() => (showEditTaskModal = false)}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showChangePasswordModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Change Password</h2>
        <label for="currentPassword">Current Password:</label>
        <input id="currentPassword" type="password" bind:value={currentPassword} />
        <label for="newPassword">New Password:</label>
        <input id="newPassword" type="password" bind:value={newPassword} />
        <label for="confirmNewPassword">Confirm New Password:</label>
        <input id="confirmNewPassword" type="password" bind:value={confirmNewPassword} />
        <div class="modal-actions">
          <button class="primary-btn" on:click={changePassword}>Update Password</button>
          <button class="cancel-btn" on:click={() => showChangePasswordModal = false}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showProfileModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Edit Profile</h2>
        <label for="firstName">First Name:</label>
        <input id="firstName" type="text" bind:value={profileData.firstName} />
        <label for="lastName">Last Name:</label>
        <input id="lastName" type="text" bind:value={profileData.lastName} />
        <label for="birthday">Birthday:</label>
        <input id="birthday" type="date" bind:value={profileData.birthday} />
        <label for="number">Phone Number:</label>
        <input id="number" type="text" bind:value={profileData.number} />
        <label for="address">Address:</label>
        <input id="address" type="text" bind:value={profileData.address} />
        <div class="modal-actions">
          <button class="primary-btn" on:click={updateProfile}>Update Profile</button>
          <button class="cancel-btn" on:click={() => showProfileModal = false}>Cancel</button>
          <button class="nav-btn" on:click={() => showChangePasswordModal = true} on:click={() => showProfileModal = false}>Change Password</button>
        </div>
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
    margin-left: 250px;
    padding: 20px;
    width: calc(100% - 250px);
    box-sizing: border-box;
  }

  .report-view-container {
    margin-top: -65%;
  }

  .title-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .horizontal-container {
    border: 1px solid #ddd;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    height: 20%;
  }

  .manager-name {
    font-size: 120%;
    width: 200px;
  }

  .manager-title {
    font-size: 120%;
  }

  .title-task {
    font-size: 250%;
    margin-bottom: 0;
  }

  .title-task-report {
    font-size: 250%;
    margin-bottom: 10%;
  }

  .button-container {
    display: flex;
    flex-direction: row;
    margin-bottom: -5%;
  }

  .dropdown-container {
    display: flex;
    flex-direction: row;
  }

  .dropdown {
    display: flex;
    flex-direction: row;
    margin: 0 2%;
  }

  .title-dropdown {
    display: flex;
    flex-direction: row;
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

  .primary-btn, .primary-btn-add {
    margin: 5px;
    width: 130px;
    height: 40px;
    padding: 10px 10px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    background-color: #2980b9;
    color: #fff;
    transition: background-color 0.2s, box-shadow 0.2s;
  }

  .primary-btn:hover, .primary-btn-add:hover {
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

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .manager-container{
    margin-top: 80%;
  }

  .task-container{
    display:flex;
    flex-direction: column;
  }

  .welcome-msg{
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }

</style>
