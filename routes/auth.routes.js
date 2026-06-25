const express = require("express");
const authController = require("../controllers/authController");
const { checkauth } = require("../config/middleware");
//   FIXED: Apne actual protect middleware ko import kijiye

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.get("/logout", authController.logout);

//     CRITICAL FIX: /me route par protect middleware pass karna mandatory hai
router.get("/me", checkauth, authController.getMe);

module.exports = router;
