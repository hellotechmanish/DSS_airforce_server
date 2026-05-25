import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "jsonwebtoken";
import User from "../models/user.modal.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

interface TokenPayload extends JwtPayload {
  id: string;
}

export const checkauth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // check token existence
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        msg: "Authorization token missing",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not defined");
      res.status(500).json({
        success: false,
        msg: "Server configuration error",
      });
      return;
    }

    // verify token safely
    let decoded: TokenPayload;

    try {
      const payload = jwt.verify(token as string, jwtSecret);
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("id" in payload)
      ) {
        throw new Error("Invalid token payload");
      }
      decoded = payload as TokenPayload;
    } catch {
      res.status(401).json({
        success: false,
        msg: "Invalid or expired token",
      });
      return;
    }

    // validate payload
    if (!decoded.id) {
      res.status(401).json({
        success: false,
        msg: "Invalid token payload",
      });
      return;
    }

    // fetch minimal user data
    const user = await User.findById(decoded.id)
      .select("_id role")
      .lean<{ _id: unknown; role: string }>();

    if (!user) {
      res.status(401).json({
        success: false,
        msg: "User not found",
      });
      return;
    }

    // attach user safely
    req.user = {
      id: String(user._id),
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("AUTH ERROR");

    res.status(401).json({
      success: false,
      msg: "Authentication failed",
    });
  }
};
