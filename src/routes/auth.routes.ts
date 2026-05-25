import express from "express";

import {
  signup,
  login,
  forgotPassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

/* ================= PUBLIC ================= */

router.post("/signup", signup);

router.post("/login", login);

router.post("/forgot-password", forgotPassword);

export default router;
