document.addEventListener("DOMContentLoaded", function () {
    const userTable = document.getElementById("userTable").querySelector("tbody");
    const userModal = document.getElementById("userModal");
    const userRoleSelect = document.getElementById("userRole");
    const userOfficeSelect = document.getElementById("userOffice");
    const userFields = document.getElementById("userFields");
    const API_URL = "http://localhost:3000/users"; // Backend API URL

    async function loadUsers() {
        try {
            const response = await fetch("http://localhost:3000/users");
            const users = await response.json();
    
            // Update user counts in dashboard
            document.getElementById("totalUsers").textContent = users.length;
            document.getElementById("totalManagers").textContent = users.filter(user => user.role === "Manager").length;
            document.getElementById("totalEmployees").textContent = users.filter(user => user.role === "Employee").length;
    
            // Load users into the table
            const userTable = document.getElementById("userTable").querySelector("tbody");
            userTable.innerHTML = ""; // Clear table before loading new data
    
            users.forEach((user) => {
                if (user.role !== "Admin") { // Prevent editing Admin users
                    let row = `
                        <tr>
                            <td>${user.firstName} ${user.lastName}</td>
                            <td>${user.role}</td>
                            <td>${user.office || "N/A"}</td>
                            <td>
                                <button onclick="editUser(${user.id})">✏️ Edit</button>
                                <button onclick="deleteUser(${user.id})">🗑 Delete</button>
                            </td>
                        </tr>
                    `;
                    userTable.innerHTML += row;
                }
            });
        } catch (error) {
            console.error("Error loading users:", error);
        }
    }
    
    async function loadOffices(selectElementId, selectedOffice = "") {
        try {
            const response = await fetch("http://localhost:3000/offices"); // Fetch office list
            if (!response.ok) throw new Error("Failed to load offices.");
    
            const offices = await response.json();
            const officeSelect = document.getElementById(selectElementId);
            
            // Ensure officeSelect exists before modifying it
            if (!officeSelect) {
                console.error(`Dropdown with ID ${selectElementId} not found.`);
                return;
            }
    
            // Clear dropdown and add default option
            officeSelect.innerHTML = '<option value="" disabled>Select Office</option>';
    
            offices.forEach(office => {
                let option = document.createElement("option");
                option.value = office.officeName;
                option.textContent = office.officeName;
                
                // Pre-select the current office if editing a user
                if (selectedOffice && office.officeName === selectedOffice) {
                    option.selected = true;
                }
    
                officeSelect.appendChild(option);
            });
    
            console.log(`Offices loaded for ${selectElementId}:`, offices);
        } catch (error) {
            console.error("Error loading offices:", error);
        }
    }
    
    // Open Edit User Modal
    window.editUser = async function (userId) {
        try {
            // Fetch user data
            const response = await fetch(`http://localhost:3000/users/${userId}`);
            if (!response.ok) throw new Error("Failed to fetch user details.");
            const user = await response.json();
    
            // Populate form fields (except office dropdown for now)
            document.getElementById("editUserId").value = user.id;
            document.getElementById("editFirstName").value = user.firstName;
            document.getElementById("editLastName").value = user.lastName;
            document.getElementById("editRole").value = user.role;
            document.getElementById("editNumber").value = user.number;
            document.getElementById("editAddress").value = user.address;
            document.getElementById("editBirthday").value = user.birthday;
    
            // Load office options first, then pre-select the user's current office
            await loadOffices("editOffice", user.office);
    
            // Show the modal after loading office options
            document.getElementById("editUserModal").style.display = "block";
        } catch (error) {
            console.error("Error fetching user details:", error);
        }
    };
    
    
// Close Edit User Modal
window.closeEditUserModal = function () {
    document.getElementById("editUserModal").style.display = "none";
};

// Update User Information
window.updateUser = async function () {
    const userId = document.getElementById("editUserId").value;

    const updatedUser = {
        firstName: document.getElementById("editFirstName").value.trim(),
        lastName: document.getElementById("editLastName").value.trim(),
        role: document.getElementById("editRole").value,
        office: document.getElementById("editOffice").value,
        number: document.getElementById("editNumber").value.trim(),
        address: document.getElementById("editAddress").value.trim(),
        birthday: document.getElementById("editBirthday").value
    };

    try {
        const response = await fetch(`http://localhost:3000/users/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedUser)
        });

        const data = await response.json();
        console.log("User updated:", data);

        loadUsers(); // Refresh the table
        closeEditUserModal();
    } catch (error) {
        console.error("Error updating user:", error);
    }
};
    
window.openUserModal = function () {
    // Load office options when opening the modal
    loadOffices("userOffice"); 
    document.getElementById("userModal").style.display = "block";
};

    window.closeUserModal = function () {
        userModal.style.display = "none";
    };

    window.showUserFields = function () {
        if (userRoleSelect.value) {
            userFields.style.display = "block";
        }
    };

    window.addUser = async function () {
        const newUser = {
            role: userRoleSelect.value,
            office: userOfficeSelect.value,
            firstName: document.getElementById("firstName").value.trim(),
            lastName: document.getElementById("lastName").value.trim(),
            number: document.getElementById("number").value.trim(),
            address: document.getElementById("address").value.trim(),
            birthday: document.getElementById("birthday").value
        };

        if (!newUser.firstName || !newUser.lastName || !newUser.number || !newUser.address || !newUser.birthday || !newUser.office) {
            alert("Please fill in all required fields.");
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser)
            });

            const data = await response.json();
            console.log("User added:", data);
            loadUsers();
            closeUserModal();
        } catch (error) {
            console.error("Error adding user:", error);
        }
    };

    window.deleteUser = async function (userId) {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            await fetch(`${API_URL}/${userId}`, { method: "DELETE" });
            loadUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    window.editUser = async function (userId) {
        try {
            // Fetch user data
            const response = await fetch(`http://localhost:3000/users/${userId}`);
            if (!response.ok) throw new Error("Failed to fetch user details.");
            const user = await response.json();
    
            // Populate form fields (except office dropdown)
            document.getElementById("editUserId").value = user.id;
            document.getElementById("editFirstName").value = user.firstName;
            document.getElementById("editLastName").value = user.lastName;
            document.getElementById("editRole").value = user.role;
            document.getElementById("editNumber").value = user.number;
            document.getElementById("editAddress").value = user.address;
            document.getElementById("editBirthday").value = user.birthday;
    
            // Load office options and pre-select the user's current office
            await loadOffices("editOffice", user.office);
    
            // Show the modal only after loading office options
            document.getElementById("editUserModal").style.display = "block";
        } catch (error) {
            console.error("Error fetching user details:", error);
        }
    };
    
    
    // Close Edit User Modal
    window.closeEditUserModal = function () {
        document.getElementById("editUserModal").style.display = "none";
    };
    
    // Update User Information
    window.updateUser = async function () {
        const userId = document.getElementById("editUserId").value;
    
        const updatedUser = {
            firstName: document.getElementById("editFirstName").value.trim(),
            lastName: document.getElementById("editLastName").value.trim(),
            role: document.getElementById("editRole").value,
            office: document.getElementById("editOffice").value,
            number: document.getElementById("editNumber").value.trim(),
            address: document.getElementById("editAddress").value.trim(),
            birthday: document.getElementById("editBirthday").value
        };
    
        try {
            const response = await fetch(`http://localhost:3000/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedUser)
            });
    
            const data = await response.json();
            console.log("User updated:", data);
    
            loadUsers(); // Refresh table
            closeEditUserModal();
        } catch (error) {
            console.error("Error updating user:", error);
        }
    };
    window.addTask = async function () {
        console.log("Add Task button clicked!"); // Debugging
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    
        if (!loggedInUser) {
            alert("You must be logged in to add a task.");
            return;
        }
    
        const newTask = {
            title: document.getElementById("taskTitle").value.trim(),
            description: document.getElementById("taskDescription").value.trim(),
            startDate: document.getElementById("startDate").value,
            endDate: document.getElementById("endDate").value,
            status: document.getElementById("taskStatus").value,
            assignedTo: loggedInUser.username,
            createdBy: loggedInUser.username
        };
    
        if (!newTask.title || !newTask.startDate || !newTask.endDate) {
            alert("Please fill in all required fields.");
            return;
        }
    
        try {
            const response = await fetch("http://localhost:3000/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask)
            });
    
            if (!response.ok) {
                throw new Error("Failed to add task.");
            }
    
            const data = await response.json();
            console.log("Task added:", data);
    
            loadTasks(); // Refresh the task list
            closeTaskModal(); // Hide modal after adding task
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Failed to add task.");
        }
    };
    

    loadUsers();
});
