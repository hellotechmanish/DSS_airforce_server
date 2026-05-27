import mongoose, { Schema } from "mongoose";

const alarmSchema = new Schema(
  {
    deviceId: {
      type: Schema.Types.ObjectId,

      ref: "Device",
    },

    siteId: {
      type: Schema.Types.ObjectId,

      ref: "Site",
    },

    type: String,

    message: String,

    SensorName: String,

    thresholdValue: Number,

    alarmValue: Number,

    severity: {
      type: String,

      enum: ["low", "medium", "high", "critical"],
    },

    status: {
      type: String,

      enum: ["active", "resolved"],

      default: "active",
    },
  },

  {
    timestamps: true,
  },
);

export default mongoose.model("Alarm", alarmSchema);
