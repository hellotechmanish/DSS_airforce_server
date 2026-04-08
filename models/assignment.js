const AssignmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: "User" },
    siteId: { type: mongoose.Types.ObjectId, ref: "Site" },
    deviceIds: [{ type: mongoose.Types.ObjectId, ref: "Device" }],
    assignedBy: { type: mongoose.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const Assignment = mongoose.model("Assignment", AssignmentSchema);

module.exports = Assignment;
