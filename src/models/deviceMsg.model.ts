import mongoose, {
  Schema,
  Document,
} from "mongoose";

export interface IDeviceMsg
  extends Document {
  deviceId: mongoose.Types.ObjectId;

  msg: any;

  date: Date;

  time: string;

  dateAndTime: string;

  temperature?: number;

  humidity?: number;

  voltage?: number;

  current?: number;

  resistance?: number;

  timestamp: Date;

  createdAt: Date;

  updatedAt: Date;
}

const deviceMsgSchema =
  new Schema<IDeviceMsg>(
    {
      deviceId: {
        type: Schema.Types.ObjectId,
        ref: "Device",
        required: true,
        index: true,
      },

      msg: {
        type: Schema.Types.Mixed,
        required: true,
      },

      date: {
        type: Date,
        required: true,
        index: true,
      },

      time: {
        type: String,
      },

      dateAndTime: {
        type: String,
      },

      temperature: {
        type: Number,
      },

      humidity: {
        type: Number,
      },

      voltage: {
        type: Number,
      },

      current: {
        type: Number,
      },

      resistance: {
        type: Number,
      },

      timestamp: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },

    {
      timestamps: true,
    },
  );

/* Compound Index */
deviceMsgSchema.index({
  deviceId: 1,
  timestamp: -1,
});

const DeviceMsg =
  mongoose.model<IDeviceMsg>(
    "DeviceMsg",
    deviceMsgSchema,
  );

export default DeviceMsg;