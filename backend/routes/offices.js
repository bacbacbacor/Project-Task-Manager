const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const officesFilePath = path.join(__dirname, "../data/offices.json");

router.get("/", (req, res) => {
    try {
        const data = fs.readFileSync(officesFilePath);
        const offices = JSON.parse(data);
        res.json(offices);
    } catch (error) {
        res.status(500).json({ message: "Error loading offices" });
    }
});

module.exports = router;
