const express = require("express");
const alarmController = require("../controllers/alarmController");
const validate = require("../config/validationMethod");
const allowRoles = require("../config/allowRoles");

const routes = express.Router();
const ADMIN = ["admin"];
const ADMIN_TECH = ["admin", "technician"];
const ALL = ["admin", "technician", "user"];

/*     Already protected by app.js */
/* ===================== GET ===================== */
routes.get("/getAllAlarm", alarmController.getAllAlarm);

routes.get(
  "/getAlarmData",
  validate.getAllAlarmBody,
  alarmController.getAlarmData,
);

routes.get(
  "/getAlarmGraphValue",
  validate.getAlarmGraphValueBody,
  alarmController.getAlarmGraphValue,
);

routes.get(
  "/getAllAlarmDataForDownload",
  validate.getAllAlarmDataForDownloadBody,
  alarmController.getAllAlarmDataForDownload,
);

routes.get("/filteredAlarm", alarmController.filterAlarm);

routes.get("/getAlarmStatus", alarmController.getAlarmStatus);

routes.get("/getNotificationCount", alarmController.getNotificationCount);

/* ===================== POST ===================== */

routes.post("/deleteAlarm", alarmController.deleteAlarm);

routes.post("/updateStatus", alarmController.updateStatus);

module.exports = routes;
