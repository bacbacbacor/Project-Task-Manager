const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const tasksFilePath = path.join(__dirname, "../data/tasks.json");
const usersFilePath = path.join(__dirname, "../data/users.json"); // Add users.json

// Load tasks from file
const loadTasks = () => {
    if (!fs.existsSync(tasksFilePath)) {
        fs.writeFileSync(tasksFilePath, JSON.stringify([])); // Create empty file if missing
    }
    return JSON.parse(fs.readFileSync(tasksFilePath));
};

// Load users from file
const loadUsers = () => {
    if (!fs.existsSync(usersFilePath)) {
        fs.writeFileSync(usersFilePath, JSON.stringify([])); // Create empty file if missing
    }
    return JSON.parse(fs.readFileSync(usersFilePath));
};

// Save tasks to file
const saveTasks = (tasks) => {
    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
};

// **GET: Get tasks (Admins see all, Managers see employees in their office)**
router.get("/", (req, res) => {
    try {
        const tasks = loadTasks();
        const users = loadUsers();
        const username = req.query.username;
        const role = req.query.role;

        if (!username || !role) {
            return res.status(400).json({ message: "Username and role are required." });
        }

        let userTasks;
        if (role === "Admin") {
            userTasks = tasks; // ✅ Admins see all tasks
        } else if (role === "Manager") {
            // **Find Manager's Office**
            const manager = users.find(user => user.username === username);
            if (!manager) {
                return res.status(404).json({ message: "Manager not found in user list." });
            }
            const managerOffice = manager.office;

            // **Find Employees in the Same Office**
            const employeesInOffice = users
                .filter(user => user.role === "Employee" && user.office === managerOffice)
                .map(user => user.username);

            // **Filter Tasks: Manager sees their own + Employees' tasks in same office**
            userTasks = tasks.filter(task =>
                employeesInOffice.includes(task.assignedTo) || task.assignedTo === username
            );
        } else {
            // **Employees only see their own tasks**
            userTasks = tasks.filter(task => task.assignedTo === username);
        }

        console.log(`📌 Returning ${userTasks.length} tasks for ${role} (${username})`);
        res.json(userTasks);
    } catch (error) {
        res.status(500).json({ message: "Error loading tasks." });
    }
});

// **GET: Get a specific task by ID**
router.get("/:id", (req, res) => {
    try {
        const tasks = loadTasks();
        const taskId = parseInt(req.params.id);
        const task = tasks.find(task => task.id === taskId);

        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        res.json(task);
    } catch (error) {
        res.status(500).json({ message: "Error loading task details." });
    }
});

// **POST: Add a new task**
router.post("/", (req, res) => {
    const tasks = loadTasks();
    const { title, description, startDate, endDate, status, assignedTo, createdBy, role } = req.body;

    if (!title || !assignedTo || !createdBy || !role) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    // Only Admins & Managers can assign tasks
    if (role !== "Admin" && role !== "Manager") {
        return res.status(403).json({ message: "Only Admins and Managers can assign tasks." });
    }

    const newTask = {
        id: tasks.length > 0 ? tasks[tasks.length - 1].id + 1 : 1,
        title,
        description,
        startDate,
        endDate,
        status: status || "Pending",
        assignedTo,
        createdBy
    };

    tasks.push(newTask);
    saveTasks(tasks);

    res.json({ message: "Task assigned successfully", task: newTask });
});

// **PUT: Update an existing task**
router.put("/:id", (req, res) => {
    let tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    let taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
        return res.status(404).json({ message: "Task not found." });
    }

    const { username, role } = req.body;

    // Ensure only the assigned user, creator, or Admin can edit the task
    if (tasks[taskIndex].assignedTo !== username && tasks[taskIndex].createdBy !== username && role !== "Admin") {
        return res.status(403).json({ message: "You can only edit your assigned or created tasks." });
    }

    // Update task fields
    tasks[taskIndex] = { ...tasks[taskIndex], ...req.body };
    saveTasks(tasks);
    res.json({ message: "Task updated successfully", task: tasks[taskIndex] });
});

// **DELETE: Remove a task by ID**
router.delete("/:id", (req, res) => {
    let tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks(tasks);
    res.json({ message: "Task deleted successfully" });
});

module.exports = router;
