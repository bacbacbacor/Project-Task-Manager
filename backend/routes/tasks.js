const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const tasksFilePath = path.join(__dirname, "../data/tasks.json");

// **Helper Functions**
const loadTasks = () => {
    if (!fs.existsSync(tasksFilePath)) {
        fs.writeFileSync(tasksFilePath, JSON.stringify([])); // Create empty file if missing
    }
    return JSON.parse(fs.readFileSync(tasksFilePath));
};

const saveTasks = (tasks) => {
    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
};

// **GET: Retrieve Tasks (Admins see all, Employees/Managers see their own)**
router.get("/", (req, res) => {
    try {
        const tasks = loadTasks();
        const username = req.query.username; // Get username
        const role = req.query.role; // Get role

        if (!username || !role) {
            return res.status(400).json({ message: "Username and role are required." });
        }

        let userTasks;
        if (role === "Admin") {
            userTasks = tasks; // ✅ Admins see all tasks
        } else {
            userTasks = tasks.filter(task => 
                task.assignedTo === username || task.createdBy === username
            ); // ✅ Employees/Managers see their own tasks
        }

        console.log(`📌 Returning ${userTasks.length} tasks for ${role} (${username})`);
        res.json(userTasks);
    } catch (error) {
        res.status(500).json({ message: "Error loading tasks." });
    }
});

// **GET: Fetch a Single Task by ID**
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

// **POST: Add a New Task**
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
        assignedTo,  // The employee username
        createdBy // The Admin or Manager who assigned the task
    };

    tasks.push(newTask);
    saveTasks(tasks);

    res.json({ message: "Task assigned successfully", task: newTask });
});

// **PUT: Update an Existing Task**
router.put("/:id", (req, res) => {
    let tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    let taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
        return res.status(404).json({ message: "Task not found." });
    }

    const { username, role } = req.body; // Get user info

    // Allow Admins/Managers to edit any task they assigned
    if (tasks[taskIndex].assignedTo !== username && tasks[taskIndex].createdBy !== username && role !== "Admin") {
        return res.status(403).json({ message: "You can only edit your assigned or created tasks." });
    }

    // Update task fields
    tasks[taskIndex] = { ...tasks[taskIndex], ...req.body };

    saveTasks(tasks);
    res.json({ message: "Task updated successfully", task: tasks[taskIndex] });
});

// **DELETE: Remove a Task by ID**
router.delete("/:id", (req, res) => {
    let tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks(tasks);
    res.json({ message: "Task deleted successfully" });
});

module.exports = router;
