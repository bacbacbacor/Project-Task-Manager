<!-- login.svelte -->
<script>
    import { push } from 'svelte-spa-router';
  
    // Component state variables
    let username = "";
    let password = "";
    let errorMessage = "";
  
    // Login function (converted from your login.js)
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
  
            // Ensure user id is received
            if (!data.id) {
                errorMessage = "Login failed: Missing user ID.";
                return;
            }
  
            // Save user details into localStorage
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
                }),
            );
  
            // Redirect based on firstTimeLogin and role
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
    /* Adapted styles from your styles.css */
    .login-container {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 50px auto;
        padding: 20px;
        max-width: 400px;
        text-align: center;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .login-container h2 {
        margin-bottom: 20px;
    }

    .login-container input {
        width: 100%;
        padding: 10px;
        margin: 10px 0;
        box-sizing: border-box;
    }

    .login-container button {
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        border: none;
        cursor: pointer;
        margin-top: 10px;
    }

    .login-container button:hover {
        background-color: #0056b3;
    }

    .error-message {
        color: red;
        margin-top: 10px;
    }
</style>
