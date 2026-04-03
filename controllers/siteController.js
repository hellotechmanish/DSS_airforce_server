const Alarm = require("../models/alarm");
const Device = require("../models/device");
const Site = require("../models/site");
const User = require("../models/user");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
// =========================== Create Site ======================== //
exports.createSite = async (req, res, next) => {
  console.log("-- createSite function got hit () --");
  const { siteName, uid, location, pincode, country, state } = req.body;

  if (!siteName || !uid || !location || !pincode || !country || !state) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  try {
    let site = await Site.create({
      siteName,
      uid,
      location,
      pincode,
      country,
      state,
    });
    if (site) {
      return res.status(200).json({ msg: "site created successfully" });
    }
  } catch (error) {
    console.log("error from createSite ==>", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// =========================== Edit Site ======================== //
exports.editSite = async (req, res, next) => {
  console.log("==== editSite function got hit () ====");
  const { siteId, siteName, uid, location, pincode, country, state } = req.body;
  try {
    let site = await Site.findByIdAndUpdate(
      siteId,
      { siteName, uid, location, pincode, country, state },
      { new: true },
    );

    if (site) {
      return res
        .status(200)
        .json({ msg: "site edited successfully", data: site });
    }
  } catch (error) {
    console.log("error from editSite ==>", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// =========================== Delete Site ======================== //
exports.deleteSite = async (req, res, next) => {
  console.log("==== deleteSite function got hit () ====");
  const { siteId } = req.body;
  if (!siteId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }
  try {
    let site = await Site.findByIdAndDelete(siteId);
    await Device.deleteMany({ siteId: siteId });
    // console.log("DELETED SITE ===>", site);
    if (site) {
      return res.status(200).json({ msg: "site deleted successfully" });
    }
  } catch (error) {
    console.log("error from deleteSite ==>", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ======================== Delete Site from user Profile =========================== //
exports.deleteSiteFromUser = async (req, res, next) => {
  const { userId, siteId } = req.body;
  if (!siteId || !userId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }
  try {
    let resp = await Site.findByIdAndUpdate(siteId, {
      $pullAll: {
        userId: [userId],
      },
    });
    if (resp) {
      return res.status(200).json({ msg: "Site deleted from user Profile" });
    }
  } catch (error) {
    console.log("error from deleteSiteFromUser ==>", error.message);
  }
};

// =========================== Number of Site ============================= //
exports.numberOfSite = async (req, res) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    //  pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let siteFilter = {};

    //  ROLE BASED SITE FILTER
    if (req.user.role === "admin" || req.user.role === "technician") {
      siteFilter = {};
    } else if (req.user.role === "user") {
      siteFilter = {
        userId: new mongoose.Types.ObjectId(req.user.id),
      };
    } else {
      return res.status(403).json({ msg: "Invalid role" });
    }

    //  total count (before pagination)
    const total = await Site.countDocuments(siteFilter);

    //  paginated sites
    const sites = await Site.find(siteFilter).skip(skip).limit(limit).lean();

    if (!sites.length) {
      return res.status(200).json({
        msg: [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const siteIds = sites.map((site) => site._id);

    let deviceMatch = {
      siteId: { $in: siteIds },
    };

    //  USER DEVICE FILTER
    if (req.user.role === "user") {
      deviceMatch.userId = new mongoose.Types.ObjectId(req.user.id);
    }

    const deviceCounts = await Device.aggregate([
      { $match: deviceMatch },
      {
        $group: {
          _id: "$siteId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    deviceCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    const updatedSites = sites.map((site) => ({
      ...site,
      deviceCount: countMap[site._id.toString()] || 0,
    }));

    //  debug log
    console.log("Pagination:", {
      page,
      limit,
      total,
      returned: updatedSites.length,
    });

    return res.status(200).json({
      msg: updatedSites,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("numberOfSite error:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// ============================= Get site By UserId =============================== //
exports.getSiteByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const objectUserId = new mongoose.Types.ObjectId(userId);

    let resp = await Site.find({
      userId: objectUserId,
    }).lean();

    for (let item of resp) {
      //  TOTAL DEVICES (already tha)
      item.deviceCount = await Device.countDocuments({
        siteId: item._id,
      });

      //  USER ASSIGNED DEVICES (NEW)
      item.userDeviceCount = await Device.countDocuments({
        siteId: item._id,
        userId: objectUserId,
      });
    }

    return res.status(200).json({
      msg: resp,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
    });
  }
};

// ============================== check Site UID exists or not ============================== //
exports.checkSiteUid = async (req, res, next) => {
  const { uid } = req.body;
  try {
    let resp = await Site.findOne({ uid });
    // console.log("resp checkSiteUid ==>",  resp )
    if (!resp) {
      return res
        .status(200)
        .json({ msg: "This UID is available", status: true });
    }
    if (resp) {
      return res
        .status(200)
        .json({ msg: "This UID is not available", status: false });
    }
  } catch (error) {
    console.log("error from checkSiteUid", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================= Search site by uid or Sitename ================================== //
exports.searchSite = async (req, res, next) => {
  const { searchQuery } = req.query;
  try {
    if (req.user.role === "user") {
      // console.log("searchSite role 2")
      RespSite = await Site.find({
        userId: { $in: [req.user._id] },
        $or: [
          { uid: { $regex: searchQuery, $options: "i" } },
          { siteName: { $regex: searchQuery, $options: "i" } },
        ],
      }).lean();

      return res.status(200).json({ msg: RespSite });
    }
    let sites = await Site.find({
      $or: [
        { uid: { $regex: searchQuery, $options: "i" } },
        { siteName: { $regex: searchQuery, $options: "i" } },
      ],
    });

    return res.status(200).json({ msg: sites });
  } catch (error) {
    console.log("error from searchSite ", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================= GET ALL Resistance Site and Device Data ================================== //
exports.getAllSiteResistance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    let matchStage = {};

    // 🔥 ROLE FILTER
    if (req.user.role === "user") {
      matchStage.userId = new mongoose.Types.ObjectId(req.user.id);
    }

    const pipeline = [
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      {
        $unwind: "$site",
      },
      {
        $unwind: {
          path: "$ResValues.DATASTREAMS",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          resistanceNumber: "$ResValues.DATASTREAMS.deviceNumber",
          resistanceValue: "$ResValues.DATASTREAMS.value",
        },
      },

      // 🔍 SEARCH FILTER
      {
        $match: {
          $or: [
            { deviceName: { $regex: search, $options: "i" } },
            { nodeUid: { $regex: search, $options: "i" } },
            { "site.siteName": { $regex: search, $options: "i" } },
          ],
        },
      },

      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteName: "$site.siteName",
          siteUid: "$site.uid",
          resistanceNumber: 1,
          resistanceValue: 1,
          resSensorsThreshold: 1,
        },
      },

      //  PAGINATION + TOTAL
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await Device.aggregate(pipeline);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    //  DEBUG
    console.log("Resistance Pagination:", {
      page,
      limit,
      total,
      returned: data.length,
    });

    return res.status(200).json({
      msg: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log("error from getAllSiteResistance =>", error.message);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================= GET ALL getAllSiteTemp and Device Data ================================== //
exports.getAllSiteTemp = async (req, res) => {
  try {
    // ✅ query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "siteId",
        },
      },
      {
        $unwind: "$HumValues.DATASTREAMS",
      },
      {
        $unwind: "$TempValues.DATASTREAMS",
      },
      {
        $addFields: {
          humKey: "$HumValues.DATASTREAMS.deviceNumber",
          humValue: "$HumValues.DATASTREAMS.value",
          tempKey: "$TempValues.DATASTREAMS.deviceNumber",
          tempValue: "$TempValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          humKey: 1,
          humValue: 1,
          tempKey: 1,
          tempValue: 1,
        },
      },

      // ✅ pagination + total count
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await Device.aggregate(pipeline);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    // ✅ debug log (important)
    console.log("Pagination Info:", {
      page,
      limit,
      total,
      returned: data.length,
    });

    return res.status(200).json({
      msg: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log("error from getAllSiteTemp =>", error.message);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================= GET ALL GN/NER Site and Device Data ================================== //
exports.getAllSiteGn = async (req, res, next) => {
  try {
    // let resp = await Device.find().populate('siteId')
    let resp = await Device.aggregate([
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "siteId",
        },
      },
      {
        $unwind: "$NerValues.DATASTREAMS",
      },
      {
        $addFields: {
          gnNumber: "$NerValues.DATASTREAMS.deviceNumber",
          gnValue: "$NerValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          gnNumber: 1,
          gnValue: 1,
          nerSensorsThreshold: 1,
        },
      },
    ]);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getAllSiteGN =>", error.message);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================= GET ALL spd Site and Device Data ================================== //
exports.getAllSiteSpd = async (req, res, next) => {
  try {
    // let resp = await Device.find().populate('siteId')
    let resp = await Device.aggregate([
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          // pipeline: [
          //   { "$project": { "siteName" : 1, "uid": 1 }}
          // ],
          as: "siteId",
        },
      },
      {
        $unwind: "$SpdValues.DATASTREAMS",
      },
      {
        $addFields: {
          spdNumber: "$SpdValues.DATASTREAMS.deviceNumber",
          spdValue: "$SpdValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          spdNumber: 1,
          spdValue: 1,
          spdSensorsThreshold: 1,
        },
      },
    ]);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getAllSiteSpd =>", error.message);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================= GET ALL Phase/Vmr Site and Device Data ================================== //
exports.getAllSiteVmr = async (req, res, next) => {
  try {
    // let resp = await Device.find().populate('siteId')
    let resp = await Device.aggregate([
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          // pipeline: [
          //   { "$project": { "siteName" : 1, "uid": 1 }}
          // ],
          as: "siteId",
        },
      },
      {
        $unwind: "$VmrValues.DATASTREAMS",
      },
      {
        $addFields: {
          vmrNumber: "$VmrValues.DATASTREAMS.deviceNumber",
          vmrValue: "$VmrValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          vmrNumber: 1,
          vmrValue: 1,
          vmrSensorsThreshold: 1,
        },
      },
    ]);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getAllSiteVmr =>", error.message);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

/* Geth the All the Site or Device or Sensor names */
exports.getSiteOrDeviceOrSensor = async (req, res) => {
  try {
    const { siteId, deviceId } = req.query;
    let data;

    if (!siteId && !deviceId) {
      data = await Site.find({}).select("siteName uid");
    } else if (siteId && !deviceId) {
      data = await Device.find({ siteId }).select("deviceName");
    } else if (siteId && deviceId) {
      data = await Alarm.aggregate([
        {
          $match: {
            deviceId: ObjectId(deviceId),
          },
        },
        {
          $project: {
            firstWord: {
              $regexFind: {
                input: "$SensorName",
                regex: /^[a-zA-Z]+/,
              },
            },
          },
        },
        {
          $group: {
            _id: "$firstWord.match",
          },
        },
      ]);
    }

    return res.status(200).json({ data, success: true });
  } catch (err) {
    console.log("Error is ", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};
