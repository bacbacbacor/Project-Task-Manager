<!-- login.svelte -->
<script>
  import { push } from "svelte-spa-router";
  import { fade } from "svelte/transition";

  let username = "";
  let password = "";
  let errorMessage = "";

  async function login() {
    errorMessage = "";
    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.status !== 200) {
        errorMessage = data.message;
        return;
      }

      if (!data.id) {
        errorMessage = "Login failed: Missing user ID.";
        return;
      }

      localStorage.setItem(
        "loggedInUser",
        JSON.stringify({
          id: data.id,
          username: data.username,
          role: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
          office: data.office || "Unknown",
          firstTimeLogin: data.firstTimeLogin,
        })
      );

      if (data.firstTimeLogin) {
        window.location.href = "/change-password";
        return;
      }
      if (data.role === "Admin") {
        push("/admin");
      } else if (data.role === "Manager") {
        push("/manager");
      } else if (data.role === "Employee") {
        push("/employee");
      }
    } catch (error) {
      console.error("Login error:", error);
      errorMessage = "Error connecting to server.";
    }
  }
</script>

<div class="login-container" transition:fade>
  <h2>Login</h2>
  <input
    type="text"
    placeholder="Username"
    bind:value={username}
    aria-label="Enter your username"
  />
  <input
    type="password"
    placeholder="Password"
    bind:value={password}
    aria-label="Enter your password"
  />
  <button on:click={login} aria-label="Login">Login</button>
  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
</div>

<style>
  /* Global styles to match the admin UI design */
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    background: #f4f7f9;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }

  .login-container {
    background-color: #fff;
    padding: 30px 40px;
    width: 100%;
    max-width: 400px;
    text-align: center;
    border-radius: 12px;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease-in-out;
  }

  .login-container:hover {
    transform: scale(1.01);
  }

  .login-container h2 {
    margin-bottom: 20px;
    color: #333;
  }

  .login-container input {
    width: 100%;
    padding: 12px 15px;
    margin: 10px 0;
    box-sizing: border-box;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s;
  }

  .login-container input:focus {
    border-color: #2980b9;
    outline: none;
  }

  .login-container button {
    width: 50%;
    padding: 12px;
    background-color: #2980b9;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
  }

  .login-container button:hover {
    background-color: #1f6391;
    transform: translateY(-1px);
  }

  .error-message {
    color: #d8000c;
    background-color: #ffbaba;
    padding: 10px;
    border-radius: 6px;
    margin-top: 15px;
    font-size: 14px;
  }

  @media (max-width: 480px) {
    .login-container {
      margin: 20px;
      padding: 20px;
    }
  }
</style>
