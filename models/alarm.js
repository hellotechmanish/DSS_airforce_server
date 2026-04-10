const mongoose = require("mongoose");

const AlarmSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    sensorType: {
      type: String,
      required: true,
      enum: ["temp", "humidity", "vmr", "res", "spd", "ner"],
    },

    thresholdValue: {
      type: Number,
      required: true,
    },

    actualValue: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // keep lightweight
  }
);

// indexes for fast queries
AlarmSchema.index({ deviceId: 1, status: 1 });
AlarmSchema.index({ createdAt: -1 });

const Alarm = mongoose.model("Alarm", AlarmSchema);

module.exports = Alarm;