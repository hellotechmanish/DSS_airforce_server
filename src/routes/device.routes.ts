import { Router } from "express";
import allowRoles, { Role } from "../middleware/allowRoles.js";
import * as deviceController from "../controllers/device.controller.js";

const router = Router();

/* -------------------- Roles -------------------- */

const ADMIN: Role[] = ["admin"];
const ADMIN_TECH: Role[] = ["admin", "technician"];
const ALL: Role[] = ["admin", "technician", "user"];

/* -------------------- Routes -------------------- */

// create device
router.post("/createDevice", allowRoles(ADMIN), deviceController.createDevice);

// edit device
router.post("/editDevice", allowRoles(ADMIN), deviceController.editDevice);

// delete device
router.post("/deleteDevice", deviceController.deleteDevice);

// get sensor graph data
router.get("/sensor-data/:deviceId", deviceController.getSensorData);

// latest device data
router.post("/latestData", deviceController.latestdevicedata);

// latest device data by date
router.post("/latestDatabyDate", deviceController.latestdevicedataBydate);

// single site device list
router.get("/getdeviceListbysiteId/:siteId", deviceController.getdeviceList);

// multiple siteIds device list
router.post("/getdeviceListbysiteIds", deviceController.getDeviceListBySiteIds);

// device list by siteId and userId
router.post(
  "/getdeviceListbysiteIdanduserId",
  deviceController.getdeviceListByuserId,
);

// download csv
router.get("/downloadcsv", deviceController.downloadcsv);

// generate report
router.post("/generateReport", deviceController.getCsv);

// get device by id
router.get("/getDeviceById/:deviceId", deviceController.getDeviceById);

// get device data by id
router.get("/getDeviceDataById/:deviceId", deviceController.getDeviceDataById);

// check device UID
router.post("/checkDeviceUid", deviceController.checkDeviceUid);

// delete device from user
router.post("/deleteDevicefromuser", deviceController.deleteDeviceFromUser);

// get device by user id
router.get("/getdevicebyuserId/:userId", deviceController.getDeviceByuserId);

/* -------------------- Device Control -------------------- */

// reboot device
router.get("/reboot", deviceController.deviceReboot);

// shutdown device
router.get(
  "/shutdown",
  allowRoles(ADMIN_TECH),
  deviceController.deviceShutdown,
);

export default router;
