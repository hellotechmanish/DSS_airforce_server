import mongoose, { Schema, Document } from "mongoose";

export interface IDevice extends Document {
  nodeUid: string;

  deviceName: string;

  siteId: mongoose.Types.ObjectId;

  sensorCounts: {
    temperature: number;
    humidity: number;
    vmr: number;
    res: number;
    spd: number;
    ner: number;
  };

  thresholds: {
    vmr: {
      R?: number;
      Y?: number;
      B?: number;
    };

    res: number;

    spd: number;

    ner: number;
  };

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    nodeUid: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true,
    },

    deviceName: {
      type: String,
      required: true,
      trim: true,
    },

    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      index: true,
    },

    sensorCounts: {
      temperature: {
        type: Number,
        default: 0,
      },

      humidity: {
        type: Number,
        default: 0,
      },

      vmr: {
        type: Number,
        default: 0,
      },

      res: {
        type: Number,
        default: 0,
      },

      spd: {
        type: Number,
        default: 0,
      },

      ner: {
        type: Number,
        default: 0,
      },
    },

    thresholds: {
      vmr: {
        R: Number,
        Y: Number,
        B: Number,
      },

      res: {
        type: Number,
        default: 0,
      },

      spd: {
        type: Number,
        default: 0,
      },

      ner: {
        type: Number,
        default: 0,
      },
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

const Device = mongoose.model<IDevice>("Device", deviceSchema);

export default Device;
