const User = require("../models/user");
const validatePassword = require("../utils/passvalidator");
const bcrypt = require("bcryptjs");

exports.signup = async (req, res) => {
  console.log("Signup api is now running...");

  let { fullName, username, password, role, secret } = req.body;

  // 1. Type validation
  if (
    typeof fullName !== "string" ||
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({ msg: "Invalid input type" });
  }

  // 2. Trim + normalize
  fullName = fullName.trim();
  username = username.trim().toLowerCase();
  password = password.trim();

  // 3. Empty check
  if (!fullName || !username || !password) {
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
    // 5. Check username
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ msg: "Username already exists" });
    }

    const userCount = await User.countDocuments();
    let createdBy = null;

    // 6. First admin logic
    if (userCount === 0) {
      if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ msg: "Invalid admin secret" });
      }

      role = "admin";
    } else {
      // 7. Normal flow (requires logged-in user)

      if (!req.user) {
        return res.status(401).json({ msg: "Unauthorized" });
      }

      createdBy = req.user.id;

      // Role restrictions
      if (req.user.role === "technician" && role === "admin") {
        return res.status(403).json({ msg: "Not allowed to create admin" });
      }

      if (req.user.role === "technician" && role === "technician") {
        return res
          .status(403)
          .json({ msg: "Technician cannot create technician" });
      }
    }

    // 8. Create user
    const user = await User.create({
      fullName,
      username,
      password,
      role: role || "user",
      createdBy,
    });

    // 9. Token
    const token = user.getSignedToken();

    // 10. Safe response
    const safeUser = {
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    };

    return res.status(201).json({
      msg: "User created successfully",
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error("Signup error ==>", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};

// This is for login function

exports.login = async (req, res) => {
  console.log("Login api is now running...");

  let { username, password } = req.body;

  // 1. Type validation
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ msg: "Invalid input type" });
  }

  // 2. Trim + normalize
  username = username.trim().toLowerCase();
  password = password.trim();

  // 3. Empty check
  if (!username || !password) {
    return res.status(400).json({ msg: "Please provide credentials" });
  }

  try {
    // 4. Find user
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return res.status(403).json({ msg: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(500).json({ msg: "Invalid user data" });
    }

    if (!user.isActive) {
      return res.status(403).json({ msg: "Account is inactive" });
    }

    // 5. Compare password
    const isMatch = await user.matchPasswords(password);

    if (!isMatch) {
      return res.status(403).json({ msg: "Invalid credentials" });
    }

    // 6. Generate token
    const token = user.getSignedToken();

    // 7. Safe response
    const safeUser = {
      userID: user._id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    };

    return res.status(200).json({
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error("error from login ==>", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};

exports.forgotPassword = async (req, res) => {
  let { uid, secretKey, newPassword, confirmPassword } = req.body;

  // 1. Type validation
  if (
    typeof uid !== "string" ||
    typeof secretKey !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return res.status(400).json({ msg: "Invalid input type" });
  }

  // 2. Trim
  uid = uid.trim();
  secretKey = secretKey.trim();
  newPassword = newPassword.trim();
  confirmPassword = confirmPassword.trim();

  // 3. Empty check
  if (!uid || !secretKey || !newPassword || !confirmPassword) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  // 4. Password match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ msg: "Passwords do not match" });
  }

  // 5. Password strength
  const { isValid, errors } = validatePassword(newPassword);

  if (!isValid) {
    return res.status(400).json({
      msg: "Weak password",
      errors,
    });
  }

  try {
    const user = await User.findOne({ uid });

    // 6. Prevent user enumeration
    if (!user) {
      return res.status(403).json({ msg: "Invalid credentials" });
    }

    // 7. Check active user
    if (!user.isActive) {
      return res.status(403).json({ msg: "Account is inactive" });
    }

    // 8. Secret check (NO fallback in prod)
    if (!process.env.PASSWORD_RESET_SECRET) {
      return res.status(500).json({ msg: "Server configuration error" });
    }

    if (secretKey !== process.env.PASSWORD_RESET_SECRET) {
      return res.status(403).json({ msg: "Invalid secret key" });
    }

    // 9. Set new password (pre-save will hash)
    user.password = newPassword;

    await user.save();

    return res.status(200).json({ msg: "Password reset successful" });
  } catch (error) {
    console.error("Error from forgotPassword", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};
