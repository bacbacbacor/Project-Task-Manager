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

// **GET: Get tasks with first names instead of usernames**
router.get("/", (req, res) => {
    try {
        const tasks = loadTasks();
        const users = loadUsers();
        const username = req.query.username;
        const role = req.query.role;

        if (!username || !role) {
            return res.status(400).json({ message: "Username and role are required." });
        }

        // Convert usernames to first names
        const getUserFullName = (username) => {
            const user = users.find(user => user.username === username);
            return user ? `${user.firstName} ${user.lastName}` : username;
        };

        let userTasks;
        if (role === "Admin") {
            userTasks = tasks.map(task => ({
                ...task,
                assignedTo: getUserFullName(task.assignedTo),
                createdBy: getUserFullName(task.createdBy),
            }));
        } else if (role === "Manager") {
            const manager = users.find(user => user.username === username);
            if (!manager) {
                return res.status(404).json({ message: "Manager not found." });
            }
            const managerOffice = manager.office;

            const employeesInOffice = users
                .filter(user => user.role === "Employee" && user.office === managerOffice)
                .map(user => user.username);

            userTasks = tasks
                .filter(task => employeesInOffice.includes(task.assignedTo) || task.assignedTo === username)
                .map(task => ({
                    ...task,
                    assignedTo: getUserFullName(task.assignedTo),
                    createdBy: getUserFullName(task.createdBy),
                }));
        } else {
            userTasks = tasks
                .filter(task => task.assignedTo === username)
                .map(task => ({
                    ...task,
                    assignedTo: getUserFullName(task.assignedTo),
                    createdBy: getUserFullName(task.createdBy),
                }));
        }

        res.json(userTasks);
    } catch (error) {
        res.status(500).json({ message: "Error loading tasks." });
    }
});

module.exports = router;


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

    // ✅ Allow Employees to create their own tasks
    if (role === "Employee" && assignedTo !== createdBy) {
        return res.status(403).json({ message: "Employees can only assign tasks to themselves." });
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

    res.json({ message: "Task added successfully", task: newTask });
});


// **PUT: Update an existing task**
router.post("/", (req, res) => {
    const tasks = loadTasks();
    const { title, description, startDate, endDate, status, assignedTo, createdBy, role } = req.body;

    if (!title || !assignedTo || !createdBy || !role) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    // ✅ Allow Employees to create their own tasks
    if (role !== "Admin" && role !== "Manager" && assignedTo !== createdBy) {
        return res.status(403).json({ message: "Employees can only assign tasks to themselves." });
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

    res.json({ message: "Task added successfully", task: newTask });
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
