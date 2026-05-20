import type { Request, Response, NextFunction } from "express";

/* -------------------- Role Type -------------------- */
export type Role = "admin" | "technician" | "user";

/* -------------------- Middleware -------------------- */
const allowRoles = (allowedRoles: Role[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ msg: "Unauthorized" });
      return;
    }

    const userRole = req.user.role as Role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ msg: "Forbidden: Access denied" });
      return;
    }

    next();
  };
};

export default allowRoles;
