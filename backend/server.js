const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());


const usersRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const officesRoutes = require("./routes/offices");
const tasksRoutes = require("./routes/tasks"); 


app.use("/users", usersRoutes);
app.use("/auth", authRoutes);
app.use("/offices", officesRoutes);
app.use("/tasks", tasksRoutes); 

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
