const User = require("../models/user");
const validatePassword = require("../utils/passvalidator");
const jwt = require("jsonwebtoken");

// Cookie security configurations setup
const COOKIE_OPTIONS = {
  httpOnly: true, // 🛡️ JavaScript access block karta hai (XSS Protection)
  secure: process.env.NODE_ENV === "production", // Production (HTTPS) par hi active hoga
  sameSite: "lax", // CSRF safeguards
  maxAge: 24 * 60 * 60 * 1000, // 1 Din (Matches Token Expiry Window)
};

/* ==================== SIGNUP CONTROLLER ==================== */
exports.signup = async (req, res) => {
  console.log("Signup api is now running...");

  let { fullName, uid, password, role } = req.body;

  // 1. Type validation
  if (
    typeof fullName !== "string" ||
    typeof uid !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({ msg: "Invalid input type" });
  }

  // 2. Trim
  fullName = fullName.trim();
  uid = uid.trim();
  password = password.trim();

  // 3. Empty check
  if (!fullName || !uid || !password) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  // 4. Password validation
  const { isValid, errors } = validatePassword(password);

  if (!isValid) {
    return res.status(400).json({
      msg: "Weak password",
      errors,
    });
  }

  try {
    // 5. Check UID
    const existingUser = await User.findOne({ uid });

    if (existingUser) {
      return res.status(400).json({ msg: "UID already exists" });
    }

    // 6. Create user
    const user = await User.create({
      fullName,
      uid,
      password,
      role: role || "technician",
    });

    // 7. Generate Token
    const token = user.getSignedToken();

    // 8. Inject Cookie immediately on successful signup
    res.cookie("token", token, COOKIE_OPTIONS);

    // 9. Safe response
    const safeUser = {
      fullName: user.fullName,
      uid: user.uid,
      role: user.role,
    };

    return res.status(201).json({
      msg: "User created successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Signup error ==>", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ==================== LOGIN CONTROLLER ==================== */
exports.login = async (req, res) => {
  console.log("Login api is now running...");

  let { uid, password } = req.body;

  // 1. Type validation (BLOCK NoSQL injection)
  if (typeof uid !== "string" || typeof password !== "string") {
    return res.status(400).json({ msg: "Invalid input type" });
  }

  // 2. Trim input (avoid whitespace tricks)
  uid = uid.trim();
  password = password.trim();

  // 3. Empty check
  if (!uid || !password) {
    return res.status(400).json({ msg: "Please provide credentials" });
  }

  try {
    // 4. Strict query (safe)
    const user = await User.findOne({ uid }).select("+password");

    if (!user) {
      return res.status(403).json({ msg: "Wrong credentials" }); // Security: Keep error messages generic
    }

    // 5. Ensure stored password exists
    if (!user.password) {
      return res
        .status(500)
        .json({ msg: "Invalid user data profile structure" });
    }

    // 6. Compare password safely
    const isMatch = await user.matchPasswords(password);

    if (!isMatch) {
      return res.status(403).json({ msg: "Wrong credentials" });
    }

    // 7. Generate Token via your instance method
    // ⚠️ NOTE: Ensure your userSchema.methods.getSignedToken includes role, fullName, and uid inside its payload!
    const token = user.getSignedToken();

    //   8. FIXED: Explicitly defined inline fallback options matrix to guarantee execution success
    const COOKIE_OPTIONS = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 Day lifecycle window
    };

    // Attaching token inside HttpOnly jar securely
    res.cookie("token", token, COOKIE_OPTIONS);

    // 9. Send safe user object (Clean response pipeline)
    const safeUser = {
      userID: user._id,
      fullName: user.fullName,
      uid: user.uid,
      role: user.role,
    };

    return res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    console.error(
      "Error intercepted inside fallback controller ==>",
      error.message,
    );
    return res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ==================== LOGOUT CONTROLLER ==================== */
// 🔥 Added clear pipeline to instantly unmount cookie session arrays on request
exports.logout = async (req, res) => {
  try {
    //   res.clearCookie browser ke storage se token ko mita deta hai
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      msg: "Logged out successfully (Cookie cleaned)",
    });
  } catch (error) {
    console.error("Logout Error:", error.message);
    return res.status(500).json({ msg: "Something went wrong during logout" });
  }
};

exports.getMe = async (req, res) => {
  try {
    // Agar aapke paas 'protect' middleware hai, toh req.user me data betha hoga
    // Agar middleware nahi hai, toh pehle cookie se token nikaal kar decode karna hoga

    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, msg: "Session expired or invalid" });
    }

    return res.status(200).json({
      success: true,
      user: req.user, // Frontend Zustand store ko yahi data directly populate karega
    });
  } catch (error) {
    console.error("Error in /me controller:", error.message);
    return res
      .status(500)
      .json({ success: false, msg: "Server session integration error" });
  }
};

/* ==================== FORGOT PASSWORD CONTROLLER ==================== */
exports.forgotPassword = async (req, res) => {
  const { uid, secretKey, newPassword, confirmPassword } = req.body;

  if (!uid || !secretKey || !newPassword || !confirmPassword) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ msg: "Passwords do not match" });
  }

  const { isValid, errors } = validatePassword(newPassword);

  if (!isValid) {
    return res.status(400).json({
      msg: "Weak password",
      errors,
    });
  }

  try {
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(403).json({ msg: "UID not found" });
    }

    const secret =
      process.env.PASSWORD_RESET_SECRET || "DSS_PASSWORD_RESET_KEY";

    if (secretKey !== secret) {
      return res.status(403).json({ msg: "Invalid secret key" });
    }

    // NO HASH HERE - pre-save will hash
    user.password = newPassword;
    await user.save();

    return res.status(200).json({ msg: "Password reset successful" });
  } catch (error) {
    console.error("Error from forgotPassword", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};
