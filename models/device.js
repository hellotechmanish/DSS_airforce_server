const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema(
  {
    siteId: { type: mongoose.Types.ObjectId, required: true, ref: "Site" },
    deviceName: { type: String, required: true },
    userId: { type: mongoose.Types.ObjectId, required: false, ref: "User" },
    nodeUid: { type: String, required: true, default: null }, // Device NodeID
    temp: { type: Number, required: true, default: 0 },
    humidity: { type: Number, required: true, default: 0 },
    vmrSensors: { type: Number, required: false, default: 0 }, // Number of Phase Sensor voltage manage
    resSensors: { type: Number, required: false, default: 0 }, // Number of Resistance Sensor
    spdSensors: { type: Number, required: false, default: 0 }, // Number of SPD Sensor for hight voltage
    nerSensors: { type: Number, required: false, default: 0 }, // Number of GN Sensor for ground and nutral voltage

    vmrSensorsThreshold: { type: Object, required: false, default: 0 }, // Phase Threshold  {r: 2, y: 2, b: 2, ry:2, yb:3, rb:4}
    resSensorsThreshold: { type: Number, required: false, default: 0 }, // Resistance Threshold
    spdSensorsThreshold: { type: Number, required: false, default: 0 }, // SPD Threshold
    nerSensorsThreshold: { type: Number, required: false, default: 0 }, // GN Threshold

    ResValues: Object, // to show latest values on the card table
    NerValues: Object,
    SpdValues: Object,
    VmrValues: Object,
    HumValues: Object,
    TempValues: Object,
  },
  {
    timestamps: true,
  },
);

const Device = mongoose.model("Device", DeviceSchema);

module.exports = Device;
