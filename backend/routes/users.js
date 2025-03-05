const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db"); // ✅ Import MySQL connection

const router = express.Router();

// **GET: Fetch all users from MySQL**
router.get("/", async (req, res) => {
    try {
        const [users] = await pool.query("SELECT id, username, role, office, firstName, lastName FROM users");
        res.json(users);
    } catch (error) {
        console.error("Error fetching users from MySQL:", error);
        res.status(500).json({ message: "Server error while fetching users." });
    }
});

// **POST: Create a new user (Ensuring Correct Username Format)**
router.post("/", async (req, res) => {
    const { role, office, firstName, lastName, number, address, birthday } = req.body;

    if (!role || !firstName || !lastName) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    try {
        const defaultPassword = await bcrypt.hash("default123", 10); // ✅ Hash default password

        // ✅ Insert user with username set as 'user' + AUTO_INCREMENT ID
        const [result] = await pool.query(
            "INSERT INTO users (username, password, role, office, firstName, lastName, number, address, birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [`PENDING`, defaultPassword, role, office, firstName, lastName, number, address, birthday]
        );

        const userId = result.insertId; // Get the new user ID
        const username = `user${userId}`;

        // ✅ Immediately set the correct username in the database
        await pool.query("UPDATE users SET username = ? WHERE id = ?", [username, userId]);

        res.json({ message: "User created successfully.", userId, username });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Server error while creating user." });
    }
});

// **POST: Update Password**
router.post("/update-password", async (req, res) => {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
        return res.status(400).json({ message: "Username and new password are required." });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [result] = await pool.query(
            "UPDATE users SET password = ? WHERE username = ?",
            [hashedPassword, username]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({ message: "Password updated successfully." });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: "Server error while updating password." });
    }
});

// **PUT: Update user details**
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, role, office, number, address, birthday } = req.body;

    if (!firstName || !lastName || !role || !office) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    try {
        const [result] = await pool.query(
            "UPDATE users SET firstName = ?, lastName = ?, role = ?, office = ?, number = ?, address = ?, birthday = ? WHERE id = ?",
            [firstName, lastName, role, office, number || null, address || null, birthday || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found or no changes detected." });
        }

        res.json({ message: "✅ User updated successfully!" });
    } catch (error) {
        console.error("❌ Error updating user:", error);
        res.status(500).json({ message: "Server error while updating user." });
    }
});




// **DELETE: Remove user**
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({ message: "User deleted successfully." });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Server error while deleting user." });
    }
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await pool.query(
            "SELECT id, username, role, office, firstName, lastName, number, address, birthday FROM users WHERE id = ?",
            [id]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json(users[0]);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error while fetching user." });
    }
});



module.exports = router;
