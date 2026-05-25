import mongoose, {
  Schema,
} from "mongoose";

const notificationSchema =
  new Schema(
    {
      userId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",
      },

      title: String,

      message: String,

      isRead: {
        type: Boolean,
        default: false,
      },
    },

    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Notification",
  notificationSchema
);