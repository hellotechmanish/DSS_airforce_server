import mongoose, { Schema } from "mongoose";

const siteSchema = new Schema(
  {
    siteUid: {
      type: String,
      unique: true,
    },

    siteName: String,

    location: String,

    pincode: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,

      ref: "User",
    },
  },

  {
    timestamps: true,
  },
);

export default mongoose.model("Site", siteSchema);
