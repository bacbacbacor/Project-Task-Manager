const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Load Routes (Ensure Correct Path)
const usersRoutes = require("./routes/users"); // 🔹 Make sure this file exists
const authRoutes = require("./routes/auth");   // 🔹 Make sure this file exists
const officesRoutes = require("./routes/offices");

// Use Routes (Ensure They Are Functions)
app.use("/users", usersRoutes);
app.use("/auth", authRoutes);
app.use("/offices", officesRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
