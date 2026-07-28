const { dateGroup } = require("../helperFunction/dateGroup");
const Alarm = require("../models/alarm");
const moment = require("moment");
const ObjectId = require("mongodb").ObjectId;
const AlarmStatus = require("../models/alarmStatus");
const DeviceMsg = require("../models/deviceMsg");
const Device = require("../models/device");

// Helper: numeric-safe threshold comparison
const isThresholdExceeded = (threshold, value) => {
  const t = Number(threshold);
  const v = Number(value);
  if (Number.isNaN(t) || Number.isNaN(v)) return false;
  return v >= t;
};

// Helper: determine if a device currently has any threshold-exceeding value
const deviceHasActiveAlarm = (dev) => {
  if (!dev) return false;

  try {
    const streamExceedsThreshold = (streams, threshold) =>
      Array.isArray(streams) &&
      streams.some((stream) => isThresholdExceeded(threshold, stream?.value));

    if (
      streamExceedsThreshold(
        dev?.ResValues?.DATASTREAMS,
        dev.resSensorsThreshold,
      )
    )
      return true;

    if (
      streamExceedsThreshold(
        dev?.SpdValues?.DATASTREAMS,
        dev.spdSensorsThreshold,
      )
    )
      return true;

    if (
      streamExceedsThreshold(
        dev?.NerValues?.DATASTREAMS,
        dev.nerSensorsThreshold,
      )
    )
      return true;

    const phaseNames = ["r", "y", "b", "ry", "yb", "rb"];
    const vmrExceeded = dev?.VmrValues?.DATASTREAMS?.some((stream) =>
      Array.isArray(stream?.value) &&
      stream.value.some((phase, index) =>
        isThresholdExceeded(
          dev?.vmrSensorsThreshold?.[phase?.phaseNumber || phaseNames[index]],
          phase?.value,
        ),
      ),
    );

    if (vmrExceeded)
      return true;
  } catch (e) {
    return false;
  }

  return false;
};

exports.getAlarmGraphValue = async (req, res) => {
  try {
    const { startDate, endDate, deviceId, sensorName } = req.query;
    let query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(moment(endDate).add(1, "days").format("YYYY-MM-DD")),
      },
      deviceId,
    };
    if (sensorName) {
      if (sensorName == "PH") {
        query.SensorName = { $regex: /^[P][H]/, $options: "m" };
      } else if (sensorName == "RES") {
        query.SensorName = { $regex: /^[R]/, $options: "m" };
      } else {
        query.SensorName = { $regex: sensorName, $options: "m" };
      }
    }

    let data = await Alarm.find(query, {
      createdAt: 1,
      alarmValue: 1,
    });

    const group = dateGroup(startDate, endDate, "createdAt");
    group.alarmValue = { $max: "$msg.DATASTREAMS.value" };

    let isAlarm = true;
    // if (data?.length <= 0) {
    //   isAlarm = false;

    //   data = await DeviceMsg.aggregate([
    //     {
    //       $unwind: "$msg.DATASTREAMS",
    //     },
    //     // {
    //     //   $unwind: "$msg.DATASTREAMS.value",
    //     // },
    //     {
    //       $match: {
    //         deviceId: ObjectId(deviceId),
    //         "msg.DEVICE_TYPE": sensorName,
    //         createdAt: query.createdAt,
    //       },
    //     },
    //     {
    //       $group: group,
    //     },
    //     // {
    //     //   $project: {
    //     //     createdAt: "$_id",
    //     //     alarmValue: "$alarmValue.value",
    //     //   },
    //     // },
    //   ]);
    // }

    return res.status(200).json({ data, success: true, isAlarm });
  } catch (err) {
    console.log("error from getAllAlarm", err);
    return res.status(500).json({ msg: err.message });
  }
};

