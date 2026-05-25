import { Router } from "express";
import * as siteController from "../controllers/site.controller.js";
import * as validate from "../middleware/validationMethod.js";
import allowRoles, { Role } from "../middleware/allowRoles.js";

const router = Router();

/* -------------------- Roles -------------------- */

const ADMIN: Role[] = ["admin"];
const ADMIN_TECH: Role[] = ["admin", "technician"];
const ALL: Role[] = ["admin", "technician", "user"];

/* -------------------- Routes -------------------- */

// create site
router.post("/createSite", allowRoles(ADMIN), siteController.createSite);

// edit site
router.post("/editSite", allowRoles(ADMIN), siteController.editSite);

// delete site
router.post("/deleteSite", allowRoles(ADMIN), siteController.deleteSite);

// get number of sites
router.get("/getnumberOfSite", siteController.numberOfSite);

// get site by user id
router.get("/getSiteByUserId/:userId", siteController.getSiteByUserId);

// check site UID
router.post("/checkSiteUid", siteController.checkSiteUid);

// delete site from user
router.post("/deleteSitefromuser", siteController.deleteSiteFromUser);

// search site
router.get("/searchSite", siteController.searchSite);

// get all site resistance
router.get("/getAllSiteResistance", siteController.getAllSiteResistance);

// get all site temperature
router.get("/getAllSiteTemp", siteController.getAllSiteTemp);

// get all site GN
router.get("/getAllSiteGn", siteController.getAllSiteGn);

// get all site SPD
router.get("/getAllSiteSpd", siteController.getAllSiteSpd);

// get all site VMR
router.get("/getAllSiteVmr", siteController.getAllSiteVmr);

// get site or device or sensor
router.get(
  "/getSiteOrDeviceOrSensor",
  validate.getSiteOrDeviceOrSensorBody,
  siteController.getSiteOrDeviceOrSensor,
);

export default router;
