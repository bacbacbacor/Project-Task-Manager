<!-- ChangePassword.svelte -->
<script>
    let newPassword = "";
    let confirmPassword = "";
    let errorMessage = "";
  
    async function updatePassword() {
      errorMessage = "";
      if (!newPassword || !confirmPassword) {
        errorMessage = "Please enter a new password.";
        return;
      }
      if (newPassword !== confirmPassword) {
        errorMessage = "Passwords do not match.";
        return;
      }
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!loggedInUser) {
        errorMessage = "Session expired. Please log in again.";
        setTimeout(() => window.location.href = "/", 2000);
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
        if (response.ok) {
          alert("Password updated successfully! Redirecting to login...");
          localStorage.removeItem("loggedInUser");
          setTimeout(() => window.location.href = "/", 1500);
        } else {
          errorMessage = data.message;
        }
      } catch (error) {
        console.error("Password update error:", error);
        errorMessage = "Error updating password.";
      }
    }
  </script>
  
  <style>
    .password-container {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 50px auto;
      padding: 20px;
      max-width: 400px;
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .password-container h2 {
      margin-bottom: 20px;
    }
    .password-container input {
      width: 100%;
      padding: 10px;
      margin: 10px 0;
      box-sizing: border-box;
    }
    .password-container button {
      padding: 10px 20px;
      background-color: #007BFF;
      color: white;
      border: none;
      cursor: pointer;
      margin-top: 10px;
    }
    .password-container button:hover {
      background-color: #0056b3;
    }
    .error-message {
      color: red;
      margin-top: 10px;
    }
  </style>
  
  <div class="password-container">
    <h2>Change Your Password</h2>
    <input type="password" placeholder="New Password" bind:value={newPassword} />
    <input type="password" placeholder="Confirm Password" bind:value={confirmPassword} />
    <button on:click={updatePassword}>Update Password</button>
    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}
  </div>
  