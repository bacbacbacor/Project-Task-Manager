const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const tasksFilePath = path.join(__dirname, "../data/tasks.json");
const usersFilePath = path.join(__dirname, "../data/users.json");

// Load tasks from file
const loadTasks = () => {
    if (!fs.existsSync(tasksFilePath)) {
        fs.writeFileSync(tasksFilePath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(tasksFilePath));
};

// Load users from file
const loadUsers = () => {
    if (!fs.existsSync(usersFilePath)) {
        fs.writeFileSync(usersFilePath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(usersFilePath));
};

// Save tasks to file
const saveTasks = (tasks) => {
    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
};

// **GET: Retrieve tasks (Admins see all, Managers see employees in same office, Employees see own)**
router.get("/", (req, res) => {
    try {
        const tasks = loadTasks();
        const users = loadUsers();
        const { username, role } = req.query;

        if (!username || !role) {
            return res.status(400).json({ message: "Username and role are required." });
        }

        let userTasks;
        if (role === "Admin") {
            userTasks = tasks;
        } else if (role === "Manager") {
            const manager = users.find(u => u.username === username);
            if (!manager) {
                return res.status(404).json({ message: "Manager not found." });
            }
            const managerOffice = manager.office;

            // employees in same office
            const employees = users
                .filter(u => u.role === "Employee" && u.office === managerOffice)
                .map(u => u.username);

            userTasks = tasks.filter(t =>
                t.assignedTo === username || employees.includes(t.assignedTo)
            );
        } else {
            // role === "Employee"
            userTasks = tasks.filter(t => t.assignedTo === username);
        }

        // 1️⃣ Convert assignedTo username → assignedTo first name
        // 2️⃣ Convert createdBy username → createdBy first name
        const getFirstName = (un) => {
            const user = users.find(u => u.username === un);
            return user ? user.firstName : un;
        };

        userTasks = userTasks.map(task => ({
            ...task,
            assignedTo: getFirstName(task.assignedTo),
            createdBy: getFirstName(task.createdBy)
        }));

        res.json(userTasks);
    } catch (error) {
        console.error("❌ GET tasks error:", error);
        res.status(500).json({ message: "Error loading tasks." });
    }
});

// **GET: Retrieve a single task by ID**
router.get("/:id", (req, res) => {
    try {
        const tasks = loadTasks();
        const taskId = parseInt(req.params.id);
        const task = tasks.find(t => t.id === taskId);

        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        res.json(task);
    } catch (error) {
        console.error("❌ GET task by ID error:", error);
        res.status(500).json({ message: "Error loading task details." });
    }
});

// **POST: Create / Assign Task**
router.post("/", (req, res) => {
    const tasks = loadTasks();
    const users = loadUsers();
    const { title, description, startDate, endDate, status, assignedTo, assignedToName, createdBy, createdByName, role } = req.body;

    console.log("🟢 Task Assignment Request Received:", req.body);

    if (!title || !createdBy || !role) {
        return res.status(400).json({ message: "Missing required fields (title, createdBy, role)." });
    }

    let assignedToFinal = assignedTo || createdBy;

    if (role === "Manager") {
        const manager = users.find(u => u.username === createdBy);
        if (!manager) {
            return res.status(404).json({ message: "Manager not found." });
        }
        const managerOffice = manager.office;
        const targetUser = users.find(u => u.username === assignedToFinal);

        if (!targetUser || targetUser.office !== managerOffice) {
            return res.status(403).json({ message: "Manager can only assign tasks to employees in their office." });
        }
    }

    const newTask = {
        id: tasks.length > 0 ? tasks[tasks.length - 1].id + 1 : 1,
        title,
        description,
        startDate,
        endDate,
        status: status || "Pending",
        assignedTo: assignedToFinal,
        assignedToName,  // Stores first name
        createdBy,
        createdByName // Stores first name of creator
    };

    console.log("✅ Task Successfully Created:", newTask);

    tasks.push(newTask);
    saveTasks(tasks);
    res.json({ message: "Task added successfully", task: newTask });
});


// **PUT: Update an existing task**
router.put("/:id", (req, res) => {
    const tasks = loadTasks();
    const { username, role } = req.body;
    const taskId = parseInt(req.params.id);

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        return res.status(404).json({ message: "Task not found." });
    }

    // Only assigned user, creator, or Admin can edit
    if (
        tasks[taskIndex].assignedTo !== username &&
        tasks[taskIndex].createdBy !== username &&
        role !== "Admin"
    ) {
        return res.status(403).json({ message: "No permission to edit this task." });
    }

    tasks[taskIndex] = { ...tasks[taskIndex], ...req.body };
    saveTasks(tasks);

    res.json({ message: "Task updated successfully", task: tasks[taskIndex] });
});

// **DELETE: Remove a task by ID**  
router.delete("/:id", (req, res) => {
    let tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks(tasks);
    res.json({ message: "Task deleted successfully" });
});

module.exports = router;
