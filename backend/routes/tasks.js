const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
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

// **GET: Get all tasks**
router.get("/", (req, res) => {
    res.json(loadTasks());
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

// **DELETE: Remove a task by ID**
router.delete("/:id", (req, res) => {
    let tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks(tasks);
    res.json({ message: "Task deleted successfully" });
});

module.exports = router;
