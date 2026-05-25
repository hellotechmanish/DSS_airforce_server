import mongoose, { Schema } from "mongoose";

const deviceSchema = new Schema(
  {
    deviceId: {
      type: String,
      unique: true,
    },

    deviceName: String,

    siteId: {
      type: Schema.Types.ObjectId,

      ref: "Site",
    },

    threshold: Number,

    isActive: {
      type: Boolean,
      default: true,
    },
  },

  {
    timestamps: true,
  },
);

export default mongoose.model("Device", deviceSchema);
