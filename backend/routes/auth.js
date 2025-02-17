const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const usersFilePath = path.join(__dirname, "../data/users.json");

// Load users
const loadUsers = () => {
    if (!fs.existsSync(usersFilePath)) {
        fs.writeFileSync(usersFilePath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(usersFilePath));
};

// **POST: Login Authentication**
router.post("/login", (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    // Check if the user is using the default password
    const firstTimeLogin = user.password === "default123";

    res.json({
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        firstTimeLogin: firstTimeLogin // Send this flag to the frontend
    });
});

module.exports = router; // 🔹 Ensure module.exports is correct
