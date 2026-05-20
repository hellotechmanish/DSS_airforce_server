import express from "express";
import * as authController from "../controllers/authController.js";
const router = express.Router();

/* 🔓 PUBLIC AUTH ROUTES */
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);

export default router;
