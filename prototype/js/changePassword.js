async function updatePassword() {
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const errorMessage = document.getElementById("errorMessage");

    if (!newPassword || !confirmPassword) {
        errorMessage.textContent = "Please enter a new password.";
        return;
    }

    if (newPassword !== confirmPassword) {
        errorMessage.textContent = "Passwords do not match.";
        return;
    }

    // Get logged-in user from localStorage
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
        errorMessage.textContent = "Session expired. Please log in again.";
        setTimeout(() => window.location.href = "index.html", 2000);
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/users/update-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: loggedInUser.username,
                newPassword: newPassword
            })
        });

        const data = await response.json();
        alert(data.message);

        // Clear session and redirect to login
        localStorage.removeItem("loggedInUser"); // Log the user out
        setTimeout(() => window.location.href = "index.html", 1500); // Redirect to login page
    } catch (error) {
        errorMessage.textContent = "Error updating password.";
        console.error("Password update error:", error);
    }
}
