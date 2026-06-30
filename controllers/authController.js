const User = require("../models/user");
const validatePassword = require("../utils/passvalidator");
const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis"); // Added missing Redis client import
const ms = require("ms");

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
      return res.status(500).json({
        msg: "Invalid user data profile structure",
      });
    }

    const isMatch = await user.matchPasswords(password);

    if (!isMatch) {
      return res.status(403).json({ msg: "Wrong credentials" });
    }

    // Generate JWT
    const token = user.getSignedToken();

    // Send JWT in HttpOnly cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    // Safe user object
    const safeUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      uid: user.uid,
      role: user.role,
    };

    // Redis Session Object
    const sessionData = {
      token,
      status: true,
      user: safeUser,
      loginAt: new Date().toISOString(),
    };

    const redisKey = `session:${safeUser.id}`;

    // Read JWT expiry from .env
    const ttl = Math.floor(ms(process.env.JWT_EXPIRE || "60m") / 1000);

    // Store session in Redis with same TTL as JWT
    await redisClient.setEx(redisKey, ttl, JSON.stringify(sessionData));

    console.log(
      `Session cached successfully in Redis (${redisKey}) with TTL ${ttl} seconds`,
    );

    return res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    console.error("Error intercepted inside login controller:", error.message);

    return res.status(500).json({
      msg: "Something went wrong",
    });
  }
};

/* ==================== LOGOUT CONTROLLER ==================== */
exports.logout = async (req, res) => {
  console.log("Logout API execution started...");
  console.log("req.user =", req.user);
  try {
    const userId = req.user?.id;

    if (userId) {
      const redisKey = `session:${userId}`;

      // Read existing session from Redis
      const session = await redisClient.get(redisKey);

      if (session) {
        const sessionData = JSON.parse(session);

        // Mark session as logged out
        sessionData.status = false;
        sessionData.logoutAt = new Date().toISOString();
        console.log("this is the session :", sessionData.status);

        // Preserve remaining TTL
        const ttl = await redisClient.ttl(redisKey);

        if (ttl > 0) {
          await redisClient.setEx(redisKey, ttl, JSON.stringify(sessionData));

          console.log(
            `Session marked as logged out for key: ${redisKey} (TTL remaining: ${ttl}s)`,
          );
        } else {
          console.log(`Redis key ${redisKey} already expired.`);
        }
      } else {
        console.log(`No active Redis session found for key: ${redisKey}`);
      }
    }

    // Clear browser cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      msg: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error.message);

    return res.status(500).json({
      success: false,
      msg: "Something went wrong during logout",
    });
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
