import Joi from "joi";

// ================= COMMON TYPES =================

const dateFormat = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const id = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

// ================= PAGINATION =================

const page = {
  page: Joi.number().min(1).required(),
  limit: Joi.number().min(1).required(),
};

// ================= START / END DATE =================

const seDate = {
  startDate: dateFormat.required(),
  endDate: dateFormat.required(),
};

// ================= GET ALARM GRAPH VALUE =================

const getAlarmGraphValueSchema = Joi.object({
  ...seDate,
  deviceId: Joi.required(),
  sensorName: Joi.string().required(),
});

// ================= GET ALL ALARM =================

const getAllAlarmSchema = Joi.object({
  deviceId: id.allow(null, ""),
  startDate: dateFormat.required(),
  endDate: dateFormat.required(),
  sensorName: Joi.string().allow(null),
  search: Joi.string().allow(null),
  sortBy: Joi.string().required(),
  sortType: Joi.number().valid(1, -1).required(),
  ...page,
});

// ================= DOWNLOAD ALARM DATA =================

const getAllAlarmDataForDownloadSchema = Joi.object({
  deviceId: Joi.array().items(id).required(),
  startDate: dateFormat.required(),
  endDate: dateFormat.required(),
  sensorName: Joi.string().allow(null),
});

// ================= SITE / DEVICE / SENSOR =================

const getSiteOrDeviceOrSensorSchema = Joi.object({
  deviceId: id.allow(null),
  siteId: id.allow(null),
});

// ================= EXPORT =================

export default {
  getAlarmGraphValueSchema,
  getAllAlarmSchema,
  getAllAlarmDataForDownloadSchema,
  getSiteOrDeviceOrSensorSchema,
};
