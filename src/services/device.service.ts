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
/* ============================== Create Device ============================== */
export const createDevice = async (
    payload: any,
) => {
    const {
        siteId,
        deviceName,
        nodeUid,
        vmrSensors,
        resSensors,
        spdSensors,
        nerSensors,
        resSensorsThreshold,
        vmrSensorsThreshold,
        spdSensorsThreshold,
        nerSensorsThreshold,
    } = payload;

    if (
        !siteId ||
        !deviceName ||
        !nodeUid
    ) {
        throw new Error(
            "siteId, deviceName and nodeUid are required",
        );
    }

    const existingDevice =
        await Device.findOne({
            nodeUid,
        });

    if (existingDevice) {
        throw new Error(
            "Node UID already exists",
        );
    }

    const device =
        await Device.create({
            siteId,
            deviceName,
            nodeUid,
            vmrSensors,
            resSensors,
            spdSensors,
            nerSensors,
            resSensorsThreshold,
            vmrSensorsThreshold,
            spdSensorsThreshold,
            nerSensorsThreshold,
        });

    return {
        success: true,
        message:
            "Device created successfully",
        data: device,
    };
};

/* ============================== Edit Device ============================== */
export const editDevice = async (
    deviceID: string,
    updateData: any,
) => {
    if (!deviceID) {
        throw new Error(
            "deviceID is required",
        );
    }

    if (updateData.nodeUid) {
        const existingDevice =
            await Device.findOne({
                nodeUid:
                    updateData.nodeUid,
                _id: {
                    $ne: deviceID,
                },
            });

        if (existingDevice) {
            throw new Error(
                "Node UID already exists",
            );
        }
    }

    const device =
        await Device.findByIdAndUpdate(
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
        throw new Error(
            "Device not found",
        );
    }

    return {
        success: true,
        message:
            "Device updated successfully",
        data: device,
    };
};

/* ============================== Delete Device ============================== */
export const deleteDevice = async (
    deviceID: string,
) => {
    if (!deviceID) {
        throw new Error(
            "deviceID is required",
        );
    }

    const device =
        await Device.findByIdAndDelete(
            deviceID,
        );

    return {
        success: true,
        message:
            "Device deleted successfully",
        data: device,
    };
};

