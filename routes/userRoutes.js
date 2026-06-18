const express = require("express");
const userController = require("../controllers/userController");
const allowRoles = require("../config/allowRoles");

const routes = express.Router();

// roles
const ADMIN = ["admin"];
const ADMIN_TECH = ["admin", "technician"];
const ALL = ["admin", "technician", "user"];

routes.post("/addUser", allowRoles(ADMIN_TECH), userController.addUser);
// routes.post("/addUserSafe", allowRoles(ADMIN_TECH), userController.addUserSafe);
routes.post("/resetPassword", allowRoles(ALL), userController.resetPassword);
routes.get(
  "/userList/:userRole",
  allowRoles(ADMIN_TECH),
  userController.getUserList,
);
routes.post("/editUser", allowRoles(ADMIN_TECH), userController.editUser);
routes.post("/deleteUser", allowRoles(ADMIN_TECH), userController.deleteUser);
routes.post("/assignSite", allowRoles(ALL), userController.assignSite);
routes.post("/checkUserUid", userController.checkUserUid);
routes.post("/assignDeviceSensor", userController.assignDeviceSensor);
routes.post("/getassignSensor", userController.getassignSensor);
routes.get("/gettest", userController.gettest);

module.exports = routes;
