const express = require("express");
const userController = require("../controllers/userController");

const routes = express.Router();

routes.post("/addUser", userController.addUser);
// routes.post("/resetPassword", userController.resetPassword);
routes.get("/userList/:userRole", userController.getUserList);
routes.post("/editUser", userController.editUser);
routes.post("/deleteUser", userController.deleteUser);
routes.post("/assignSite", userController.assignSite);
routes.post("/checkUserUid", userController.checkUserUid);
routes.post("/assignDeviceSensor", userController.assignDeviceSensor);
routes.post("/getassignSensor", userController.getassignSensor);
routes.get("/gettest", userController.gettest);

module.exports = routes;
