const User = require("../models/user");
const validatePassword = require("../utils/passvalidator");
const bcrypt = require("bcryptjs");

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

  // 4. Password validation (🔥 ADD THIS)
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

    // 7. Token
    const token = user.getSignedToken();

    // 8. Safe response
    const safeUser = {
      fullName: user.fullName,
      uid: user.uid,
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

  let { uid, password } = req.body;

  //  1. Type validation (BLOCK NoSQL injection)
  if (typeof uid !== "string" || typeof password !== "string") {
    return res.status(400).json({ msg: "Invalid input type" });
  }

  //  2. Trim input (avoid whitespace tricks)
  uid = uid.trim();
  password = password.trim();

  //  3. Empty check
  if (!uid || !password) {
    return res.status(400).json({ msg: "Please provide credentials" });
  }

  try {
    //  4. Strict query (safe)
    const user = await User.findOne({ uid }).select("+password");

    if (!user) {
      return res.status(403).json({ msg: "UID not found" });
    }

    //  5. Ensure stored password exists
    if (!user.password) {
      return res.status(500).json({ msg: "Invalid user data" });
    }

    //  6. Compare password safely
    const isMatch = await user.matchPasswords(password);

    if (!isMatch) {
      return res.status(403).json({ msg: "Wrong credentials" });
    }

    //  7. Generate token
    const token = user.getSignedToken();

    //  8. Send safe user object
    const safeUser = {
      userID: user._id,
      fullName: user.fullName,
      uid: user.uid,
      role: user.role,
    };

    return res.status(200).json({
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error("error from login ==>", error);

    //  9. No internal error leak
    return res.status(500).json({ msg: "Something went wrong" });
  }
};

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

    //  NO HASH HERE
    user.password = newPassword;

    await user.save(); // 🔐 pre-save will hash

    return res.status(200).json({ msg: "Password reset successful" });
  } catch (error) {
    console.error("Error from forgotPassword", error);
    // return res.status(500).json({ msg: error.message });
    return res.status(500).json({ msg: "Something went wrong" });
  }
};
