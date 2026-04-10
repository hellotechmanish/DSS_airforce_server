const mongoose = require("mongoose");

const DeviceMsgSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    // Structured data (NO raw Object)
    data: {
      temp: Number,
      humidity: Number,
      vmr: {
        r: Number,
        y: Number,
        b: Number,
        ry: Number,
        yb: Number,
        rb: Number,
      },
      res: Number,
      spd: Number,
      ner: Number,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Optional (for device sync control)
    lastSavedTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false, //  disable extra createdAt/updatedAt (save space)
  },
);

//  CRITICAL INDEX (for fast queries)
DeviceMsgSchema.index({ deviceId: 1, timestamp: -1 });

//  OPTIONAL TTL (auto delete old data)
DeviceMsgSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 60 * 60 }, // 3600 seconds = 1 hour (adjust as needed)
);

const DeviceMsg = mongoose.model("DeviceMsg", DeviceMsgSchema);

module.exports = DeviceMsg;
