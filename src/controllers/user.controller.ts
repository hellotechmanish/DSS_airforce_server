import type { Request, Response } from "express";
import User from "../models/user.modal.js";

/* ===================== ADD USER ===================== */

export const addUser = async (req: Request, res: Response): Promise<void> => {
  try {
    let { fullName, username, password, role } = req.body;

    if (!fullName || !username || !password) {
      res.status(400).json({ msg: "Missing required fields" });
      return;
    }

    fullName = fullName.trim();
    username = username.trim().toLowerCase();
    password = password.trim();

    const existingUser = await User.findOne({ username }).lean();

    if (existingUser) {
      res.status(400).json({ msg: "Username already exists" });
      return;
    }

    const safeRole = ["admin", "technician", "user"].includes(role)
      ? role
      : "technician";

    const user = await User.create({
      fullName,
      username,
      password,
      role: safeRole,
    });

    res.status(201).json({
      msg: "User created",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("addUser error");
    res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ===================== RESET PASSWORD ===================== */

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      res.status(400).json({ msg: "Missing data" });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ msg: "User not found" });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ msg: "Password updated" });
  } catch (error) {
    console.error("resetPassword error");
    res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ===================== GET USER LIST ===================== */

export const getUserList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userRole } = req.params;

    const filter = userRole && userRole !== "all" ? { role: userRole } : {};

    const users = await User.find(filter).select("-password").lean();

    res.status(200).json({ users });
  } catch (error) {
    console.error("getUserList error");
    res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ===================== EDIT USER ===================== */

export const editUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, fullName, role } = req.body;

    if (!userId) {
      res.status(400).json({ msg: "User ID required" });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(fullName && { fullName }),
        ...(role && { role }),
      },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      res.status(404).json({ msg: "User not found" });
      return;
    }

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error("editUser error");
    res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ===================== DELETE USER ===================== */

export const deleteUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ msg: "User not found" });
      return;
    }

    res.status(200).json({ msg: "User deleted" });
  } catch (error) {
    console.error("deleteUser error");
    res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ===================== CHECK UID ===================== */

export const checkUserUid = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { uid } = req.body;

    if (!uid) {
      res.status(400).json({ msg: "UID required" });
      return;
    }

    const exists = await User.exists({ username: uid.toLowerCase() });

    res.status(200).json({
      available: !exists,
    });
  } catch (error) {
    console.error("checkUserUid error");
    res.status(500).json({ msg: "Something went wrong" });
  }
};

/* ===================== PLACEHOLDERS ===================== */

export const assignSite = async (_req: Request, res: Response) => {
  res.status(200).json({ msg: "assignSite pending implementation" });
};

export const assignDeviceSensor = async (_req: Request, res: Response) => {
  res.status(200).json({ msg: "assignDeviceSensor pending implementation" });
};

export const getassignSensor = async (_req: Request, res: Response) => {
  res.status(200).json({ msg: "getassignSensor pending implementation" });
};

export const gettest = async (_req: Request, res: Response) => {
  res.status(200).json({ msg: "Test route working" });
};
