import mongoose, {
  Schema,
} from "mongoose";

const assignmentSchema =
  new Schema(
    {
      userId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",
      },

      siteId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Site",
      },

      deviceIds: [
        {
          type:
            Schema.Types
              .ObjectId,

          ref: "Device",
        },
      ],
    },

    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Assignment",
  assignmentSchema
);