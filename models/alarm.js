const mongoose = require("mongoose");

const AlarmSchema = new mongoose.Schema(
  {
    deviceId: { type: mongoose.Types.ObjectId, required: false, ref: "Device" },
    SensorName: { type: Object, required: true },
    thresholdValue: { type: String, required: true },
    alarmValue: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

const Alarm = mongoose.model("Alarm", AlarmSchema);

module.exports = Alarm;
