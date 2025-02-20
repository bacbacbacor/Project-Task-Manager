const express = require('express');
const router = express.Router();
const fs = require('fs');

// Function to load users from users.json
const loadUsers = () => {
    const data = fs.readFileSync('data/users.json', 'utf-8');
    return JSON.parse(data);
};

router.get("/", (req, res) => {
    try {
        let users = loadUsers();

        // Ensure all users have role and office before sending
        users = users.map(user => ({
            id: user.id,
            username: user.username,
            role: user.role || "Employee", // Default to Employee if missing
            office: user.office || "Unknown", // Default office if missing
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            number: user.number || "",
            address: user.address || "",
            birthday: user.birthday || ""
        }));

        console.log("✅ Sending users with role & office:", users);
        res.json(users);
    } catch (error) {
        console.error("❌ Error loading users:", error);
        res.status(500).json({ error: "Failed to load users" });
    }
});

// ✅ Additional User Routes (Unchanged)
router.get("/:username", (req, res) => {
    try {
        const users = loadUsers();
        const user = users.find(u => u.username === req.params.username);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("❌ Error retrieving user:", error);
        res.status(500).json({ error: "Failed to retrieve user" });
    }
});

// ✅ Route to Add a New User
router.post("/", (req, res) => {
    try {
        let users = loadUsers();
        const newUser = {
            id: users.length + 1,
            username: req.body.username,
            password: req.body.password,
            role: req.body.role || "Employee", // Default to Employee
            office: req.body.office || "Unknown", // Default office
            firstName: req.body.firstName || "",
            lastName: req.body.lastName || "",
            number: req.body.number || "",
            address: req.body.address || "",
            birthday: req.body.birthday || ""
        };

        users.push(newUser);
        fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
        console.log("✅ New user added:", newUser);
        res.status(201).json(newUser);
    } catch (error) {
        console.error("❌ Error adding user:", error);
        res.status(500).json({ error: "Failed to add user" });
    }
});

// ✅ Route to Update a User
router.put("/:username", (req, res) => {
    try {
        let users = loadUsers();
        const index = users.findIndex(u => u.username === req.params.username);

        if (index === -1) {
            return res.status(404).json({ error: "User not found" });
        }

        users[index] = { ...users[index], ...req.body };
        fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));

        console.log("✅ User updated:", users[index]);
        res.json(users[index]);
    } catch (error) {
        console.error("❌ Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});

// ✅ Route to Delete a User
router.delete("/:username", (req, res) => {
    try {
        let users = loadUsers();
        const filteredUsers = users.filter(u => u.username !== req.params.username);

        if (users.length === filteredUsers.length) {
            return res.status(404).json({ error: "User not found" });
        }

        fs.writeFileSync('data/users.json', JSON.stringify(filteredUsers, null, 2));

        console.log("✅ User deleted:", req.params.username);
        res.status(204).send();
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

module.exports = router;
