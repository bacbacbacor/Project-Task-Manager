async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMessage = document.getElementById("errorMessage");

    try {
        const response = await fetch("http://localhost:3000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.status !== 200) {
            errorMessage.textContent = data.message;
            return;
        }

        // ✅ Ensure `id` is included in the user data before saving it
        if (!data.id) {
            console.error("❌ User ID is missing from the login response. Check backend.");
            errorMessage.textContent = "Login failed: Missing user ID.";
            return;
        }

        localStorage.setItem("loggedInUser", JSON.stringify({
            id: data.id, // ✅ Store ID properly
            username: data.username,
            role: data.role,
            firstName: data.firstName,
            lastName: data.lastName,
            office: data.office || "Unknown", // ✅ Ensure office is stored
            firstTimeLogin: data.firstTimeLogin
        }));

        console.log("✅ Logged-in user saved:", localStorage.getItem("loggedInUser"));

        if (data.firstTimeLogin) {
            window.location.href = "change-password.html";
            return;
        }

        if (data.role === "Admin") {
            window.location.href = "admin.html";
        } else if (data.role === "Manager") {
            window.location.href = "manager.html";
        } else if (data.role === "Employee") {
            window.location.href = "employee.html";
        }
    } catch (error) {
        errorMessage.textContent = "Error connecting to server.";
        console.error("Login error:", error);
    }
}
