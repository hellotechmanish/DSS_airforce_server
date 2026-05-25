import { Request, Response } from "express";
import * as siteService from "../services/site.service.js";

interface AuthRequest extends Request {
  user?: any;
}

/* =========================== Create Site ======================== */
export const createSite = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.createSite(req.body, req.user);

    res.status(201).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================== Edit Site ======================== */
export const editSite = async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await siteService.editSite(req.body);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================== Delete Site ======================== */
export const deleteSite = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.deleteSite(req.body);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ======================== Delete Site from user Profile =========================== */
export const deleteSiteFromUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.deleteSiteFromUser(req.body);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================== Number of Site ============================= */
export const numberOfSite = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.numberOfSite(req.query, req.user);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ============================= Get site By UserId =============================== */
export const getSiteByUserId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.getSiteByUserId(req.params.userId as string);
    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ============================== check Site UID exists or not ============================== */
export const checkSiteUid = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.checkSiteUid(req.body);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ============================= Search site by uid or Sitename ================================== */
export const searchSite = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.searchSite(
      req.query.searchQuery as string,
      req.user,
    );

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ============================= GET ALL Resistance Site and Device Data ================================== */
export const getAllSiteResistance = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.getAllSiteResistance(
      req.query,
      req.user,
    );

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ============================= Placeholder site list handlers ============================== */

const emptyPaginatedSiteData = {
  success: true,
  data: {
    msg: [],
    pagination: {
      total: 0,
      totalPages: 1,
      page: 1,
      limit: 10,
    },
  },
};

export const getAllSiteTemp = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  res.status(200).json(emptyPaginatedSiteData);
};

export const getAllSiteGn = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  res.status(200).json(emptyPaginatedSiteData);
};

export const getAllSiteSpd = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  res.status(200).json(emptyPaginatedSiteData);
};

export const getAllSiteVmr = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  res.status(200).json(emptyPaginatedSiteData);
};

/* ============================= GET ALL Site / Device / Sensor ================================== */
export const getSiteOrDeviceOrSensor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await siteService.getSiteOrDeviceOrSensor(req.query);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
