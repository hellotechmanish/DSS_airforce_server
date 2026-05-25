import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,

      ref: "User",
    },

    action: String,

    module: String,

    ipAddress: String,

    metadata: Object,
  },

  {
    timestamps: true,
  },
);

export default mongoose.model("AuditLog", auditLogSchema);
