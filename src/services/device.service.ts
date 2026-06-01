// src/services/device.service.ts

import mongoose from "mongoose";
import moment from "moment";
import path from "path";
import csvWriter from "csv-writer";
import { exec } from "child_process";

import Device from "../models/device.model.js";
import DeviceMsg from "../models/deviceMsg.model.js";
import Alarm from "../models/alarm.model.js";
import User from "../models/user.modal.js";

interface CreateDevicePayload {
  site_id: string;

  deviceName: string;

  nodeUid: string;

  sensorCounts: {
    temperature: number;
    humidity: number;
    vmr: number;
    res: number;
    spd: number;
    ner: number;
  };

  thresholds: {
    vmr: {
      r: number;
      y: number;
      b: number;
      ry: number;
      yb: number;
      rb: number;
    };

    res: number;
    spd: number;
    ner: number;
  };

  isActive?: boolean;
}

/* ============================== Create Device ============================== */
export const createDevice = async (payload: CreateDevicePayload) => {
  const {
    site_id,
    deviceName,
    nodeUid,
    sensorCounts,
    thresholds,
    isActive = true,
  } = payload;

  console.log("create device payload", payload);

  if (!site_id || !deviceName || !nodeUid) {
    throw new Error("site_id, deviceName and nodeUid are required");
  }

  const existingDevice = await Device.findOne({
    nodeUid,
  });

  if (existingDevice) {
    throw new Error("Node UID already exists");
  }

  const device = await Device.create({
    siteId: site_id,

    deviceName: deviceName.trim(),

    nodeUid: nodeUid.trim(),

    sensorCounts: {
      temperature: Number(sensorCounts.temperature),

      humidity: Number(sensorCounts.humidity),

      vmr: sensorCounts.vmr,

      res: sensorCounts.res,

      spd: sensorCounts.spd,

      ner: sensorCounts.ner,
    },

    thresholds: {
      vmr: thresholds.vmr,

      res: thresholds.res,

      spd: thresholds.spd,

      ner: thresholds.ner,
    },

    isActive,
  });

  return {
    success: true,

    message: "Device created successfully",

    data: device,
  };
};

/* ============================== Edit Device ============================== */
export const editDevice = async (deviceID: string, updateData: any) => {
  if (!deviceID) {
    throw new Error("deviceID is required");
  }

  if (updateData.nodeUid) {
    const existingDevice = await Device.findOne({
      nodeUid: updateData.nodeUid,
      _id: {
        $ne: deviceID,
      },
    });

    if (existingDevice) {
      throw new Error("Node UID already exists");
    }
  }

  const device = await Device.findByIdAndUpdate(
    deviceID,
    {
      $set: updateData,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!device) {
    throw new Error("Device not found");
  }

  return {
    success: true,
    message: "Device updated successfully",
    data: device,
  };
};

/* ============================== Delete Device ============================== */
export const deleteDevice = async (deviceID: string) => {
  if (!deviceID) {
    throw new Error("deviceID is required");
  }

  const device = await Device.findByIdAndDelete(deviceID);

  return {
    success: true,
    message: "Device deleted successfully",
    data: device,
  };
};

export const getSensorData = async (deviceId: string, sensorType: string, since?: string) => {
  const query: any = {
    deviceId: new mongoose.Types.ObjectId(deviceId),
    sensorName: sensorType, // Ensure ye wahi key hai jo schema mein hai
  };

  // Agar 'since' timestamp diya hai, toh uske BAAD ka data mangwao
  if (since) {
    query.createdAt = { $gt: new Date(since) };
  }

  const data = await DeviceMsg.find(query)
    .sort({ createdAt: -1 }) // Latest first
    .limit(since ? 10 : 50)  // Initial par 50, update par max 10 (safety ke liye)
    .lean();

  return {
    success: true,
    data: data.reverse(), // Graph ke liye chronologically set (Old -> New)
  };
};

/* ============================== Latest Device Data ============================== */
export const latestdevicedata = async (payload: any) => {
  const { sensorName, deviceId, startDate, endDate } = payload;

  const resp = await DeviceMsg.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        "msg.DEVICE_TYPE": sensorName,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
  ]);

  return {
    success: true,
    data: resp,
  };
};

