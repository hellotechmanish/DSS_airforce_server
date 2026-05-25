import { Request, Response, NextFunction } from "express";
import schema from "./validationSchema.js";

// ================= CHECK DATA =================

const checkData = (data: Record<string, any>) => {
  try {
    const parsedQuery: Record<string, any> = {};

    for (const key in data) {
      const value = data[key];

      if (value === "null") {
        parsedQuery[key] = null;
      } else if (value === "true") {
        parsedQuery[key] = true;
      } else if (value === "false") {
        parsedQuery[key] = false;
      } else if (value === "undefined") {
        parsedQuery[key] = undefined;
      } else if (
        typeof value === "string" &&
        value.startsWith("[") &&
        value.endsWith("]")
      ) {
        // Array
        parsedQuery[key] = JSON.parse(value);
      } else if (
        typeof value === "string" &&
        value.startsWith("{") &&
        value.endsWith("}")
      ) {
        // Object
        parsedQuery[key] = JSON.parse(value);
      } else if (!isNaN(value)) {
        parsedQuery[key] = +value;
      } else {
        parsedQuery[key] = value;
      }
    }

    return parsedQuery;
  } catch (error) {
    throw new Error("Invalid query parameters");
  }
};

// ================= GET ALL ALARM =================

export const getAllAlarmBody = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    req.query = checkData(req.query);

    const { error } = schema.getAllAlarmSchema.validate(req.query);

    if (error) {
      return res.status(400).json({
        msg: error?.details?.[0]?.message,
        success: false,
      });
    }

    next();
  } catch (error: any) {
    return res.status(400).json({
      msg: error.message,
      success: false,
    });
  }
};

// ================= DOWNLOAD ALARM DATA =================

export const getAllAlarmDataForDownloadBody = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    req.query = checkData(req.query);

    const { error } = schema.getAllAlarmDataForDownloadSchema.validate(
      req.query,
    );

    if (error) {
      return res.status(400).json({
        msg: error?.details?.[0]?.message,
        success: false,
      });
    }

    next();
  } catch (error: any) {
    return res.status(400).json({
      msg: error.message,
      success: false,
    });
  }
};

// ================= ALARM GRAPH VALUE =================

export const getAlarmGraphValueBody = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    req.query = checkData(req.query);

    const { error } = schema.getAlarmGraphValueSchema.validate(req.query);

    if (error) {
      return res.status(400).json({
        msg: error?.details?.[0]?.message,
        success: false,
      });
    }

    next();
  } catch (error: any) {
    return res.status(400).json({
      msg: error.message,
      success: false,
    });
  }
};

// ================= SITE / DEVICE / SENSOR =================

export const getSiteOrDeviceOrSensorBody = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    req.query = checkData(req.query);

    const { error } = schema.getSiteOrDeviceOrSensorSchema.validate(req.query);

    if (error) {
      return res.status(400).json({
        msg: error?.details?.[0]?.message,
        success: false,
      });
    }

    next();
  } catch (error: any) {
    return res.status(400).json({
      msg: error.message,
      success: false,
    });
  }
};