/* It is used to cancelled the alarm sound */
exports.updateStatus = async (req, res) => {
  try {
    // Accept either `status` (enable/disable alarm system) or `muted` (user mute)
    const { status, muted } = req.body;

    if (typeof status === "undefined" && typeof muted === "undefined") {
      return res
        .status(400)
        .json({ msg: "Provide 'status' or 'muted' boolean", success: false });
    }

    if (typeof status !== "undefined" && status !== true && status !== false) {
      return res
        .status(400)
        .json({ msg: "Status must be boolean", success: false });
    }

    if (typeof muted !== "undefined" && muted !== true && muted !== false) {
      return res
        .status(400)
        .json({ msg: "Muted must be boolean", success: false });
    }

    const alarmStatus = await AlarmStatus.findOne({});

    if (alarmStatus) {
      if (typeof status !== "undefined") alarmStatus.status = status;
      if (typeof muted !== "undefined") alarmStatus.muted = muted;
      await alarmStatus.save();
    } else {
      /* First time data not found then it created */
      await AlarmStatus.create({
        status: typeof status !== "undefined" ? status : true,
        muted: typeof muted !== "undefined" ? muted : false,
      });
    }

    return res.status(200).json({ msg: "Status Updated", success: true });
  } catch (err) {
    console.log("Error is ", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};

/* Returns alarm status and whether the client should play sound */
exports.getAlarmStatus = async (req, res) => {
  try {
    let data = await AlarmStatus.findOne({}).select("-_id status muted").lean();

    const deviceData = await Device.find();

    console.log("AlarmStatus:", data);

    // Ensure a consistent payload
    if (!data) {
      data = { status: true, muted: false, sound: false };
      await AlarmStatus.create({ status: true, muted: false });
    }

    if (typeof data.muted !== "boolean") data.muted = false;
    if (typeof data.status !== "boolean") data.status = true;

    data.sound = false;

    // `sound` represents the actual threshold state. The client uses `muted`
    // separately to decide whether that active alarm may play audio.
    const FRESHNESS_MS = parseInt(process.env.ALARM_FRESHNESS_MS) || 30000;

    if (data.status) {
      const now = Date.now();
      const anyActiveAlarm = deviceData.some((dev) => {
        if (!dev) return false;
        // `updatedAt` is maintained by the Device schema. `lastUpdated` is
        // retained as a fallback for older records.
        const lastUpdate = dev.lastUpdated || dev.updatedAt;
        if (!lastUpdate) return false;
        const lu = new Date(lastUpdate).getTime();
        if (Number.isNaN(lu)) return false;
        if (now - lu > FRESHNESS_MS) return false;
        return deviceHasActiveAlarm(dev);
      });

      data.sound = Boolean(anyActiveAlarm);
    }

    return res.status(200).json({ data, success: true });
  } catch (err) {
    console.log("Error is ", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};

exports.getAlarmData = async (req, res, next) => {
  try {
    const {
      deviceId,
      page,
      limit,
      startDate,
      endDate,
      sensorName,
      search,
      sortBy,
      sortType,
    } = req.query;
    let skip = (page - 1) * limit;
    let query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(moment(endDate).add(1, "days").format("YYYY-MM-DD")),
      },
    };

    if (search) {
      query.$or = [
        { "device.deviceName": { $regex: search, $options: "i" } },
        { "device.nodeUid": { $regex: search, $options: "i" } },
        { "site.siteName": { $regex: search, $options: "i" } },
        { "site.uid": { $regex: search, $options: "i" } },
      ];
    }
    console.log({ deviceId });

    if (deviceId) {
      query = {
        deviceId: ObjectId(deviceId),
      };
    }

    // if (req.user.role === "user") {
    // }

    if (sensorName) {
      if (sensorName == "PH") {
        query.SensorName = { $regex: /^[P][H]/, $options: "m" };
      } else if (sensorName == "RES") {
        query.SensorName = { $regex: /^[R]/, $options: "m" };
      } else {
        query.SensorName = { $regex: sensorName, $options: "m" };
      }
    }

    // Validate sort input
    const allowedSortFields = [
      "createdAt",
      "alarmValue",
      "thresholdValue",
      "SensorName",
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const safeSortType = sortType === 1 || sortType === -1 ? sortType : -1;

    let arrQuery = [
      {
        $lookup: {
          from: "devices",
          localField: "deviceId",
          foreignField: "_id",
          as: "device",
        },
      },
      {
        $unwind: "$device",
      },
      {
        $lookup: {
          from: "sites",
          localField: "device.siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      {
        $unwind: "$site",
      },
    ];

    let data = await Alarm.aggregate([
      ...arrQuery,
      {
        $match: query,
      },
      {
        $sort: { [safeSortBy]: safeSortType },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 1,
          deviceId: {
            _id: "$device._id",
            siteId: {
              _id: "$site._id",
              siteName: "$site.siteName",
              uid: "$site.uid",
            },
            deviceName: "$device.deviceName",
            nodeUid: "$device.nodeUid",
          },
          SensorName: 1,
          thresholdValue: 1,
          alarmValue: 1,
          createdAt: 1,
        },
      },
    ]);
    let length = await Alarm.aggregate([
      ...arrQuery,
      {
        $match: query,
      },
      {
        $project: {
          _id: 1,
        },
      },
    ]);
    length = length?.length;
    // Mark alarms retrieved as read (was inverted and set true -> false)
    await Alarm.updateMany({ isRead: false }, { $set: { isRead: true } });
    // let alarm = await Alarm.find(query)
    //   .populate([
    //     {
    //       path: "deviceId",
    //       populate: {
    //         path: "siteId",
    //         select: { siteName: 1, uid: 1 },
    //       },
    //       select: "deviceName nodeUid",
    //     },
    //   ])
    //   .sort({ _id: -1 })
    //   .skip(skip)
    //   .limit(limit);

    // let length = await Alarm.countDocuments(query);

    return res.status(200).json({ lengthData: length, data, status: true });
  } catch (error) {
    console.log("error from getAllAlarm", error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

exports.getAllAlarmDataForDownload = async (req, res) => {
  try {
    const { deviceId, startDate, endDate, sensorName } = req.query;
    let query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(moment(endDate).add(1, "days").format("YYYY-MM-DD")),
      },
    };

    if (req.user.role === "user") {
      query = {
        deviceId: { $in: deviceId },
      };
    }
    if (sensorName) {
      if (sensorName == "PH") {
        query.SensorName = { $regex: /^[P][H]/, $options: "m" };
      } else if (sensorName == "RES") {
        query.SensorName = { $regex: /^[R]/, $options: "m" };
      } else {
        query.SensorName = { $regex: sensorName, $options: "m" };
      }
    }

    let data = await Alarm.find(query)
      .populate([
        {
          path: "deviceId",
          populate: {
            path: "siteId",
            select: { siteName: 1, uid: 1 },
          },
          select: "deviceName nodeUid",
        },
      ])
      .sort({ _id: -1 });

    return res.status(200).json({ data, status: true });
  } catch (err) {
    console.log("Error is ", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};

// ============================ GET ALL ALARMS ================================== //
exports.getAllAlarm = async (req, res, next) => {
  console.log("==== get All Alarm function got hit ====");
  const { deviceId, page, limit } = req.body;

  if (!deviceId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  let pages = Number(page) || 1;
  let limits = Number(limit) || 8;

  let skip = (pages - 1) * limits;

  let length;

  try {
    let alarm;
    if (req.user.role === "user") {
      alarm = await Alarm.find({
        deviceId: { $in: deviceId },
      })
        .populate([
          {
            path: "deviceId",
            populate: {
              path: "siteId",
              select: { siteName: 1, uid: 1 },
            },
            select: "deviceName nodeUid",
          },
        ])
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limits);
      length = await Alarm.countDocuments({
        deviceId: { $in: deviceId },
      });
    } else {
      alarm = await Alarm.find({})
        .populate([
          {
            path: "deviceId",
            populate: {
              path: "siteId",
              select: { siteName: 1, uid: 1 },
            },
            select: "deviceName nodeUid",
          },
        ])
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limits);

      length = await Alarm.countDocuments({});
    }
    return res
      .status(200)
      .json({ msg: alarm, status: true, lengthData: length });
  } catch (error) {
    console.log("error from getAllAlarm", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================ delete ALARMS by ID ================================== //
exports.deleteAlarm = async (req, res, next) => {
  console.log("==== deleteAlarm function got hit ====");
  const { alarmId } = req.body;

  if (!alarmId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  try {
    await Alarm.findByIdAndDelete(alarmId);
    return res.status(200).json({ msg: "Alarm deleted" });
  } catch (error) {
    console.log("Error from deleteAlarm", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================ Filter Alarm based on sensor ============================ //
exports.filterAlarm = async (req, res, next) => {
  const { sensorName, deviceId, page, limit } = req.query;

  let pages = Number(page) || 1;
  let limits = Number(limit) || 8;

  let skip = (pages - 1) * limits;

  let length;

  try {
    if (deviceId) {
      let filteredAlarm;
      if (sensorName === "PH") {
        filteredAlarm = await Alarm.find({
          deviceId,
          SensorName: { $regex: /^[P][H]/, $options: "m" },
        })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limits)
          .populate([
            {
              path: "deviceId",
              populate: {
                path: "siteId",
                select: { siteName: 1, uid: 1 },
              },
              select: "deviceName nodeUid",
            },
          ]);
        length = await Alarm.countDocuments({
          deviceId,
          SensorName: { $regex: /^[P][H]/, $options: "m" },
        });
        return res.status(200).json({ msg: filteredAlarm, lengthData: length });
      }

      if (sensorName === "RES") {
        filteredAlarm = await Alarm.find({
          deviceId,
          SensorName: { $regex: /^[R]/, $options: "m" },
        })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limits)
          .populate([
            {
              path: "deviceId",
              populate: {
                path: "siteId",
                select: { siteName: 1, uid: 1 },
              },
              select: "deviceName nodeUid",
            },
          ]);
        length = await Alarm.countDocuments({
          deviceId,
          SensorName: { $regex: /^[R]/, $options: "m" },
        });
        return res.status(200).json({ msg: filteredAlarm, lengthData: length });
      }
      filteredAlarm = await Alarm.find({
        deviceId,
        SensorName: { $regex: sensorName, $options: "i" },
      })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limits)
        .populate([
          {
            path: "deviceId",
            populate: {
              path: "siteId",
              select: { siteName: 1, uid: 1 },
            },
            select: "deviceName nodeUid",
          },
        ]);
      length = await Alarm.countDocuments({
        deviceId,
        SensorName: { $regex: sensorName, $options: "i" },
      });
      return res.status(200).json({ msg: filteredAlarm, lengthData: length });
    }
  } catch (error) {
    console.log("error from filterAlarm ", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

exports.getNotificationCount = async (req, res) => {
  try {
    // unread alarms should be isRead: false
    const count = await Alarm.countDocuments({ isRead: false });
    return res.status(200).json({ count, success: true });
  } catch (err) {
    console.log("error in notification", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};