/* ============================== Latest Device Data By Date ============================== */
export const latestdevicedataBydate = async (payload: any) => {
  const { sensorName, deviceId, startDate, endDate } = payload;

  const resp = await DeviceMsg.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        "msg.DEVICE_TYPE": sensorName,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $project: {
        msg: 1,
        date: 1,
      },
    },
    {
      $unwind: "$msg.DATASTREAMS",
    },
    {
      $addFields: {
        deviceNumber: "$msg.DATASTREAMS.deviceNumber",
        value: "$msg.DATASTREAMS.value",
      },
    },
    {
      $project: {
        msg: 0,
      },
    },
    {
      $group: {
        _id: "$date",
        totalavgUnits: {
          $avg: "$value",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  return {
    success: true,
    data: resp,
  };
};

/* ============================== Device List ============================== */
export const getdeviceList = async (siteId: string, user: any) => {
  const siteIds = siteId
    .split(",")
    .map((id) => new mongoose.Types.ObjectId(id));

  const query: any = {
    siteId: {
      $in: siteIds,
    },
  };

  if (user.role === "user") {
    query.userId = new mongoose.Types.ObjectId(user.id);
  }

  const devices = await Device.find(query, {
    _id: 1,

    deviceName: 1,

    nodeUid: 1,

    siteId: 1,

    createdAt: 1,

    isActive: 1,

    sensorCounts: 1,

    thresholds: 1,
  })
    .populate("siteId", "siteName")
    .lean();

  return {
    success: true,

    data: devices,
  };
};

/* ============================== Device List By SiteIds ============================== */
export const getDeviceListBySiteIds = async (siteIds: string[], user: any) => {
  const query: any = {
    siteId: {
      $in: siteIds,
    },
  };

  if (user.role === "user") {
    query.userId = user._id;
  }

  const devices = await Device.find(query).lean();

  return {
    success: true,
    data: devices,
  };
};

/* ============================== Device List By User ============================== */
export const getdeviceListByuserId = async (payload: any, user: any) => {
  const { siteId, userId } = payload;

  const query: any = {
    siteId: siteId,
  };

  if (user.role === "user") {
    query.userId = user._id;
  } else {
    query.userId = userId;
  }

  const devices = await Device.find(query).lean();

  return {
    success: true,
    data: devices,
  };
};

/* ============================== Get Device By ID ============================== */
export const getDeviceById = async (deviceId: string) => {
  const device = await Device.findById(deviceId).populate("siteId");

  return {
    success: true,
    data: device,
  };
};

/* ============================== Get Device Data By ID ============================== */
export const getDeviceDataById = async (deviceId: string) => {
  const device = await Device.findById(deviceId).populate("siteId");

  return {
    success: true,
    data: device,
  };
};

/* ============================== Delete Device From User ============================== */
export const deleteDeviceFromUser = async (payload: any) => {
  const { userId, deviceId } = payload;

  await Device.findByIdAndUpdate(deviceId, {
    $pullAll: {
      userId: [userId],
    },
  });

  await User.findByIdAndUpdate(userId, {
    $pull: {
      deviceSensors: {
        deviceId,
      },
    },
  });

  return {
    success: true,
    message: "Device deleted from user profile",
  };
};

/* ============================== Get Device By User ID ============================== */
export const getDeviceByuserId = async (userId: string) => {
  const devices = await Device.find({
    userId: {
      $in: [userId],
    },
  });

  return {
    success: true,
    data: devices,
  };
};

/* ============================== Check Device UID ============================== */
export const checkDeviceUid = async (nodeUid: string) => {
  console.log("deviceuid>>>", nodeUid);

  // CHECK UID
  //   const uidExists = await Device.findOne({
  //     nodeUid,
  //   });

  const uidExists = await Device.exists({
    nodeUid,
  });

  console.log("found uid", uidExists);

  return {
    success: true,
    available: !uidExists,
    message: uidExists ? "Node UID already exists" : "Node UID available",
  };
};

/* ============================== Save Latest Data ============================== */
export const saveLatestData = async (
  structuredMsg: any,
  deviceId: string,
  parameterValue: string,
) => {
  try {
    console.log(`⏳ Saving ${parameterValue} for Device: ${deviceId}`);

    // Naye Schema ke hisaab se mapping
    const msg = await DeviceMsg.create({
      deviceId: new mongoose.Types.ObjectId(deviceId),
      sensorName: structuredMsg.DEVICE_TYPE, // StructuredMsg se RES, NER etc uthaya
      dataStreams: structuredMsg.DATASTREAMS.map((ds: any) => ({
        sensorNumber: ds.deviceNumber, // Aapke payload mein deviceNumber hai, schema mein sensorNumber
        value: Number(ds.value),
      })),
      timestamp: new Date(),
    });

    console.log(`✨ Msg Created in DB for ${parameterValue}`);

    // Device collection mein latest update (Dashboard ke liye)
    await Device.findByIdAndUpdate(deviceId, {
      $set: {
        [parameterValue]: structuredMsg,
      },
    });

    return msg;
  } catch (err: any) {
    console.error(
      `❌ Error in saveLatestData (${parameterValue}):`,
      err.message,
    );
    throw err;
  }
};

/* ============================== Compare Threshold ============================== */
export const compareThresholdValue = async (
  structuredMsg: any,
  deviceId: string,
  parameterValue: string,
  deviceExists: any,
) => {
  if (parameterValue === "ResValues" && deviceExists.ResValues?.DATASTREAMS) {
    for (let i = 0; i < deviceExists.resSensors; i++) {
      if (
        deviceExists.resSensorsThreshold < structuredMsg.DATASTREAMS[i]?.value
      ) {
        await Alarm.create({
          deviceId,
          SensorName: `R${i + 1}`,
          thresholdValue: deviceExists.resSensorsThreshold,
          alarmValue: structuredMsg.DATASTREAMS[i].value,
        });
      }
    }
  }

  return true;
};

/* ============================== Generate CSV ============================== */
export const getCsv = async (payload: any) => {
  const { sensorName, deviceId, startDate, endDate } = payload;

  const records = await DeviceMsg.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        "msg.DEVICE_TYPE": sensorName,
        createdAt: {
          $gte: moment(startDate).startOf("day").toDate(),
          $lte: moment(endDate).endOf("day").toDate(),
        },
      },
    },
  ]);

  const writer = csvWriter.createObjectCsvWriter({
    path: "file.csv",
    header: [
      {
        id: "date",
        title: "Date",
      },
    ],
  });

  await writer.writeRecords(records);

  return {
    success: true,
    message: "CSV generated successfully",
  };
};

/* ============================== Download CSV ============================== */
export const downloadcsv = async () => {
  const filePath = path.resolve("file.csv");

  return filePath;
};

/* ============================== Device Reboot ============================== */
export const deviceReboot = async () => {
  exec("echo 123456 | sudo -S reboot");

  return {
    success: true,
    message: "Reboot triggered",
  };
};

/* ============================== Device Shutdown ============================== */
export const deviceShutdown = async () => {
  exec("echo 123456 | sudo -S shutdown now");

  return {
    success: true,
    message: "Shutdown triggered",
  };
};
