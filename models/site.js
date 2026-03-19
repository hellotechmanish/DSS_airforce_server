const mongoose = require("mongoose");

const SiteSchema = new mongoose.Schema(
  {
    userId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    siteName: {
      type: String,
      required: true,
      trim: true,
    },
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
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
  },
  {
    timestamps: true,
  },
);

const Site = mongoose.model("Site", SiteSchema);

module.exports = Site;
