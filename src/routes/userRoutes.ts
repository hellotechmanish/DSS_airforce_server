import { Router } from "express";
import * as userController from "../controllers/userController.js";
import allowRoles, { Role } from "../middleware/allowRoles.js";
const router = Router();

/* -------------------- Roles -------------------- */

const ADMIN: Role[] = ["admin"];
const ADMIN_TECH: Role[] = ["admin", "technician"];
const ALL: Role[] = ["admin", "technician", "user"];

/* -------------------- Routes -------------------- */

// create user
router.post("/addUser", allowRoles(ADMIN_TECH), userController.addUser);

// reset password
router.post("/resetPassword", allowRoles(ALL), userController.resetPassword);

// get users list
router.get(
  "/userList/:userRole",
  allowRoles(ADMIN_TECH),
  userController.getUserList,
);

// edit user
router.post("/editUser", allowRoles(ADMIN_TECH), userController.editUser);

// delete user
router.post("/deleteUser", allowRoles(ADMIN_TECH), userController.deleteUser);

// assign site
router.post("/assignSite", allowRoles(ALL), userController.assignSite);

// check UID
router.post("/checkUserUid", userController.checkUserUid);

// assign device sensor
router.post("/assignDeviceSensor", userController.assignDeviceSensor);

// get assigned sensors
router.post("/getassignSensor", userController.getassignSensor);

// test route
router.get("/gettest", userController.gettest);

export default router;
