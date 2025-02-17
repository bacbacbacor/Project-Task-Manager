document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();

            if (username === "" || password === "") {
                alert("Please enter both username and password.");
                return;
            }

            try {
                const response = await fetch("data/users.json");
                const users = await response.json();

                const user = users.find(u => u.username === username && u.password === password);

                if (user) {

                    localStorage.setItem("loggedInUser", JSON.stringify(user));

                    switch (user.role) {
                        case "Admin":
                            window.location.href = "admin.html";
                            break;
                        case "Manager":
                            window.location.href = "manager.html";
                            break;
                        case "Employee":
                            window.location.href = "employee.html";
                            break;
                        default:
                            alert("Unknown role. Please contact support.");
                    }
                } else {
                    alert("Invalid username or password.");
                }
            } catch (error) {
                console.error("Error loading users:", error);
                alert("Error logging in. Please try again.");
            }
        });
    }
    function checkAuth() {
        const user = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!user) {
            window.location.href = "index.html";
        }
    }

    if (window.location.pathname.includes("admin.html") ||
        window.location.pathname.includes("manager.html") ||
        window.location.pathname.includes("employee.html")) {
        checkAuth();
    }
});
