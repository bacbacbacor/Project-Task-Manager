document.addEventListener("DOMContentLoaded", function () {
    const userTable = document.getElementById("userTable").querySelector("tbody");
    const userModal = document.getElementById("userModal");
    const userRoleSelect = document.getElementById("userRole");
    const userOfficeSelect = document.getElementById("userOffice");

    function loadUsers() {
        let users = JSON.parse(localStorage.getItem("users")) || [];

        userTable.innerHTML = ""; // Clear table before loading users

        users.forEach((user, index) => {
            if (user.role !== "Admin") {
                let row = `
                    <tr>
                        <td>${user.firstName} ${user.lastName}</td>
                        <td>${user.role}</td>
                        <td>${user.office || "N/A"}</td>
                        <td>
                            <button onclick="deleteUser(${index})">Delete</button>
                        </td>
                    </tr>
                `;
                userTable.innerHTML += row;
            }
        });
    }

    async function loadOffices() {
        let offices = [];
        try {
            let response = await fetch("data/offices.json");
            if (!response.ok) throw new Error("Failed to load offices.");
            offices = await response.json();
            localStorage.setItem("offices", JSON.stringify(offices));
        } catch (error) {
            console.error("Error fetching offices:", error);
            offices = JSON.parse(localStorage.getItem("offices")) || [];
        }

        userOfficeSelect.innerHTML = '<option value="" disabled selected>Select Office</option>';
        offices.forEach(office => {
            let option = document.createElement("option");
            option.value = office.officeName;
            option.textContent = office.officeName;
            userOfficeSelect.appendChild(option);
        });
    }

    loadOffices();

    window.openUserModal = function () {
        loadOffices();
        userModal.style.display = "block";
    };

    window.closeUserModal = function () {
        userModal.style.display = "none";
    };

    window.addUser = function () {
        let users = JSON.parse(localStorage.getItem("users")) || [];

        let newUser = {
            username: "user" + (users.length + 1),
            password: "default123",
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

        users.push(newUser);
        localStorage.setItem("users", JSON.stringify(users));
        loadUsers();
        closeUserModal();
    };

    window.deleteUser = function (index) {
        let users = JSON.parse(localStorage.getItem("users"));
        if (confirm("Are you sure you want to delete this user?")) {
            users.splice(index, 1);
            localStorage.setItem("users", JSON.stringify(users));
            loadUsers();
        }
    };

    loadUsers();
});
