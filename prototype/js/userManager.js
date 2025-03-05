// userManager.js
document.addEventListener("DOMContentLoaded", function () {
    const userTable = document.getElementById("userTable").querySelector("tbody");
    const userModal = document.getElementById("userModal");
    const userRoleSelect = document.getElementById("userRole");
    const userOfficeSelect = document.getElementById("userOffice");
    const userFields = document.getElementById("userFields");
    const API_URL = "http://localhost:3000/users";

    async function loadUsers() {
        try {
            const response = await fetch("http://localhost:3000/users");
            const users = await response.json();

            document.getElementById("totalUsers").textContent = users.length;
            document.getElementById("totalManagers").textContent = users.filter(user => user.role === "Manager").length;
            document.getElementById("totalEmployees").textContent = users.filter(user => user.role === "Employee").length;

            const userTable = document.getElementById("userTable").querySelector("tbody");
            userTable.innerHTML = ""; // Clear previous users

            users.forEach((user) => {
                let row = `
                    <tr>
                        <td>${user.id}</td>
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
            });
        } catch (error) {
            console.error("❌ Error loading users:", error);
        }
    }

    async function loadOffices(selectElementId, selectedOffice = "") {
        try {
            const response = await fetch("http://localhost:3000/offices");
            if (!response.ok) throw new Error("Failed to load offices.");

            const offices = await response.json();
            const officeSelect = document.getElementById(selectElementId);

            if (!officeSelect) {
                console.error(`Dropdown with ID ${selectElementId} not found.`);
                return;
            }

            officeSelect.innerHTML = '<option value="" disabled>Select Office</option>';

            offices.forEach(office => {
                let option = document.createElement("option");
                option.value = office.officeName;
                option.textContent = office.officeName;

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

    // Opens the Edit User modal, populates the fields, and stores fallback values.
    window.editUser = async function (userId) {
        try {
            const response = await fetch(`http://localhost:3000/users/${userId}`);
            if (!response.ok) throw new Error("Failed to fetch user details.");
            const user = await response.json();

            // Populate modal fields with current values.
            document.getElementById("editUserId").value = user.id;
            document.getElementById("editFirstName").value = user.firstName || "";
            document.getElementById("editLastName").value = user.lastName || "";
            document.getElementById("editRole").value = user.role || "";
            await loadOffices("editOffice", user.office);
            document.getElementById("editNumber").value = user.number || "";
            document.getElementById("editAddress").value = user.address || "";
            document.getElementById("editBirthday").value = user.birthday || "";

            // Store original values in modal's dataset for fallback.
            const modal = document.getElementById("editUserModal");
            modal.dataset.originalNumber = user.number || "";
            modal.dataset.originalAddress = user.address || "";
            modal.dataset.originalBirthday = user.birthday || "";
            modal.dataset.originalOffice = user.office || "";
            modal.dataset.originalRole = user.role || "";

            // Show the modal.
            modal.style.display = "block";
        } catch (error) {
            console.error("Error fetching user details:", error);
        }
    };

    // Closes the Edit User modal.
    window.closeEditUserModal = function () {
        document.getElementById("editUserModal").style.display = "none";
    };

    // Opens the Add User modal.
    window.openUserModal = function () {
        loadOffices("userOffice");
        document.getElementById("userModal").style.display = "block";
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
            closeUserModal(); // UPDATED: Closes the Add User modal after saving.
        } catch (error) {
            console.error("Error adding user:", error);
        }
    };

    // UPDATED: This function now targets the correct modal element ("userModal") so that it will close the Add User window.
    window.closeUserModal = function () {
        document.getElementById("userModal").style.display = "none";
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

    // (The rest of your code for task management remains unchanged.)
    window.addTask = async function () {
        console.log("Add Task button clicked!");
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
            assignedTo: loggedInUser.firstName,
            createdBy: loggedInUser.firstName
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

            loadUsers(); // Or load tasks if that is intended.
            closeUserModal(); // If this modal should close when a task is added.
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Failed to add task.");
        }
    };

    window.updateUser = async function () {
        const id = document.getElementById("editUserId").value;
        const firstName = document.getElementById("editFirstName").value.trim();
        const lastName = document.getElementById("editLastName").value.trim();
        const role = document.getElementById("editRole").value;
        const office = document.getElementById("editOffice").value;
        const number = document.getElementById("editNumber").value.trim();
        const address = document.getElementById("editAddress").value.trim();
        let birthday = document.getElementById("editBirthday").value;
        const modal = document.getElementById("editUserModal");
        
        // If birthday input is empty, fallback to the original value stored in dataset.
        if (!birthday && modal.dataset.originalBirthday) {
            birthday = modal.dataset.originalBirthday;
        }
        
        // Convert birthday to the "YYYY-MM-DD" format, if a value exists.
        if (birthday) {
            birthday = new Date(birthday).toISOString().slice(0, 10);
        }
        
        if (!firstName || !lastName || !role || !office) {
            alert("Please fill in all required fields.");
            return;
        }
    
        const updatedUser = { firstName, lastName, role, office, number, address, birthday };
    
        try {
            const response = await fetch(`http://localhost:3000/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedUser)
            });
    
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to update user.");
            }
            alert("User updated successfully!");
            window.location.reload();
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Error updating user: " + error.message);
        }
    
        window.closeEditUserModal();
    };

    loadUsers();
});
