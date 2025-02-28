const express = require("express");
const pool = require("../db"); // ✅ Import MySQL connection

const router = express.Router();

// **GET: Fetch all tasks from MySQL with First Names Instead of IDs**
router.get("/", async (req, res) => {
    try {
        const [tasks] = await pool.query(`
            SELECT tasks.id, tasks.title, tasks.description, tasks.startDate, tasks.endDate, 
                   tasks.status, u1.firstName AS assignedTo, u2.firstName AS createdBy
            FROM tasks
            LEFT JOIN users u1 ON tasks.assignedTo = u1.id
            LEFT JOIN users u2 ON tasks.createdBy = u2.id
        `);
        res.json(tasks);
    } catch (error) {
        console.error("❌ Error fetching tasks from MySQL:", error);
        res.status(500).json({ message: "Server error while fetching tasks." });
    }
});

// **GET: Fetch a single task by ID with Names Instead of IDs**
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [tasks] = await pool.query(
            `SELECT tasks.*, u1.firstName AS assignedTo, u2.firstName AS createdBy 
             FROM tasks
             LEFT JOIN users u1 ON tasks.assignedTo = u1.id
             LEFT JOIN users u2 ON tasks.createdBy = u2.id
             WHERE tasks.id = ?`, 
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        res.json(tasks[0]);
    } catch (error) {
        console.error("Error fetching task details:", error);
        res.status(500).json({ message: "Server error while fetching task details." });
    }
});

// **POST: Create a new task (Managers can only assign to employees in the same office)**
router.post("/", async (req, res) => {
    const { title, description, startDate, endDate, status, assignedTo, createdBy } = req.body;

    if (!title || !startDate || !endDate || !status || !assignedTo || !createdBy) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    try {
        // ✅ Fetch manager's office
        const [manager] = await pool.query("SELECT office, role FROM users WHERE id = ?", [createdBy]);
        if (!manager.length) {
            return res.status(404).json({ message: "Manager not found." });
        }

        const managerOffice = manager[0].office;
        const managerRole = manager[0].role;

        // ✅ Check if the assigned employee belongs to the same office
        const [employee] = await pool.query("SELECT office FROM users WHERE id = ?", [assignedTo]);
        if (!employee.length) {
            return res.status(404).json({ message: "Assigned employee not found." });
        }

        if (managerRole === "Manager" && employee[0].office !== managerOffice) {
            return res.status(403).json({ message: "Managers can only assign tasks to employees within their office." });
        }

        // ✅ Insert the task into MySQL
        const [result] = await pool.query(
            "INSERT INTO tasks (title, description, startDate, endDate, status, assignedTo, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [title, description, startDate, endDate, status || "Pending", assignedTo, createdBy]
        );

        res.status(201).json({ message: "Task assigned successfully!", taskId: result.insertId });
    } catch (error) {
        console.error("Error assigning task:", error);
        res.status(500).json({ message: "Server error while assigning task." });
    }
});

// **PUT: Update an existing task**
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { title, description, startDate, endDate, status, assignedTo } = req.body;

    if (!title || !description || !startDate || !endDate || !status || !assignedTo) {
        return res.status(400).json({ message: "Missing required fields in update request." });
    }

    try {
        // ✅ Ensure the task exists before updating
        const [taskExists] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id]);
        if (taskExists.length === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        // ✅ Update the task in the database
        const [result] = await pool.query(
            "UPDATE tasks SET title = ?, description = ?, startDate = ?, endDate = ?, status = ?, assignedTo = ? WHERE id = ?",
            [title, description, startDate, endDate, status, assignedTo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ message: "Failed to update task. No rows affected." });
        }

        res.json({ message: "Task updated successfully." });

    } catch (error) {
        console.error("❌ Error updating task:", error);
        res.status(500).json({ message: "Server error while updating task." });
    }
}); 

// **DELETE: Remove a task**
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query("DELETE FROM tasks WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        res.json({ message: "Task deleted successfully." });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Server error while deleting task." });
    }
});

module.exports = router;
