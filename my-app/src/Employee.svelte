<!-- Employee.svelte -->
<script>
  import { onMount } from "svelte";

  let employeeName = "";
  let tasks = [];
  let loggedInUser;
  let currentView = "tasks";
  let showTaskModal = false;
  let showEditTaskModal = false;
  let showReportModal = false;
  let showChangePasswordModal = false;
  let showProfileModal = false; // For Edit Profile

  // Variables for Change Password
  let currentPassword = "";
  let newPassword = "";
  let confirmNewPassword = "";

  // Variables for profile data update
  let profileData = {
    firstName: "",
    lastName: "",
    birthday: "",
    number: "",
    address: ""
  };

  let newTask = {
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Pending",
  };
  let editTaskData = {
    id: null,
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "",
  };
  let reportPreviewHtml = "";
  let reportStartDate = "";
  let reportEndDate = "";
  let reportUserId = "";

  const API_URL = "http://localhost:3000";

  onMount(() => {
    loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser) {
      employeeName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
      // Initialize profileData with current user info
      profileData = {
        firstName: loggedInUser.firstName || "",
        lastName: loggedInUser.lastName || "",
        birthday: loggedInUser.birthday || "",
        number: loggedInUser.number || "",
        address: loggedInUser.address || ""
      };
      loadTasks();
    }
  });

  async function loadTasks() {
    try {
      const res = await fetch(
        `${API_URL}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}`
      );
      const filteredTasks = await res.json();
      tasks = filteredTasks;
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }

  async function addTask() {
    if (!newTask.title || !newTask.startDate || !newTask.endDate) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      const taskData = {
        ...newTask,
        assignedTo: loggedInUser.id,
        createdBy: loggedInUser.id,
      };
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      const data = await res.json();
      console.log("Task added:", data);
      await loadTasks();
      showTaskModal = false;
      newTask = {
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "Pending",
      };
    } catch (error) {
      console.error("Error adding task:", error);
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
    if (!reportStartDate || !reportEndDate) {
      alert("Please select a date range.");
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}`
      );
      const allTasks = await res.json();
      const filtered = allTasks.filter((task) => {
        const taskDate = new Date(task.startDate);
        return (
          taskDate >= new Date(reportStartDate) &&
          taskDate <= new Date(reportEndDate)
        );
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
      html2canvas: { scale: 0.295 },
    });
  }

  function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "/";
  }

  function setView(view) {
    currentView = view;
  }

  // ---------------------
  // Change Password Feature
  // ---------------------
  async function changePassword() {
    if (newPassword !== confirmNewPassword) {
      alert("New passwords do not match.");
      return;
    }
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      alert("You must be logged in.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loggedInUser.username,
          currentPassword,
          newPassword,
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
  // Edit Profile Feature
  // ---------------------
  async function updateProfile() {
    // Create an updated profile object.
    // If a field is empty, use the current value.
    const updatedProfile = {
      firstName: profileData.firstName.trim() || loggedInUser.firstName,
      lastName: profileData.lastName.trim() || loggedInUser.lastName,
      // Include required fields that employees cannot change:
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
        // Update localStorage and loggedInUser with the updated info
        loggedInUser = { ...loggedInUser, ...updatedProfile };
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
        employeeName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
        showProfileModal = false;
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile.");
    }
  }
</script>

<div class="employee-container">
  <aside class="side-panel">
    <h1>Employee Dashboard</h1>
    <button class="nav-btn" on:click={() => setView("tasks")}>My Tasks</button>
    <button class="nav-btn" on:click={() => setView("report")}>Task Report</button>
    
    <!-- New Edit Profile Button -->
    <button class="nav-btn" on:click={() => (showProfileModal = true)}>Edit Profile</button>
    <button class="logout-btn" on:click={logout}>Logout</button>
  </aside>
  <main>
    {#if currentView === "tasks"}
      <section class="task-section">
        <div class="task-header">
          <div class="title-container">
            <h2 class="my-tasks">My Tasks</h2>
          </div>
          <div class="horizontal-container">
            <div class="manager-name">
              <h2>Welcome, {employeeName}!</h2>
            </div>
            <div class="button-container">
              <button class="primary-btn" on:click={() => (showTaskModal = true)}>➕ Add Task</button>
            </div>
          </div>
        </div>
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
              <tr><td colspan="6">No tasks found.</td></tr>
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
      <div class="employee-container-generate">
        <section class="report-view">
          <div class="report-view-container">
            <div class="title-container">
              <h2 class="task-title-holder">Task Report</h2>
            </div>
            <div class="horizontal-container-generate">
              <div class="first-dropdown">
                <label class="date-holder" for="reportStartDate">Start Date:</label>
                <input id="reportStartDate" type="date" bind:value={reportStartDate}/>
              </div>
              <div class="second-dropdown">
                <label class="date-holder" for="reportEndDate">End Date:</label>
                <input id="reportEndDate" type="date" bind:value={reportEndDate} />
              </div>
            </div>
            <div class="button-container">
              <button class="primary-btn" on:click={previewReport}>Preview Report</button>
            </div>
            {#if reportPreviewHtml}
              <div class="report-preview">
                {@html reportPreviewHtml}
              </div>
              <button class="primary-btn" on:click={downloadReport}>Download PDF</button>
            {/if}
          </div>
        </section>
      </div>
    {/if}
  </main>
  {#if showTaskModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Add Task</h2>
        <label for="newTaskTitle">Title:</label>
        <input id="newTaskTitle" type="text" bind:value={newTask.title} required/>
        <label for="newTaskDescription">Description:</label>
        <textarea id="newTaskDescription" bind:value={newTask.description} required></textarea>
        <label for="newTaskStart">Start Date:</label>
        <input id="newTaskStart" type="date" bind:value={newTask.startDate} required />
        <label for="newTaskEnd">End Date:</label>
        <input id="newTaskEnd" type="date" bind:value={newTask.endDate} required/>
        <label for="newTaskStatus">Status:</label>
        <select id="newTaskStatus" bind:value={newTask.status}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <button class="primary-btn" on:click={addTask}>Add Task</button>
        <button class="cancel-btn" on:click={() => (showTaskModal = false)}>Cancel</button>
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
        <textarea id="editTaskDescription" bind:value={editTaskData.description} required ></textarea>
        <label for="editTaskStart">Start Date:</label>
        <input id="editTaskStart" type="date" bind:value={editTaskData.startDate} required/>
        <label for="editTaskEnd">End Date:</label>
        <input id="editTaskEnd" type="date" bind:value={editTaskData.endDate} required/>
        <label for="editTaskStatus">Status:</label>
        <select id="editTaskStatus" bind:value={editTaskData.status}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
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
        <label for="reportStartDateModal">Start Date:</label>
        <input id="reportStartDateModal" type="date" bind:value={reportStartDate}/>
        <label for="reportEndDateModal">End Date:</label>
        <input id="reportEndDateModal" type="date" bind:value={reportEndDate} />
        <button class="primary-btn" on:click={previewReport}>Preview Report</button>
        {#if reportPreviewHtml}
          <div class="report-preview">
            {@html reportPreviewHtml}
          </div>
          <button class="primary-btn" on:click={downloadReport}>Download PDF</button>
        {/if}
        <button class="cancel-btn" on:click={() => { showReportModal = false; reportPreviewHtml = "";}}>
          Close
        </button>
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
          <button class="nav-btn" on:click={() => (showChangePasswordModal = true)} on:click={() => showProfileModal = false}>Change Password</button>
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
    text-align: center;
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

  .employee-container-generate {
    margin-top: -60%;
    margin-left: -30%;
  }

  .employee-container {
    margin-top: -30%;
    margin-left: 0%;
  }

  .task-header {
    display: flex;
    flex-direction: column;
    align-content: center;
  }

  .title-container {
    display: flex;
    flex-direction: row;
    align-content: center;
    justify-content: center;
  }

  .horizontal-container {
    display: flex;
    flex-direction: row;
    align-content: center;
    justify-content: space-between;
    border: 1px solid #ddd;
  } 

  .my-tasks {
    font-size: 35px;
  }

  .report-view-container {
    display: flex;
    flex-direction: column;
    align-content: center;
    justify-content: center;
  }

  .first-dropdown, .second-dropdown {
    display: flex;
    flex-direction: row;
    align-content: center;
  }

  .horizontal-container {
    display: flex;
    flex-direction: row;
    align-content: center;
    justify-content: space-between;
    height: 50px;
  }

  .horizontal-container-generate {
    display: flex;
    flex-direction: row;
    align-content: center;
    gap: 25%;
    margin: 5%;
  }

  .button-container {
    display: flex;
    flex-direction: row;
    align-content: center;
    justify-content: center;
  }

  .date-holder {
    width: 80px;
  }
</style>


