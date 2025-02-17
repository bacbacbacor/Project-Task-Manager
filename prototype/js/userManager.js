document.addEventListener("DOMContentLoaded", function () {
    const userTable = document.getElementById("userTable").querySelector("tbody");
    const userModal = document.getElementById("userModal");
    const userRoleSelect = document.getElementById("userRole");
    const userOfficeSelect = document.getElementById("userOffice");
    const userFields = document.getElementById("userFields");
    const API_URL = "http://localhost:3000/users"; // Backend API URL

    async function loadUsers() {
        try {
            const response = await fetch(API_URL);
            const users = await response.json();

            // Update user counts in dashboard
            document.getElementById("totalUsers").textContent = users.length;
            document.getElementById("totalManagers").textContent = users.filter(user => user.role === "Manager").length;
            document.getElementById("totalEmployees").textContent = users.filter(user => user.role === "Employee").length;

            // Load users into the table
            userTable.innerHTML = "";
            users.forEach((user) => {
                if (user.role !== "Admin") {
                    let row = `
                        <tr>
                            <td>${user.firstName} ${user.lastName}</td>
                            <td>${user.role}</td>
                            <td>${user.office || "N/A"}</td>
                            <td><button onclick="deleteUser(${user.id})">Delete</button></td>
                        </tr>
                    `;
                    userTable.innerHTML += row;
                }
            });
        } catch (error) {
            console.error("Error loading users:", error);
        }
    }

    async function loadOffices() {
        try {
            const response = await fetch("http://localhost:3000/offices");
            if (!response.ok) throw new Error("Failed to load offices.");
            
            const offices = await response.json();
            
            // Ensure dropdown is cleared before adding new options
            userOfficeSelect.innerHTML = '<option value="" disabled selected>Select Office</option>';
    
            offices.forEach(office => {
                let option = document.createElement("option");
                option.value = office.officeName;
                option.textContent = office.officeName;
                userOfficeSelect.appendChild(option);
            });
    
            console.log("Offices loaded:", offices); // Debugging
        } catch (error) {
            console.error("Error fetching offices:", error);
        }
    }
    
    window.openUserModal = function () {
        loadOffices();
        userModal.style.display = "block";
        userFields.style.display = "none";
        userRoleSelect.value = "";
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

    loadUsers();
});
