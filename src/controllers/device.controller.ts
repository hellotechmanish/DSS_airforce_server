// src/controllers/device.controller.ts

import { Request, Response } from "express";
import * as deviceService from "../services/device.service.js";

interface AuthRequest extends Request {
  user?: any;
}

const parseRouteParam = (
  value: string | string[] | undefined,
): string | undefined => (typeof value === "string" ? value : undefined);

/* ============================== Create Device ============================== */
export const createDevice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // console.log("this is the payload inside the req.body", req.body);

  try {
    const response = await deviceService.createDevice(req.body);

    res.status(201).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Edit Device ============================== */
export const editDevice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { deviceID, ...updateData } = req.body;

    const response = await deviceService.editDevice(deviceID, updateData);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Delete Device ============================== */
export const deleteDevice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await deviceService.deleteDevice(req.body.deviceID);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getSensorData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { type } = req.query;

    if (!deviceId || !type) {
      res.status(400).json({
        success: false,
        message: "deviceId and type are required",
      });
      return;
    }

    const response = await deviceService.getSensorData(
      deviceId,
      type as string,
    );

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Latest Device Data ============================== */
export const latestdevicedata = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await deviceService.latestdevicedata(req.body);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Latest Device Data By Date ============================== */
export const latestdevicedataBydate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await deviceService.latestdevicedataBydate(req.body);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Device List ============================== */
export const getdeviceList = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const siteId = parseRouteParam(req.params.siteId);

    if (!siteId) {
      res.status(400).json({
        success: false,
        message: "siteId is required",
      });
      return;
    }

    const response = await deviceService.getdeviceList(siteId, req.user);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Device List By SiteIds ============================== */
export const getDeviceListBySiteIds = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  console.log("data ; ", req.body);

  try {
    const response = await deviceService.getDeviceListBySiteIds(
      req.body.siteIds,
      req.user,
    );

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Device List By User ============================== */
export const getdeviceListByuserId = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const response = await deviceService.getdeviceListByuserId(
      req.body,
      req.user,
    );

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Get Device By ID ============================== */
export const getDeviceById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const deviceId = parseRouteParam(req.params.deviceId);

    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
      return;
    }

    const response = await deviceService.getDeviceById(deviceId);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Get Device Data By ID ============================== */
export const getDeviceDataById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const deviceId = parseRouteParam(req.params.deviceId);

    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
      return;
    }

    const response = await deviceService.getDeviceDataById(deviceId);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Check Device UID ============================== */
export const checkDeviceUid = async (
  req: Request,
  res: Response,
): Promise<void> => {
  console.log("controller", req.body);

  console.log("res controller", req.body.nodeUid);
  try {
    const response = await deviceService.checkDeviceUid(req.body.nodeUid);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Delete Device From User ============================== */
export const deleteDeviceFromUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await deviceService.deleteDeviceFromUser(req.body);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Generate CSV ============================== */
export const getCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await deviceService.getCsv(req.body);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Download CSV ============================== */
export const downloadcsv = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const filePath = await deviceService.downloadcsv();

    res.download(filePath);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Get Device By User ID ============================== */
export const getDeviceByuserId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = parseRouteParam(req.params.userId);

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "userId is required",
      });
      return;
    }

    const response = await deviceService.getDeviceByuserId(userId);

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Device Reboot ============================== */
export const deviceReboot = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await deviceService.deviceReboot();

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/* ============================== Device Shutdown ============================== */
export const deviceShutdown = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const response = await deviceService.deviceShutdown();

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
