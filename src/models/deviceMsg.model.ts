import mongoose, { Schema, Document } from "mongoose";

interface IDataStream {
  deviceNumber: string;
  value: number;
}

export interface IDeviceMsg extends Document {
  deviceId: mongoose.Types.ObjectId;

  sensorName: string;

  dataStreams: IDataStream[];

  timestamp: Date;

  createdAt: Date;

  updatedAt: Date;
}

const deviceMsgSchema = new Schema<IDeviceMsg>(
  {
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    sensorName: {
      type: String,
      required: true,
      index: true,
    },

    dataStreams: [
      {
        sensorNumber: {
          type: String,
          required: true,
        },

        value: {
          type: Number,
          required: true,
        },
      },
    ],

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

deviceMsgSchema.index({
  deviceId: 1,
  timestamp: -1,
});

deviceMsgSchema.index({
  sensorName: 1,
  timestamp: -1,
});

const DeviceMsg = mongoose.model<IDeviceMsg>("DeviceMsg", deviceMsgSchema);

export default DeviceMsg;
