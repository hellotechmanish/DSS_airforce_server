import mongoose, {
  Schema,
} from "mongoose";

const deviceMsgSchema =
  new Schema(
    {
      deviceId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Device",

        index: true,
      },

      temperature: Number,

      humidity: Number,

      voltage: Number,

      current: Number,

      resistance: Number,

      timestamp: {
        type: Date,

        default: Date.now,

        index: true,
      },
    },

    {
      timestamps: true,
    }
  );

deviceMsgSchema.index({
  deviceId: 1,

  timestamp: -1,
});

export default mongoose.model(
  "DeviceMsg",
  deviceMsgSchema
);
