const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Load Routes
const usersRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const officesRoutes = require("./routes/offices");
const tasksRoutes = require("./routes/tasks"); // ✅ Make sure this exists!

// Use Routes
app.use("/users", usersRoutes);
app.use("/auth", authRoutes);
app.use("/offices", officesRoutes);
app.use("/tasks", tasksRoutes); // ✅ Check if this is causing the error

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
