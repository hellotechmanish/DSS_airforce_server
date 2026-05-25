import mongoose from "mongoose";
import Site from "../models/site.model.js";
import Device from "../models/device.model.js";
import Alarm from "../models/alarm.model.js";

interface UserType {
  _id: mongoose.Types.ObjectId;
  id?: string;
  role?: string;
}

/* =========================== Create Site ======================== */
export const createSite = async (payload: any, user: UserType) => {
  const { siteName, siteId, location, pincode, country, state } = payload;

  const existingSite = await Site.findOne({ siteId }).lean();

  if (existingSite) {
    throw new Error("Site UID already exists");
  }

  const site = await Site.create({
    siteName,
    siteId,
    location,
    pincode,
    country,
    state,
    createdBy: user._id,
  });

  return {
    success: true,
    message: "Site created successfully",
    data: site,
  };
};

/* =========================== Edit Site ======================== */
export const editSite = async (payload: any) => {
  const { siteId, siteName, uid, location, pincode, country, state } = payload;

  const site = await Site.findByIdAndUpdate(
    siteId,
    {
      siteName,
      uid,
      location,
      pincode,
      country,
      state,
    },
    { new: true },
  );

  return {
    success: true,
    message: "Site edited successfully",
    data: site,
  };
};

/* =========================== Delete Site ======================== */
export const deleteSite = async (payload: any) => {
  const { siteId } = payload;

  const site = await Site.findByIdAndDelete(siteId);

  await Device.deleteMany({ siteId });

  return {
    success: true,
    message: "Site deleted successfully",
    data: site,
  };
};

/* ======================== Delete Site from user Profile =========================== */
export const deleteSiteFromUser = async (payload: any) => {
  const { userId, siteId } = payload;

  const resp = await Site.findByIdAndUpdate(siteId, {
    $pullAll: {
      userId: [userId],
    },
  });

  return {
    success: true,
    message: "Site deleted from user Profile",
    data: resp,
  };
};

/* =========================== Number of Site ============================= */
export const numberOfSite = async (query: any, user: UserType) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  const skip = (page - 1) * limit;

  let siteFilter: any = {};

  if (user.role === "admin" || user.role === "technician") {
    siteFilter = {};
  } else if (user.role === "user") {
    siteFilter = {
      userId: new mongoose.Types.ObjectId(user.id),
    };
  }

  const total = await Site.countDocuments(siteFilter);

  const sites = await Site.find(siteFilter).skip(skip).limit(limit).lean();

  const siteIds = sites.map((site: any) => site._id);

  let deviceMatch: any = {
    siteId: { $in: siteIds },
  };

  if (user.role === "user") {
    deviceMatch.userId = new mongoose.Types.ObjectId(user.id);
  }

  const deviceCounts = await Device.aggregate([
    {
      $match: deviceMatch,
    },
    {
      $group: {
        _id: "$siteId",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap: Record<string, number> = {};

  deviceCounts.forEach((item: any) => {
    countMap[item._id.toString()] = item.count;
  });

  const updatedSites = sites.map((site: any) => ({
    ...site,
    deviceCount: countMap[site._id.toString()] || 0,
  }));

  return {
    success: true,
    message: "Sites fetched successfully",
    data: updatedSites,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/* ============================= Get site By UserId =============================== */
export const getSiteByUserId = async (userId: string) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);

  const resp: any[] = await Site.find({
    userId: objectUserId,
  }).lean();

  for (const item of resp) {
    item.deviceCount = await Device.countDocuments({
      siteId: item._id,
    });

    item.userDeviceCount = await Device.countDocuments({
      siteId: item._id,
      userId: objectUserId,
    });
  }

  return {
    success: true,
    data: resp,
  };
};

/* ============================== check Site UID exists or not ============================== */
export const checkSiteUid = async (payload: any) => {
  const { siteId } = payload;

  const resp = await Site.findOne({ siteId });

  return {
    success: true,
    message: resp ? "This Site ID is not available" : "This Site ID is available",
    status: !resp,
  };
};

/* ============================= Search site by siteId or Sitename ================================== */
export const searchSite = async (searchQuery: string, user: UserType) => {
  let sites;

  if (user.role === "user") {
    sites = await Site.find({
      userId: { $in: [user._id] },
      $or: [
        {
          siteId: {
            $regex: searchQuery,
            $options: "i",
          },
        },
        {
          siteName: {
            $regex: searchQuery,
            $options: "i",
          },
        },
      ],
    }).lean();
  } else {
    sites = await Site.find({
      $or: [
        {
          uid: {
            $regex: searchQuery,
            $options: "i",
          },
        },
        {
          siteName: {
            $regex: searchQuery,
            $options: "i",
          },
        },
      ],
    });
  }

  return {
    success: true,
    data: sites,
  };
};

/* ============================= GET ALL Resistance Site and Device Data ================================== */
export const getAllSiteResistance = async (query: any, user: UserType) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const search = query.search || "";

  const skip = (page - 1) * limit;

  const matchStage: any = {};

  if (user.role === "user") {
    matchStage.userId = new mongoose.Types.ObjectId(user.id);
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
    {
      $match: {
        $or: [
          {
            deviceName: {
              $regex: search,
              $options: "i",
            },
          },
          {
            nodeUid: {
              $regex: search,
              $options: "i",
            },
          },
          {
            "site.siteName": {
              $regex: search,
              $options: "i",
            },
          },
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
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ];

  const result = await Device.aggregate(pipeline);

  return {
    success: true,
    data: result[0]?.data || [],
    pagination: {
      total: result[0]?.totalCount[0]?.count || 0,
      page,
      limit,
    },
  };
};

/* ============================= GET ALL Site / Device / Sensor ================================== */
export const getSiteOrDeviceOrSensor = async (query: any) => {
  const { siteId, deviceId } = query;

  let data;

  if (!siteId && !deviceId) {
    data = await Site.find({}).select("siteName uid");
  } else if (siteId && !deviceId) {
    data = await Device.find({ siteId }).select("deviceName");
  } else if (siteId && deviceId) {
    data = await Alarm.aggregate([
      {
        $match: {
          deviceId: new mongoose.Types.ObjectId(deviceId),
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

  return {
    success: true,
    data,
  };
};
