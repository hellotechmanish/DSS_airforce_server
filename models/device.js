const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Site",
      index: true,
    },

    deviceName: {
      type: String,
      required: true,
      trim: true,
    },

    //  keep for now (will remove later)
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },

    nodeUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    //  NEW (future ready - no break)
    temp: { type: Number, default: 0 },
    humidity: { type: Number, default: 0 },

    vmrSensors: { type: Number, default: 0 },
    resSensors: { type: Number, default: 0 },
    spdSensors: { type: Number, default: 0 },
    nerSensors: { type: Number, default: 0 },

    vmrSensorsThreshold: { type: Object, default: {} },
    resSensorsThreshold: { type: Number, default: 0 },
    spdSensorsThreshold: { type: Number, default: 0 },
    nerSensorsThreshold: { type: Number, default: 0 },

    ResValues: Object,
    NerValues: Object,
    SpdValues: Object,
    VmrValues: Object,
    HumValues: Object,
    TempValues: Object,

    //  NEW (future ready - no break)
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// indexes
DeviceSchema.index({ siteId: 1 });
DeviceSchema.index({ nodeUid: 1 });

const Device = mongoose.model("Device", DeviceSchema);

module.exports = Device;
