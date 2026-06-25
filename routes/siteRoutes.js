const express = require("express");
const siteController = require("../controllers/siteController");
const validate = require("../config/validationMethod");
const allowRoles = require("../config/allowRoles");

const routes = express.Router();
const ADMIN = ["admin"];
const ADMIN_TECH = ["admin", "technician"];
const ALL = ["admin", "technician", "user"];

/*     Already protected by app.js */

routes.post("/createSite", allowRoles(ADMIN), siteController.createSite);
routes.post("/editSite", allowRoles(ADMIN), siteController.editSite);
routes.post("/deleteSite", allowRoles(ADMIN), siteController.deleteSite);
routes.get("/getnumberOfSite", siteController.numberOfSite);
routes.get("/getSiteByUserId/:userId", siteController.getSiteByUserId); // testing pending
routes.post("/checkSiteUid", siteController.checkSiteUid);
routes.post("/deleteSitefromuser", siteController.deleteSiteFromUser); //testing pending
routes.get("/searchSite", siteController.searchSite);

routes.get("/getAllSiteResistance", siteController.getAllSiteResistance);
routes.get("/getAllSiteTemp", siteController.getAllSiteTemp);
routes.get("/getAllSiteGn", siteController.getAllSiteGn);
routes.get("/getAllSiteSpd", siteController.getAllSiteSpd);
routes.get("/getAllSiteVmr", siteController.getAllSiteVmr);

routes.get(
  "/getSiteOrDeviceOrSensor",
  validate.getSiteOrDeviceOrSensorBody,
  siteController.getSiteOrDeviceOrSensor,
);

module.exports = routes;
