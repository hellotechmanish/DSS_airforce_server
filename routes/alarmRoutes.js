const express = require("express");
const alarmController = require("../controllers/alarmController");
const validate = require("../middleware/validationMethod");

const routes = express.Router();

/* 🔐 Already protected by app.js */

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
