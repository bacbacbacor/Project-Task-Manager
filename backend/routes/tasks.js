const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router(); // ✅ Ensure Router is Defined
const tasksFilePath = path.join(__dirname, "../data/tasks.json");

// Load tasks from file
const loadTasks = () => {
    if (!fs.existsSync(tasksFilePath)) {
        fs.writeFileSync(tasksFilePath, JSON.stringify([])); // Create empty file if missing
    }
    return JSON.parse(fs.readFileSync(tasksFilePath));
};

// Save tasks to file
const saveTasks = (tasks) => {
    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
};

// **GET: Get tasks (Admins see all, Employees/Managers see their own)**
router.get("/", (req, res) => {
    try {
        const tasks = loadTasks();
        const username = req.query.username; // Get username from request
        const role = req.query.role; // Get user role

        if (!username || !role) {
            return res.status(400).json({ message: "Username and role are required" });
        }

        let userTasks;
        if (role === "Admin") {
            userTasks = tasks; // Admins see all tasks
        } else {
            userTasks = tasks.filter(task => task.assignedTo === username); // Employees/Managers see their tasks only
        }

        console.log(`📌 Returning ${userTasks.length} tasks for ${role}`);
        res.json(userTasks);
    } catch (error) {
        res.status(500).json({ message: "Error loading tasks" });
    }
});

// **POST: Add a new task**
router.post("/", (req, res) => {
    const tasks = loadTasks();
    const newTask = {
        id: tasks.length > 0 ? tasks[tasks.length - 1].id + 1 : 1,
        title: req.body.title,
        description: req.body.description,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        status: req.body.status || "Pending",
        assignedTo: req.body.assignedTo, // Required for Admins & Managers assigning tasks
        createdBy: req.body.createdBy // Who added the task
    };

    tasks.push(newTask);
    saveTasks(tasks);

    res.json(newTask);
});

// **PUT: Update an existing task**
router.put("/:id", (req, res) => {
    let tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    let taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
        return res.status(404).json({ message: "Task not found" });
    }

    // Ensure only the assigned user can edit their own tasks
    if (tasks[taskIndex].assignedTo !== req.body.username) {
        return res.status(403).json({ message: "You can only edit your own tasks." });
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


// **GET: Get tasks (Admins see all, Employees/Managers see their own)**
router.get("/", (req, res) => {
    try {
        const tasks = loadTasks();
        const username = req.query.username; // Get username from request
        const role = req.query.role; // Get user role

        if (!username || !role) {
            return res.status(400).json({ message: "Username and role are required" });
        }

        let userTasks;
        if (role === "Admin") {
            userTasks = tasks; // ✅ Admins see all tasks
        } else {
            userTasks = tasks.filter(task => 
                task.assignedTo === username || task.createdBy === username
            ); // ✅ Employees/Managers see only their assigned or created tasks
        }

        console.log(`📌 Returning ${userTasks.length} tasks for ${role} (${username})`);
        res.json(userTasks);
    } catch (error) {
        res.status(500).json({ message: "Error loading tasks" });
    }
});


module.exports = router;