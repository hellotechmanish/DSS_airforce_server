const User = require("../models/user");
const validatePassword = require("../utils/passvalidator");
const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis"); // Added missing Redis client import

// Cookie security configurations setup
const COOKIE_OPTIONS = {
  httpOnly: true, // Blocks JavaScript access for XSS protection
  secure: process.env.NODE_ENV === "production", // Active only over HTTPS in production
  sameSite: "lax", // CSRF protection safeguard
  maxAge: 24 * 60 * 60 * 1000, // 1 Day lifecycle window matching token expiration
};

/* ==================== SIGNUP CONTROLLER ==================== */
exports.signup = async (req, res) => {
  console.log("Signup API execution started...");

  let { fullName, uid, password, role } = req.body;

  // 1. Type validation
  if (
    typeof fullName !== "string" ||
    typeof uid !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({ msg: "Invalid input type" });
  }

  // 2. Data trimming
  fullName = fullName.trim();
  uid = uid.trim();
  password = password.trim();

  // 3. Completeness validation check
  if (!fullName || !uid || !password) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  // 4. Password structural strength validation
  const { isValid, errors } = validatePassword(password);

  if (!isValid) {
    return res.status(400).json({
      msg: "Weak password",
      errors,
    });
  }

  try {
    // 5. Unique identifier availability verify check
    const existingUser = await User.findOne({ uid });

    if (existingUser) {
      return res.status(400).json({ msg: "UID already exists" });
    }

    // 6. Persist new user entity inside database layer
    const user = await User.create({
      fullName,
      uid,
      password,
      role: role || "technician",
    });

    // 7. Generate identity token signature
    const token = user.getSignedToken();

    // 8. Secure token delivery inside network jar cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    // 9. Isolate safe data profile properties
    const safeUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      uid: user.uid,
      role: user.role,
    };

    // 10. Cache data session records inside Redis RAM storage layer
    const redisKey = `session:${safeUser.id}`;
    await redisClient.setEx(redisKey, 86400, JSON.stringify(safeUser));

    return res.status(201).json({
      msg: "User created successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Signup validation error trace:", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ==================== LOGIN CONTROLLER ==================== */
exports.login = async (req, res) => {
  console.log("Login API execution started...");

  let { uid, password } = req.body;

  if (typeof uid !== "string" || typeof password !== "string") {
    return res.status(400).json({ msg: "Invalid input type" });
  }

  uid = uid.trim();
  password = password.trim();

  if (!uid || !password) {
    return res.status(400).json({ msg: "Please provide credentials" });
  }

  try {
    const user = await User.findOne({ uid }).select("+password");

    if (!user) {
      return res.status(403).json({ msg: "Wrong credentials" });
    }

    if (!user.password) {
      return res
        .status(500)
        .json({ msg: "Invalid user data profile structure" });
    }

    const isMatch = await user.matchPasswords(password);

    if (!isMatch) {
      return res.status(403).json({ msg: "Wrong credentials" });
    }

    const token = user.getSignedToken();

    res.cookie("token", token, COOKIE_OPTIONS);

    const safeUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      uid: user.uid,
      role: user.role,
    };

    // Save session payload to Redis RAM with a 24-hour expiration (86400 seconds)
    const redisKey = `session:${safeUser.id}`;
    await redisClient.setEx(redisKey, 86400, JSON.stringify(safeUser));

    console.log(`Session successfully cached in Redis for key: ${redisKey}`);

    return res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    console.error("Error intercepted inside login controller:", error.message);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ==================== LOGOUT CONTROLLER ==================== */
exports.logout = async (req, res) => {
  console.log("Logout API execution started...");
  try {
    // Extract the identifier injected into the request stack by the checkauth middleware
    const userId = req.user?.id;

    if (userId) {
      const redisKey = `session:${userId}`;
      // Explicitly delete the key to instantly invalidate the active session
      await redisClient.del(redisKey);
      console.log(
        `Session successfully removed from Redis memory for key: ${redisKey}`,
      );
    }

    // Clear the browser-side cookie tracking reference
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      msg: "Logged out successfully (Redis state and cookie cleaned)",
    });
  } catch (error) {
    console.error("Logout Error intercepted:", error.message);
    return res.status(500).json({ msg: "Something went wrong during logout" });
  }
};

/* ==================== GET ME CONTROLLER ==================== */
exports.getMe = async (req, res) => {
  try {
    // If request parsed successfully through checkauth, data is ready in req.user
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, msg: "Session expired or invalid" });
    }

    return res.status(200).json({
      success: true,
      user: req.user, // Directly provides pre-fetched data stream to frontend Zustand store
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

    // Assign plain password text, schema middleware hook handles hashing
    user.password = newPassword;
    await user.save();

    // Evict old user data cache from Redis to enforce fresh session re-authentication
    await redisClient.del(`session:${user._id.toString()}`);

    return res.status(200).json({ msg: "Password reset successful" });
  } catch (error) {
    console.error("Error from forgotPassword", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};
