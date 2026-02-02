const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

/* 🔓 PUBLIC AUTH ROUTES */
router.post("/login", authController.login);

module.exports = router;
