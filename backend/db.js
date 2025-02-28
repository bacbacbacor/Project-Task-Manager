const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "localhost",       // Change if needed
    user: "root",            // Change if using a different MySQL user
    password: "!@#$%^&*()",  // Add your MySQL root password here
    database: "project_tasks_manager",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise(); // Using promise-based queries
