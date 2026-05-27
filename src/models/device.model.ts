import mongoose, {
  Schema,
  Document,
} from "mongoose";

export interface IDevice
  extends Document {
  nodeUid: string;

  deviceName: string;

  siteId: mongoose.Types.ObjectId;

  vmrSensors: number;

  resSensors: number;

  spdSensors: number;

  nerSensors: number;

  vmrSensorsThreshold: any;

  resSensorsThreshold: number;

  spdSensorsThreshold: number;

  nerSensorsThreshold: number;

  threshold: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const deviceSchema =
  new Schema<IDevice>(
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

      vmrSensors: {
        type: Number,

        default: 0,
      },

      resSensors: {
        type: Number,

        default: 0,
      },

      spdSensors: {
        type: Number,

        default: 0,
      },

      nerSensors: {
        type: Number,

        default: 0,
      },

      vmrSensorsThreshold: {
        type: Schema.Types.Mixed,

        default: {},
      },

      resSensorsThreshold: {
        type: Number,

        default: 0,
      },

      spdSensorsThreshold: {
        type: Number,

        default: 0,
      },

      nerSensorsThreshold: {
        type: Number,

        default: 0,
      },

      threshold: {
        type: Number,

        default: 0,
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

const Device =
  mongoose.model<IDevice>(
    "Device",
    deviceSchema,
  );

export default Device;