/* ============================== Latest Device Data ============================== */
export const latestdevicedata =
    async (payload: any) => {
        const {
            sensorName,
            deviceId,
            startDate,
            endDate,
        } = payload;

        const resp =
            await DeviceMsg.aggregate([
                {
                    $match: {
                        deviceId:
                            new mongoose.Types.ObjectId(
                                deviceId,
                            ),
                        "msg.DEVICE_TYPE":
                            sensorName,
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
export const latestdevicedataBydate =
    async (payload: any) => {
        const {
            sensorName,
            deviceId,
            startDate,
            endDate,
        } = payload;

        const resp =
            await DeviceMsg.aggregate([
                {
                    $match: {
                        deviceId:
                            new mongoose.Types.ObjectId(
                                deviceId,
                            ),
                        "msg.DEVICE_TYPE":
                            sensorName,
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
                    $unwind:
                        "$msg.DATASTREAMS",
                },
                {
                    $addFields: {
                        deviceNumber:
                            "$msg.DATASTREAMS.deviceNumber",
                        value:
                            "$msg.DATASTREAMS.value",
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
export const getdeviceList =
    async (
        siteId: string,
        user: any,
    ) => {
        const siteIds = siteId
            .split(",")
            .map(
                (id) =>
                    new mongoose.Types.ObjectId(
                        id,
                    ),
            );

        const query: any = {
            siteId: {
                $in: siteIds,
            },
        };

        if (user.role === "user") {
            query.userId =
                new mongoose.Types.ObjectId(
                    user.id,
                );
        }

        const devices =
            await Device.find(query, {
                deviceName: 1,
                nodeUid: 1,
                createdAt: 1,
                userId: 1,
                _id: 1,
                siteId: 1,
            }).lean();

        return {
            success: true,
            data: devices,
        };
    };

/* ============================== Device List By SiteIds ============================== */
export const getDeviceListBySiteIds =
    async (
        siteIds: string[],
        user: any,
    ) => {
        const query: any = {
            siteId: {
                $in: siteIds,
            },
        };

        if (user.role === "user") {
            query.userId = user._id;
        }

        const devices =
            await Device.find(query)
                .lean();

        return {
            success: true,
            data: devices,
        };
    };

/* ============================== Device List By User ============================== */
export const getdeviceListByuserId =
    async (
        payload: any,
        user: any,
    ) => {
        const {
            siteId,
            userId,
        } = payload;

        const query: any = {
            siteId,
        };

        if (user.role === "user") {
            query.userId = user._id;
        } else {
            query.userId = userId;
        }

        const devices =
            await Device.find(query)
                .lean();

        return {
            success: true,
            data: devices,
        };
    };

/* ============================== Get Device By ID ============================== */
export const getDeviceById =
    async (
        deviceId: string,
    ) => {
        const device =
            await Device.findById(
                deviceId,
            ).populate("siteId");

        return {
            success: true,
            data: device,
        };
    };

/* ============================== Get Device Data By ID ============================== */
export const getDeviceDataById =
    async (
        deviceId: string,
    ) => {
        const device =
            await Device.findById(
                deviceId,
            ).populate("siteId");

        return {
            success: true,
            data: device,
        };
    };

/* ============================== Delete Device From User ============================== */
export const deleteDeviceFromUser =
    async (payload: any) => {
        const {
            userId,
            deviceId,
        } = payload;

        await Device.findByIdAndUpdate(
            deviceId,
            {
                $pullAll: {
                    userId: [userId],
                },
            },
        );

        await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    deviceSensors: {
                        deviceId,
                    },
                },
            },
        );

        return {
            success: true,
            message:
                "Device deleted from user profile",
        };
    };

/* ============================== Get Device By User ID ============================== */
export const getDeviceByuserId =
    async (
        userId: string,
    ) => {
        const devices =
            await Device.find({
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
export const checkDeviceUid = async (
    nodeUid: string
) => {

    console.log("deviceuid>>>", nodeUid);

    // CHECK UID
    const uidExists = await Device.findOne({
        nodeUid,
    });

    console.log("found uid", uidExists);

    return {
        success: true,

        // UID AVAILABLE OR NOT
        status: false,

        message: uidExists
            ? "This UID is not available"
            : "This UID is available",
    };
};
/* ============================== Save Latest Data ============================== */
export const saveLatestData =
    async (
        structuredMsg: any,
        deviceId: string,
        parameterValue: string,
    ) => {
        const msg =
            await DeviceMsg.create({
                deviceId,
                msg: structuredMsg,
                date: moment().format(
                    "YYYY-MM-DD",
                ),
                time: moment().format(
                    "HH:mm:ss",
                ),
                dateAndTime:
                    moment().format(),
            });

        await Device.findByIdAndUpdate(
            deviceId,
            {
                $set: {
                    [parameterValue]:
                        structuredMsg,
                },
            },
        );

        return msg;
    };

/* ============================== Compare Threshold ============================== */
export const compareThresholdValue =
    async (
        structuredMsg: any,
        deviceId: string,
        parameterValue: string,
        deviceExists: any,
    ) => {
        if (
            parameterValue ===
            "ResValues" &&
            deviceExists.ResValues
                ?.DATASTREAMS
        ) {
            for (
                let i = 0;
                i <
                deviceExists.resSensors;
                i++
            ) {
                if (
                    deviceExists.resSensorsThreshold <
                    structuredMsg
                        .DATASTREAMS[i]
                        ?.value
                ) {
                    await Alarm.create({
                        deviceId,
                        SensorName: `R${i + 1
                            }`,
                        thresholdValue:
                            deviceExists.resSensorsThreshold,
                        alarmValue:
                            structuredMsg
                                .DATASTREAMS[i]
                                .value,
                    });
                }
            }
        }

        return true;
    };

/* ============================== Generate CSV ============================== */
export const getCsv = async (
    payload: any,
) => {
    const {
        sensorName,
        deviceId,
        startDate,
        endDate,
    } = payload;

    const records =
        await DeviceMsg.aggregate([
            {
                $match: {
                    deviceId:
                        new mongoose.Types.ObjectId(
                            deviceId,
                        ),
                    "msg.DEVICE_TYPE":
                        sensorName,
                    createdAt: {
                        $gte:
                            moment(startDate)
                                .startOf("day")
                                .toDate(),
                        $lte:
                            moment(endDate)
                                .endOf("day")
                                .toDate(),
                    },
                },
            },
        ]);

    const writer =
        csvWriter.createObjectCsvWriter(
            {
                path: "file.csv",
                header: [
                    {
                        id: "date",
                        title: "Date",
                    },
                ],
            },
        );

    await writer.writeRecords(
        records,
    );

    return {
        success: true,
        message:
            "CSV generated successfully",
    };
};

/* ============================== Download CSV ============================== */
export const downloadcsv =
    async () => {
        const filePath =
            path.resolve("file.csv");

        return filePath;
    };

/* ============================== Device Reboot ============================== */
export const deviceReboot =
    async () => {
        exec(
            "echo 123456 | sudo -S reboot",
        );

        return {
            success: true,
            message:
                "Reboot triggered",
        };
    };

/* ============================== Device Shutdown ============================== */
export const deviceShutdown =
    async () => {
        exec(
            "echo 123456 | sudo -S shutdown now",
        );

        return {
            success: true,
            message:
                "Shutdown triggered",
        };
    };