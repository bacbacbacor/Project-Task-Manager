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
            userTable.innerHTML = ""; 
    
            users.forEach((user) => {
                if (user.role !== "Admin") { 
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
                }
            });
        } catch (error) {
            console.error("Error loading users:", error);
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
    
    
    window.editUser = async function (userId) {
        try {
           
            const response = await fetch(`http://localhost:3000/users/${userId}`);
            if (!response.ok) throw new Error("Failed to fetch user details.");
            const user = await response.json();
    
            
            document.getElementById("editUserId").value = user.id;
            document.getElementById("editFirstName").value = user.firstName;
            document.getElementById("editLastName").value = user.lastName;
            document.getElementById("editRole").value = user.role;
            document.getElementById("editNumber").value = user.number;
            document.getElementById("editAddress").value = user.address;
            document.getElementById("editBirthday").value = user.birthday;
    
            
            await loadOffices("editOffice", user.office);
    
            
            document.getElementById("editUserModal").style.display = "block";
        } catch (error) {
            console.error("Error fetching user details:", error);
        }
    };
    
    

window.closeEditUserModal = function () {
    document.getElementById("editUserModal").style.display = "none";
};


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

        loadUsers(); 
        closeEditUserModal();
    } catch (error) {
        console.error("Error updating user:", error);
    }
};
    
window.openUserModal = function () {
    
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
            
            const response = await fetch(`http://localhost:3000/users/${userId}`);
            if (!response.ok) throw new Error("Failed to fetch user details.");
            const user = await response.json();
    
            
            document.getElementById("editUserId").value = user.id;
            document.getElementById("editFirstName").value = user.firstName;
            document.getElementById("editLastName").value = user.lastName;
            document.getElementById("editRole").value = user.role;
            document.getElementById("editNumber").value = user.number;
            document.getElementById("editAddress").value = user.address;
            document.getElementById("editBirthday").value = user.birthday;
    
            
            await loadOffices("editOffice", user.office);
    
         
            document.getElementById("editUserModal").style.display = "block";
        } catch (error) {
            console.error("Error fetching user details:", error);
        }
    };
    
    
   
    window.closeEditUserModal = function () {
        document.getElementById("editUserModal").style.display = "none";
    };
    
   
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
    
            loadUsers(); 
            closeEditUserModal();
        } catch (error) {
            console.error("Error updating user:", error);
        }
    };
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
    
            loadTasks(); 
            closeTaskModal(); 
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Failed to add task.");
        }
    };
    

    loadUsers();
});
