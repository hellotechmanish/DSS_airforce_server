import type { Request, Response } from "express";
import User from "../models/user.js";
import validatePassword from "../../utils/passvalidator.js";

interface SignupBody {
  fullName: string;
  uid: string;
  password: string;
  role?: "  admin" | "technician" | "user";
}

interface LoginBody {
  uid: string;
  password: string;
}

interface ForgotPasswordBody {
  uid: string;
  secretKey: string;
  newPassword: string;
  confirmPassword: string;
}

/* ===================== SIGNUP ===================== */

export const signup = async (
  req: Request<{}, {}, SignupBody>,
  res: Response,
): Promise<void> => {
  let { fullName, uid, password, role } = req.body;

  // validate types
  if (
    typeof fullName !== "string" ||
    typeof uid !== "string" ||
    typeof password !== "string"
  ) {
    res.status(400).json({ msg: "Invalid input type" });
    return;
  }

  // sanitize input
  fullName = fullName.trim();
  uid = uid.trim();
  password = password.trim();

  // empty check
  if (!fullName || !uid || !password) {
    res.status(400).json({ msg: "Please provide all required fields" });
    return;
  }

  // password validation
  const { isValid, errors } = validatePassword(password);

  if (!isValid) {
    res.status(400).json({
      msg: "Weak password",
      errors,
    });
    return;
  }

  try {
    // check existing user
    const existingUser = await User.findOne({ uid }).lean();

    if (existingUser) {
      res.status(400).json({ msg: "UID already exists" });
      return;
    }

    // ensure safe role
    const safeRole =
      role && ["admin", "technician", "user"].includes(role)
        ? role
        : "technician";

    // create user
    const user = await User.create({
      fullName,
      uid,
      password,
      role: safeRole,
    });

    // generate token
    const token = user.getSignedToken();

    // send safe response
    res.status(201).json({
      msg: "User created successfully",
      user: {
        fullName: user.fullName,
        uid: user.uid,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Signup error");

    res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ===================== LOGIN ===================== */

export const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response,
): Promise<void> => {
  let { uid, password } = req.body;

  // type validation
  if (typeof uid !== "string" || typeof password !== "string") {
    res.status(400).json({ msg: "Invalid input type" });
    return;
  }

  // sanitize
  uid = uid.trim();
  password = password.trim();

  if (!uid || !password) {
    res.status(400).json({ msg: "Please provide credentials" });
    return;
  }

  try {
    const user = await User.findOne({ uid }).select("+password");

    if (!user) {
      res.status(403).json({ msg: "UID not found" });
      return;
    }

    if (!user.password) {
      res.status(500).json({ msg: "Invalid user data" });
      return;
    }

    const isMatch = await user.matchPasswords(password);

    if (!isMatch) {
      res.status(403).json({ msg: "Wrong credentials" });
      return;
    }

    const token = user.getSignedToken();

    res.status(200).json({
      user: {
        userID: user._id,
        fullName: user.fullName,
        uid: user.uid,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error");

    res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ===================== FORGOT PASSWORD ===================== */

export const forgotPassword = async (
  req: Request<{}, {}, ForgotPasswordBody>,
  res: Response,
): Promise<void> => {
  const { uid, secretKey, newPassword, confirmPassword } = req.body;

  if (!uid || !secretKey || !newPassword || !confirmPassword) {
    res.status(400).json({ msg: "Please provide all required fields" });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ msg: "Passwords do not match" });
    return;
  }

  const { isValid, errors } = validatePassword(newPassword);

  if (!isValid) {
    res.status(400).json({
      msg: "Weak password",
      errors,
    });
    return;
  }

  try {
    const user = await User.findOne({ uid });

    if (!user) {
      res.status(403).json({ msg: "UID not found" });
      return;
    }

    const secret =
      process.env.PASSWORD_RESET_SECRET ?? "DSS_PASSWORD_RESET_KEY";

    if (secretKey !== secret) {
      res.status(403).json({ msg: "Invalid secret key" });
      return;
    }

    // password will be hashed via pre-save hook
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      msg: "Password reset successful",
    });
  } catch (error) {
    console.error("Forgot password error");

    res.status(500).json({ msg: "Something went wrong" });
  }
};
