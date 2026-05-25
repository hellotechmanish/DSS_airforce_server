import mongoose, { Schema } from "mongoose";

const deviceStateSchema = new Schema(
  {
    deviceId: {
      type: Schema.Types.ObjectId,

      ref: "Device",

      unique: true,
    },

    temperature: Number,

    humidity: Number,

    resistance: Number,

    lastSeen: Date,

    status: {
      type: String,

      enum: ["online", "offline"],

      default: "offline",
    },
  },

  {
    timestamps: true,
  },
);

export default mongoose.model("DeviceState", deviceStateSchema);
