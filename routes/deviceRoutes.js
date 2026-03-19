const express = require("express");
const deviceController = require("../controllers/deviceController");

const routes = express.Router();

/* 🔐 Already protected by app.js */

routes.post("/createDevice", deviceController.createDevice);
routes.post("/editDevice", deviceController.editDevice);
routes.post("/deleteDevice", deviceController.deleteDevice);

routes.post("/latestData", deviceController.latestdevicedata);
routes.post("/latestDatabyDate", deviceController.latestdevicedataBydate);

// 🔹 Single siteId device list
routes.get("/getdeviceListbysiteId/:siteId", deviceController.getdeviceList);

// 🔹 Multiple siteIds device list (NEW)
routes.post("/getdeviceListbysiteIds", deviceController.getDeviceListBySiteIds);

routes.post(
  "/getdeviceListbysiteIdanduserId",
  deviceController.getdeviceListByuserId,
);

routes.get("/downloadcsv", deviceController.downloadcsv);
routes.post("/generateReport", deviceController.getCsv);

routes.get("/getDeviceById/:deviceId", deviceController.getDeviceById);
routes.get("/getDeviceDataById/:deviceId", deviceController.getDeviceDataById);

routes.post("/checkDeviceUid", deviceController.checkDeviceUid);
routes.post("/deleteDevicefromuser", deviceController.deleteDeviceFromUser);
routes.get("/getdevicebyuserId/:userId", deviceController.getDeviceByuserId);

// ============ Device Control ============
routes.get("/reboot", deviceController.deviceReboot);
routes.get("/shutdown", deviceController.deviceShutdown);

module.exports = routes;
