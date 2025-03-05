<script>
  let username = '';
  let password = '';
  let errorMessage = '';

  async function login() {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword })
      });

      const data = await response.json();

      if (response.status !== 200) {
        errorMessage = data.message;
        return;
      }

      if (!data.id) {
        console.error("User ID is missing from the login response. Check backend.");
        errorMessage = "Login failed: Missing user ID.";
        return;
      }

      localStorage.setItem("loggedInUser", JSON.stringify({
        id: data.id,
        username: data.username,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        office: data.office || "Unknown",
        firstTimeLogin: data.firstTimeLogin
      }));

      console.log("Logged-in user saved:", localStorage.getItem("loggedInUser"));

      if (data.firstTimeLogin) {
        window.location.href = "/change-password";
        return;
      }

      if (data.role === "Admin") {
        window.location.href = "/admin";
      } else if (data.role === "Manager") {
        window.location.href = "/manager";
      } else if (data.role === "Employee") {
        window.location.href = "/employee";
      }
    } catch (error) {
      errorMessage = "Error connecting to server.";
      console.error("Login error:", error);
    }
  }
</script>

<div class="login-container">
  <h2>Login</h2>
  <input type="text" placeholder="Username" bind:value={username} />
  <input type="password" placeholder="Password" bind:value={password} />
  <button on:click={login}>Login</button>
  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
</div>

<style>
  .login-container {
    max-width: 400px;
    margin: 40px auto;
    padding: 20px;
    background: #f4f4f4;
    border-radius: 8px;
    text-align: center;
  }

  .login-container input {
    display: block;
    width: 100%;
    padding: 8px;
    margin: 10px 0;
  }

  .login-container button {
    padding: 10px 20px;
    font-size: 16px;
    margin-top: 10px;
  }

  .error-message {
    color: red;
  }
</style>
