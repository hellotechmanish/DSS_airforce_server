import mongoose, { Schema, Document } from "mongoose";

export interface ISite extends Document {
  siteUid: string;
  siteName: string;
  location?: string;
  pincode?: string;
  state?: string;
  country?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ISite>(
  {
    siteUid: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true,
    },

    siteName: {
      type: String,
      required: true,
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

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  {
    timestamps: true,
  },
);

export default mongoose.model<ISite>("Site", siteSchema);
