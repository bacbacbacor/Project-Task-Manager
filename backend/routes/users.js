const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const usersFilePath = path.join(__dirname, "../data/users.json");


const loadUsers = () => {
    if (!fs.existsSync(usersFilePath)) {
        fs.writeFileSync(usersFilePath, JSON.stringify([])); // Create empty file if missing
    }
    return JSON.parse(fs.readFileSync(usersFilePath));
};


const saveUsers = (users) => {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};


router.get("/", (req, res) => {
    res.json(loadUsers());
});


router.post("/", (req, res) => {
    const users = loadUsers();
    const newId = users.length > 0 ? users[users.length - 1].id + 1 : 1;
    let newUsername = `user${newId}`;
    const newUser = {
        id: newId,
        username: newUsername,
        password: "default123", 
        role: req.body.role,
        office: req.body.office,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        number: req.body.number,
        address: req.body.address,
        birthday: req.body.birthday
    };

    users.push(newUser);
    saveUsers(users);
    
    res.json(newUser);
});


router.delete("/:id", (req, res) => {
    let users = loadUsers();
    const userId = parseInt(req.params.id);
    users = users.filter(user => user.id !== userId);
    saveUsers(users);
    res.json({ message: "User deleted successfully" });
});

router.post("/update-password", (req, res) => {
    const { username, newPassword } = req.body;
    let users = loadUsers();

    let user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword; 
    saveUsers(users);

    res.json({ message: "Password updated successfully" });
});

router.put("/:id", (req, res) => {
    let users = loadUsers();
    const userId = parseInt(req.params.id);
    let userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: "User not found" });
    }

  
    users[userIndex] = { ...users[userIndex], ...req.body };

    saveUsers(users);
    res.json({ message: "User updated successfully", user: users[userIndex] });
});

router.put("/:id", (req, res) => {
    let users = loadUsers();
    const userId = parseInt(req.params.id);
    let userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: "User not found" });
    }

   
    users[userIndex] = { ...users[userIndex], ...req.body };

    saveUsers(users);
    res.json({ message: "User updated successfully", user: users[userIndex] });
});

router.get("/:id", (req, res) => {
    const users = loadUsers();
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
});

module.exports = router;
