const Device = require("../models/device");
const moment = require("moment");
const DeviceMsg = require("../models/deviceMsg");
const mqtt = require("mqtt");
const path = require("path");
const csvWriter = require("csv-writer");
const Alarm = require("../models/alarm");
const fs = require("fs");
const User = require("../models/user");
var ObjectId = require("mongodb").ObjectId;
const { exec } = require("child_process");
const mongoose = require("mongoose");
require("dotenv").config();

// Access the SAVE_INTERVAL_MINUTES variable
const SAVE_INTERVAL_MINUTES =
  parseFloat(process.env.SAVE_INTERVAL_MINUTES) || 0.1;

console.log(`Save Interval Minutes: ${SAVE_INTERVAL_MINUTES}`);

// ======================================= testing ============================================= //

// const client = mqtt.connect("mqtt://10.5.50.47"); //--> to connect to broker
const client = mqtt.connect("mqtt://127.0.0.1:1883"); //--> to connect to broker

client.on("connect", function () {
  console.log("// == MQTT connected == //");
  client.subscribe("b25saW5lcmVzbW9uaXRvcg==", function (err) {
    if (!err) {
      client.publish("presence", "Hello mqtt");
    }
  });
});

// getChannels;
let DataObject = {};

// DataObject Example
// {
//   '1401': {
//     RES: { DEVICE_TYPE: 'RES', DATASTREAMS: [Array] },
//     NER: { DEVICE_TYPE: 'NER', DATASTREAMS: [] },
//     SPD: { DEVICE_TYPE: 'SPD', DATASTREAMS: [] },
//     VMR: { DEVICE_TYPE: 'VMR', DATASTREAMS: [] }
//   },
//   '1402': {
//     RES: { DEVICE_TYPE: 'RES', DATASTREAMS: [Array] },
//     NER: { DEVICE_TYPE: 'NER', DATASTREAMS: [] },
//     SPD: { DEVICE_TYPE: 'SPD', DATASTREAMS: [] },
//     VMR: { DEVICE_TYPE: 'VMR', DATASTREAMS: [] }
//   }
// }

let temp = 0; // Temperature of device
let hum = 0; // Humidity of device

let RESMsg = {
  DEVICE_TYPE: "RES",
  DATASTREAMS: [],
};
let NERMsg = {
  DEVICE_TYPE: "NER",
  DATASTREAMS: [],
};
let SPDMsg = {
  DEVICE_TYPE: "SPD",
  DATASTREAMS: [],
};
let VMRMsg = {
  DEVICE_TYPE: "VMR",
  DATASTREAMS: [],
};
let TEMPMsg = {
  DEVICE_TYPE: "TEMP",
  DATASTREAMS: [],
};
let HUMMsg = {
  DEVICE_TYPE: "HUM",
  DATASTREAMS: [],
};

let initialstart = {}; // { '1401': true, '1402': true }
let spdValue = {};

client.on("message", async function (topic, message) {
  console.log("Topic ====>", topic);

  let parsedData,
    nodeId,
    DeviceExists = null;

  //  Parse once
  let raw;
  try {
    raw = JSON.parse(message.toString());
    nodeId = raw.Node_Id;
    console.log("NodeId =>", nodeId);

    DeviceExists = await Device.findOne({ nodeUid: nodeId });
  } catch (error) {
    console.log("Parse / Device error =>", error.message);
    return;
  }

  if (!DeviceExists) return;

  console.log(" Device Found");

  //  Decode base64
  try {
    parsedData = JSON.parse(Buffer.from(raw.data, "base64").toString("utf8"));
  } catch (e) {
    console.log("Decode error =>", e.message);
    return;
  }

  console.log("Decoded Data =>", parsedData);

  // ================= INITIAL START =================
  if (parsedData.initialStart) {
    initialstart[nodeId] = true;
  }

  if (!initialstart[nodeId]) return;

  // ================= INIT OBJECT =================
  if (!DataObject[nodeId]) {
    DataObject[nodeId] = {
      RES: { ...RESMsg, DATASTREAMS: [] },
      NER: { ...NERMsg, DATASTREAMS: [] },
      SPD: { ...SPDMsg, DATASTREAMS: [] },
      VMR: { ...VMRMsg, DATASTREAMS: [] },
      TEMP: { ...TEMPMsg, DATASTREAMS: [] },
      HUM: { ...HUMMsg, DATASTREAMS: [] },
    };
  }

  // ================= TEMP + HUM =================
  if (parsedData.Temp) temp = parsedData.Temp;
  if (parsedData.Hum) hum = parsedData.Hum;

  // ================= KEY SAFE =================
  const keys = Object.keys(parsedData).filter(
    (k) => !["start", "end", "initialStart", "alarm"].includes(k),
  );

  const key = keys[0];
  const type = key?.split("_")[0];

  // ================= COMMON PUSH =================
  const pushData = (type, value, deviceKey = key) => {
    // 🔥 SAFETY CHECK (main fix)
    if (!DataObject[nodeId]) {
      DataObject[nodeId] = {};
    }

    if (!DataObject[nodeId][type]) {
      DataObject[nodeId][type] = {
        DEVICE_TYPE: type,
        DATASTREAMS: [],
      };
    }

    DataObject[nodeId][type].DATASTREAMS.push({
      deviceNumber: deviceKey,
      value,
    });
  };

  // ================= RES =================
  if (
    type === "RES" &&
    DataObject[nodeId]?.RES?.DATASTREAMS &&
    DataObject[nodeId].RES.DATASTREAMS.length + 1 <= DeviceExists.resSensors
  ) {
    pushData("RES", parsedData[key].toFixed(2));
  }

  // ================= NER =================
  if (
    type === "NER" &&
    DataObject[nodeId]?.NER?.DATASTREAMS &&
    DataObject[nodeId].NER.DATASTREAMS.length + 1 <= DeviceExists.nerSensors
  ) {
    pushData("NER", parsedData[key].toFixed(2));
  }

  // ================= SPD =================
  if (
    type === "SPD" &&
    DataObject[nodeId]?.SPD?.DATASTREAMS &&
    DataObject[nodeId].SPD.DATASTREAMS.length + 1 <= DeviceExists.spdSensors
  ) {
    let latestSurge = await DeviceMsg.find({
      deviceId: DeviceExists._id,
      "msg.DEVICE_TYPE": "SPD",
    })
      .sort({ _id: -1 })
      .limit(1)
      .lean();

    // let value = parsedData[key] / 100;
    let value = parsedData[key];

    if (latestSurge.length > 0) {
      const oldValue =
        latestSurge[0].msg.DATASTREAMS.find((i) => i.deviceNumber === key)
          ?.value || 0;

      if (oldValue === value) {
        pushData("SPD", 0);
      } else if (spdValue[nodeId] === value) {
        pushData("SPD", 0);
      } else {
        spdValue[nodeId] = value;
        pushData("SPD", value);
      }
    } else {
      pushData("SPD", value);
    }
  }

  // ================= TEMP =================
  if (parsedData.Temp) {
    pushData("TEMP", parsedData.Temp.toFixed(2), "Temp");
  }

  // ================= HUM =================
  if (parsedData.Hum) {
    pushData("HUM", parsedData.Hum.toFixed(2), "Hum");
  }

  // ================= VMR =================
  if (
    type === "VMR" &&
    DataObject[nodeId]?.VMR?.DATASTREAMS &&
    DataObject[nodeId].VMR.DATASTREAMS.length + 1 <= DeviceExists.vmrSensors
  ) {
    delete parsedData.start;
    delete parsedData.alarm;

    const values = Object.values(parsedData);

    const arr = [
      { phaseNumber: "r", value: values[0] / 100 },
      { phaseNumber: "y", value: values[1] / 100 },
      { phaseNumber: "b", value: values[2] / 100 },
      { phaseNumber: "ry", value: values[3] / 100 },
      { phaseNumber: "yb", value: values[4] / 100 },
      { phaseNumber: "rb", value: values[5] / 100 },
    ];

    pushData("VMR", arr, key.split("_")[1]);
  }

  // ================= END =================
  if (parsedData.end && DataObject[nodeId]) {
    try {
      await Promise.all([
        saveLatestData(
          DataObject[nodeId].RES,
          DeviceExists._id,
          "ResValues",
          temp,
          hum,
        ),
        saveLatestData(
          DataObject[nodeId].NER,
          DeviceExists._id,
          "NerValues",
          temp,
          hum,
        ),
        saveLatestData(
          DataObject[nodeId].SPD,
          DeviceExists._id,
          "SpdValues",
          temp,
          hum,
        ),
        saveLatestData(
          DataObject[nodeId].VMR,
          DeviceExists._id,
          "VmrValues",
          temp,
          hum,
        ),
        saveLatestData(
          DataObject[nodeId].HUM,
          DeviceExists._id,
          "HumValues",
          temp,
          hum,
        ),
        saveLatestData(
          DataObject[nodeId].TEMP,
          DeviceExists._id,
          "TempValues",
          temp,
          hum,
        ),
      ]);

      await Promise.all([
        compareThresholdValue(
          DataObject[nodeId].RES,
          DeviceExists._id,
          "ResValues",
          DeviceExists,
        ),
        compareThresholdValue(
          DataObject[nodeId].NER,
          DeviceExists._id,
          "NerValues",
          DeviceExists,
        ),
        compareThresholdValue(
          DataObject[nodeId].SPD,
          DeviceExists._id,
          "SpdValues",
          DeviceExists,
        ),
        compareThresholdValue(
          DataObject[nodeId].VMR,
          DeviceExists._id,
          "VmrValues",
          DeviceExists,
        ),
      ]);

      console.log("✅ Data saved + threshold checked");
    } catch (err) {
      console.log("DB error =>", err.message);
    }

    delete DataObject[nodeId];
    delete initialstart[nodeId];
  }
});

//=============================== Save Data to DB ============================= //

// const lastExecutionTimes = new Map();

// async function saveLatestData(structuredMsg, deviceId, parameterValue) {
//   console.log("\n==== saveLatestData STARTED ====");
//   console.log("Input:", {
//     deviceId,
//     parameterValue,
//     structuredMsg: structuredMsg.DEVICE_TYPE,
//   });

//   const now = Date.now();
//   console.log("now",now);
//   const fifteenMinutesInMs = 15 * 60 * 1000;

//   // Initialize device entry if not exists
//   if (!lastExecutionTimes.has(deviceId)) {
//     console.log(`First time for device ${deviceId} - initializing`);
//     lastExecutionTimes.set(deviceId, { lastSavedTime: 0 });
//   }
//   console.log("checking id avaible or not",lastExecutionTimes.get(deviceId),lastExecutionTimes.has(deviceId));
//   const deviceTimers = lastExecutionTimes.get(deviceId);

//   // Validate and get the actual data arrival time
//   let dataArrivalTime = structuredMsg.timestamp
//     ? new Date(structuredMsg.timestamp).getTime()
//     : null;

//   if (!dataArrivalTime || isNaN(dataArrivalTime)) {
//     console.log(`Invalid or missing timestamp for ${structuredMsg.DEVICE_TYPE}. Using last saved time.`);
//     dataArrivalTime = deviceTimers.lastSavedTime || now; // Fallback to now only if no previous timestamp exists
//   }

//   console.log(`Data arrival time: ${dataArrivalTime} (${new Date(dataArrivalTime).toISOString()})`);

//   const timeDiff = dataArrivalTime - deviceTimers.lastSavedTime;

//   console.log(
//     `[${structuredMsg.DEVICE_TYPE}] Time diff: ${Math.floor(timeDiff / 1000)}s ` +
//       `(need ${fifteenMinutesInMs / 1000}s)`
//   );

//   // Check if we should save
//   if (timeDiff >= fifteenMinutesInMs) {
//     console.log(`[${structuredMsg.DEVICE_TYPE}] SAVING DATA (${Math.floor(timeDiff / 1000)}s since last save)`);

//     try {
//       // Create and save new message
//       const msg = new DeviceMsg({
//         deviceId: deviceId,
//         msg: structuredMsg,
//         date: moment().format("YYYY-MM-DD"),
//         time: moment().format("HH:mm:ss"),
//         dateAndTime: moment().format(),
//       });

//       await msg.save();
//       console.log(`[${structuredMsg.DEVICE_TYPE}] DeviceMsg saved successfully`);

//       // Update device state
//       const updateData = {
//         [parameterValue]: structuredMsg,
//         temp,
//         humidity: hum,
//       };

//       await Device.findByIdAndUpdate(deviceId, updateData);
//       console.log(`[${structuredMsg.DEVICE_TYPE}] Device state updated`);

//       // Update last execution time with actual data arrival time
//       deviceTimers.lastSavedTime = dataArrivalTime;
//       lastExecutionTimes.set(deviceId, deviceTimers);
//       console.log(`[${structuredMsg.DEVICE_TYPE}] Updated timestamp to ${dataArrivalTime}`);

//       return true;
//     } catch (error) {
//       console.error(`[${structuredMsg.DEVICE_TYPE}] SAVE ERROR:`, error.message);
//       return false;
//     }
//   }

//   console.log(`[${structuredMsg.DEVICE_TYPE}] SKIPPING save: ${Math.floor(timeDiff / 1000)}s < ${fifteenMinutesInMs / 1000}s`);
//   return false;
// }
//skp data using counter

// Map to track the count for each nodeId and sensor
// Map to track the count for each nodeId and sensor
// const saveCounters = new Map();

// async function saveLatestData(structuredMsg, deviceId, parameterValue) {
//   console.log("\n==== saveLatestDataWithCountLimit STARTED ====");
//   console.log("Input:", {
//     deviceId,
//     parameterValue,
//     structuredMsg: structuredMsg.DEVICE_TYPE,
//   });

//   const skipLimit = 2; // Define the number of cycles to skip before saving

//   // Initialize the counter for the deviceId and sensor if not exists
//   if (!saveCounters.has(deviceId)) {
//     saveCounters.set(deviceId, {});
//   }

//   const deviceCounters = saveCounters.get(deviceId);

//   if (!deviceCounters[parameterValue]) {
//     deviceCounters[parameterValue] = 0; // Initialize the counter for the sensor
//   }

//   // Increment the counter for the sensor
//   deviceCounters[parameterValue]++;

//   console.log(`[${structuredMsg.DEVICE_TYPE}] Current count: ${deviceCounters[parameterValue]} (Limit: ${skipLimit})`);

//   // Check if the counter has reached the skip limit
//   if (deviceCounters[parameterValue] <= skipLimit) {
//     console.log(`[${structuredMsg.DEVICE_TYPE}] SKIPPING save: Count is below limit`);
//     return false; // Skip saving
//   }

//   // Reset the counter after saving
//   deviceCounters[parameterValue] = 0;

//   try {
//     // Create and save new message
//     const msg = new DeviceMsg({
//       deviceId: deviceId,
//       msg: structuredMsg,
//       date: moment().format("YYYY-MM-DD"),
//       time: moment().format("HH:mm:ss"),
//       dateAndTime: moment().format(),
//     });

//     await msg.save();
//     console.log(`[${structuredMsg.DEVICE_TYPE}] DeviceMsg saved successfully`);

//     // Update device state
//     const updateData = {
//       [parameterValue]: structuredMsg,
//       temp,
//       humidity: hum,
//     };

//     await Device.findByIdAndUpdate(deviceId, updateData);
//     console.log(`[${structuredMsg.DEVICE_TYPE}] Device state updated`);

//     return true;
//   } catch (error) {
//     console.error(`[${structuredMsg.DEVICE_TYPE}] SAVE ERROR:`, error.message);
//     return false;
//   }
// }
// Use a persistent storage for counters (in-memory for this example)
// Global persistent counter storage
// Global storage for last save times
global.lastSaveTimes = global.lastSaveTimes || new Map();

async function saveLatestData(structuredMsg, deviceId, parameterValue) {
  // const SAVE_INTERVAL_MINUTES = 0.1;
  const DEVICE_TYPE = structuredMsg.DEVICE_TYPE || "unknown";
  const now = new Date();

  // Standardize device ID
  const storageDeviceId = deviceId.toString();

  console.log(
    `\n[${DEVICE_TYPE}] Processing ${parameterValue} for device ${storageDeviceId} at ${now.toISOString()}`,
  );

  // Initialize last save time if not exists
  if (!global.lastSaveTimes.has(storageDeviceId)) {
    global.lastSaveTimes.set(storageDeviceId, new Map());
    console.log(
      `[${DEVICE_TYPE}] Initialized timers for device ${storageDeviceId}`,
    );
  }

  const deviceTimers = global.lastSaveTimes.get(storageDeviceId);

  // Get last save time or initialize to epoch
  const lastSave = deviceTimers.get(parameterValue) || new Date(0);
  const minutesSinceLastSave = (now - lastSave) / (1000 * 60);

  console.log(
    `[${DEVICE_TYPE}] Last saved ${Math.round(minutesSinceLastSave)} minutes ago`,
  );

  // Check if enough time has passed
  if (minutesSinceLastSave < SAVE_INTERVAL_MINUTES) {
    const minutesRemaining = Math.ceil(
      SAVE_INTERVAL_MINUTES - minutesSinceLastSave,
    );
    console.log(`[${DEVICE_TYPE}] Next save in ${minutesRemaining} minutes`);
    return { saved: false, nextSaveIn: minutesRemaining };
  }

  try {
    // Save the data
    const timestamp = moment();
    const msg = new DeviceMsg({
      deviceId: storageDeviceId,
      msg: structuredMsg,
      date: timestamp.format("YYYY-MM-DD"),
      time: timestamp.format("HH:mm:ss"),
      dateAndTime: timestamp.format(),
    });

    await msg.save();

    await Device.findByIdAndUpdate(
      storageDeviceId,
      {
        $set: {
          [parameterValue]: structuredMsg,
          lastUpdated: now,
        },
      },
      { new: true },
    );

    // Update last save time
    deviceTimers.set(parameterValue, now);
    console.log(
      `[${DEVICE_TYPE}] Data saved successfully at ${now.toISOString()}`,
    );

    return { saved: true };
  } catch (error) {
    console.error(`[${DEVICE_TYPE}] Save failed:`, error.message);
    return { saved: false, error: error.message };
  }
}
// end of skp program
// =============================== Compare latest data from DB ============================= //
async function compareThresholdValue(
  structuredMsg,
  deviceId,
  parameterValue,
  DeviceExists,
) {
  if (
    !DeviceExists.ResValues ||
    !DeviceExists.NerValues ||
    !DeviceExists.SpdValues ||
    !DeviceExists.VmrValues
  ) {
    return true;
  }

  if (
    parameterValue === "ResValues" &&
    DeviceExists.ResValues.DATASTREAMS.length > 0
  ) {
    try {
      for (let i = 0; i < new Array(DeviceExists.resSensors).length; i++) {
        if (
          DeviceExists.resSensorsThreshold <
            structuredMsg.DATASTREAMS[i].value &&
          DeviceExists.ResValues.DATASTREAMS[i].value <
            structuredMsg.DATASTREAMS[i].value
        ) {
          console.log("New value is greater than threshold");
          await Alarm.create({
            deviceId,
            SensorName: `R${i + 1}`,
            thresholdValue: DeviceExists.resSensorsThreshold,
            alarmValue: structuredMsg.DATASTREAMS[i].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value >=
              DeviceExists.resSensorsThreshold
                ? true
                : false,
          });
        }
      }
    } catch (error) {
      console.log("error from res threshold compare");
    }
  }

  if (
    parameterValue === "NerValues" &&
    DeviceExists.NerValues.DATASTREAMS.length > 0
  ) {
    try {
      for (let i = 0; i < new Array(DeviceExists.nerSensors).length; i++) {
        if (
          DeviceExists.nerSensorsThreshold <
            structuredMsg.DATASTREAMS[i].value &&
          DeviceExists.NerValues.DATASTREAMS[i].value <
            structuredMsg.DATASTREAMS[i].value
        ) {
          console.log("New value is greater than threshold");
          await Alarm.create({
            deviceId,
            SensorName: `GN${i + 1}`,
            thresholdValue: DeviceExists.nerSensorsThreshold,
            alarmValue: structuredMsg.DATASTREAMS[i].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value >=
              DeviceExists.nerSensorsThreshold
                ? true
                : false,
          });
        }
      }
    } catch (error) {
      console.log("error from ner threshold compare");
    }
  }

  if (
    parameterValue === "SpdValues" &&
    DeviceExists.SpdValues.DATASTREAMS.length > 0
  ) {
    try {
      for (let i = 0; i < new Array(DeviceExists.spdSensors).length; i++) {
        if (
          DeviceExists.spdSensorsThreshold <
            structuredMsg.DATASTREAMS[i].value &&
          DeviceExists.SpdValues.DATASTREAMS[i].value <
            structuredMsg.DATASTREAMS[i].value
        ) {
          console.log("New value is greater than threshold");
          await Alarm.create({
            deviceId,
            SensorName: `SPD${i + 1}`,
            thresholdValue: DeviceExists.spdSensorsThreshold,
            alarmValue: structuredMsg.DATASTREAMS[i].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value >=
              DeviceExists.spdSensorsThreshold
                ? true
                : false,
          });
        }
      }
    } catch (error) {
      console.log("error from spd threshold compare");
    }
  }

  if (
    parameterValue === "VmrValues" &&
    DeviceExists.VmrValues.DATASTREAMS.length > 0
  ) {
    try {
      for (let i = 0; i < new Array(DeviceExists.vmrSensors).length; i++) {
        if (
          DeviceExists.vmrSensorsThreshold.r <
            structuredMsg.DATASTREAMS[i].value[0].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[0].value <
            structuredMsg.DATASTREAMS[i].value[0].value
        ) {
          console.log("R phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , R`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.r,
            alarmValue: structuredMsg.DATASTREAMS[i].value[0].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[0].value >=
              DeviceExists.vmrSensorsThreshold.r
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.y <
            structuredMsg.DATASTREAMS[i].value[1].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[1].value <
            structuredMsg.DATASTREAMS[i].value[1].value
        ) {
          console.log("Y phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , Y`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.y,
            alarmValue: structuredMsg.DATASTREAMS[i].value[1].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[1].value >=
              DeviceExists.vmrSensorsThreshold.y
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.b <
            structuredMsg.DATASTREAMS[i].value[2].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[2].value <
            structuredMsg.DATASTREAMS[i].value[2].value
        ) {
          console.log("B phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , B`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.b,
            alarmValue: structuredMsg.DATASTREAMS[i].value[2].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[2].value >=
              DeviceExists.vmrSensorsThreshold.b
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.ry <
            structuredMsg.DATASTREAMS[i].value[3].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[3].value <
            structuredMsg.DATASTREAMS[i].value[3].value
        ) {
          console.log("RY phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , RY`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.ry,
            alarmValue: structuredMsg.DATASTREAMS[i].value[3].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[3].value >=
              DeviceExists.vmrSensorsThreshold.ry
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.yb <
            structuredMsg.DATASTREAMS[i].value[4].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[4].value <
            structuredMsg.DATASTREAMS[i].value[4].value
        ) {
          console.log("YB phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , YB`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.yb,
            alarmValue: structuredMsg.DATASTREAMS[i].value[4].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[4].value >=
              DeviceExists.vmrSensorsThreshold.yb
                ? true
                : false,
          });
        }

        if (
          DeviceExists.vmrSensorsThreshold.rb <
            structuredMsg.DATASTREAMS[i].value[5].value &&
          DeviceExists.VmrValues.DATASTREAMS[i].value[5].value <
            structuredMsg.DATASTREAMS[i].value[5].value
        ) {
          console.log("RB phase threshold found");
          await Alarm.create({
            deviceId,
            SensorName: `PH${i + 1} , RB`,
            thresholdValue: DeviceExists.vmrSensorsThreshold.rb,
            alarmValue: structuredMsg.DATASTREAMS[i].value[5].value,
            isRead:
              structuredMsg.DATASTREAMS[i].value[5].value >=
              DeviceExists.vmrSensorsThreshold.rb
                ? true
                : false,
          });
        }
      }
    } catch (error) {
      console.log("error from Vmr threshold compare");
    }
  }

  return true;
}

// ======================================== testing ============================================ //

// ================================= Create Device ================================ //
exports.createDevice = async (req, res, next) => {
  console.log("==== createDevice function got hit () ====");
  const {
    siteId,
    deviceName,
    nodeUid,
    vmrSensors,
    resSensors,
    spdSensors,
    nerSensors,
    resSensorsThreshold,
    vmrSensorsThreshold,
    spdSensorsThreshold,
    nerSensorsThreshold,
  } = req.body;

  if (!siteId || !deviceName || !nodeUid) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  try {
    const existingDevice = await Device.findOne({ nodeUid });

    if (existingDevice) {
      return res.status(409).json({
        msg: "Node UID already exists",
      });
    }

    let device = await Device.create({
      siteId,
      deviceName,
      nodeUid,
      vmrSensors,
      resSensors,
      spdSensors,
      nerSensors,
      resSensorsThreshold,
      vmrSensorsThreshold,
      spdSensorsThreshold,
      nerSensorsThreshold,
    });
    if (device) {
      return res.status(200).json({ msg: "device created successfully" });
    }
  } catch (error) {
    console.log("error from createDevice ==>", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ================================= Edit Device ================================ //

exports.editDevice = async (req, res) => {
  console.log("==== editDevice function got hit ====");

  const { deviceID, ...updateData } = req.body;

  console.log("deviceID:", deviceID);
  console.log("updateData:", updateData);

  if (!deviceID) {
    return res.status(400).json({
      msg: "deviceID is required",
    });
  }

  try {
    if (updateData.nodeUid) {
      const existingDevice = await Device.findOne({
        nodeUid: updateData.nodeUid,
        _id: { $ne: deviceID },
      });

      if (existingDevice) {
        return res.status(409).json({
          msg: "Node UID already exists",
        });
      }
    }

    const device = await Device.findByIdAndUpdate(
      deviceID,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!device) {
      return res.status(404).json({
        msg: "Device not found",
      });
    }

    console.log("device edited successfully");

    return res.status(200).json({
      msg: "device edited successfully",
      device,
    });
  } catch (error) {
    console.log("error from editDevice ==>", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ================================= Delete Device ================================ //

exports.deleteDevice = async (req, res, next) => {
  console.log("==== deleteDevice function got hit () ====");
  const { deviceID } = req.body;
  if (!deviceID) {
    return res.status(400).json({ msg: "Please! Provide all required data" });
  }
  try {
    let device = await Device.findByIdAndDelete(deviceID);
    if (device) {
      return res.status(200).json({ msg: "device deleted successfully" });
    }
  } catch (error) {
    console.log("error from deleteDevice ==>", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ========================= Today latest device Graph data ======================== //
exports.latestdevicedata = async (req, res) => {
  const { sensorName, deviceNumber, deviceId, startDate, endDate } = req.body;

  // console.log(":>>>>>>>>>>>>", deviceNumber);

  if (!sensorName || !deviceId || !startDate || !endDate) {
    return res.status(400).json({ msg: "Please provide all required data" });
  }

  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(400).json({ msg: "Invalid deviceId" });
  }

  try {
    let resp = await DeviceMsg.aggregate([
      {
        $match: {
          deviceId: new mongoose.Types.ObjectId(deviceId),
          "msg.DEVICE_TYPE": sensorName,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
    ]);

    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ========================= latest device Graph data according to date ======================== //
exports.latestdevicedataBydate = async (req, res, next) => {
  const { sensorName, deviceNumber, deviceId, startDate, endDate } = req.body;
  console.log("=== latestdevicedataBydate() ===");
  // console.table(req.body)

  if (!sensorName || !deviceId || !startDate || !endDate) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  if (sensorName === "VMR") {
    console.log("== Inside VMR condition ==");
    try {
      let resp = await DeviceMsg.aggregate([
        {
          $match: {
            deviceId: ObjectId(deviceId),
            "msg.DEVICE_TYPE": sensorName,
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $unwind: "$msg.DATASTREAMS",
        },
        {
          $match: {
            deviceId: ObjectId(deviceId),
            "msg.DEVICE_TYPE": sensorName,
            "msg.DATASTREAMS.deviceNumber": deviceNumber,
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $unwind: "$msg.DATASTREAMS.value",
        },
        {
          $addFields: {
            phaseNumber: "r",
            value: [
              {
                $match: {
                  "msg.DATASTREAMS.value.phaseNumber": "r",
                },
              },
            ],
          },
        },
        // {
        //   $match: {
        //     "msg.DATASTREAMS.value.phaseNumber" : 'r'
        //   }
        // }

        // {
        //   $addFields:{
        //     "phaseNumber": "$msg.DATASTREAMS.value.phaseNumber" ,
        //     "value": "$msg.DATASTREAMS.value.value"
        //   }
        // },
        // {
        //   $project : {
        //     msg: 0
        //   }
        // },
        // {
        //   $group: {
        //     "_id": "$phaseNumber"
        //   }
        // }
        // {
        //   $group: {
        //     _id: "$date",
        //     totalavgUnits: {
        //       $avg: "$msg.DATASTREAMS.value.value",
        //     },
        //   },
        // },
      ]);

      return res.status(200).json({ msg: resp });
    } catch (error) {
      console.log("Error from VMR ==>", error);
    }
  }
  try {
    let resp = await DeviceMsg.aggregate([
      {
        $match: {
          deviceId: ObjectId(deviceId),
          "msg.DEVICE_TYPE": sensorName,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },

      {
        $project: { msg: 1, date: 1 },
      },
      {
        $unwind: "$msg.DATASTREAMS",
      },
      {
        $addFields: {
          deviceNumber: "$msg.DATASTREAMS.deviceNumber",
          value: "$msg.DATASTREAMS.value",
        },
      },
      {
        $project: { msg: 0 },
      },
      {
        $group: {
          _id: "$date",
          totalavgUnits: {
            $avg: "$value",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from latest devicedata ==>", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ========================= Device Data acc. to siteId ============================= //
exports.getdeviceList = async (req, res) => {
  const { siteId } = req.params;
  console.log("req.user.id:", req.user.id);

  if (!siteId) {
    return res.status(400).json({ msg: "Please provide siteId" });
  }

  try {
    const siteIds = siteId
      .split(",")
      .map((id) => new mongoose.Types.ObjectId(id));

    let deviceQuery = {
      siteId: { $in: siteIds },
    };

    // FIX (IMPORTANT)
    if (req.user.role === "user") {
      deviceQuery.userId = new mongoose.Types.ObjectId(req.user.id);
    }

    const deviceList = await Device.find(deviceQuery, {
      deviceName: 1,
      nodeUid: 1,
      createdAt: 1,
      userId: 1,
      _id: 1,
      siteId: 1,
    }).lean();

    // console.log("deviceList:", deviceList);

    return res.status(200).json({ msg: deviceList });
  } catch (error) {
    console.log("error from getdeviceList =>", error);

    return res.status(500).json({
      msg: error.message,
    });
  }
};

exports.getDeviceListBySiteIds = async (req, res) => {
  const { siteIds } = req.body;

  if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
    return res.status(400).json({ msg: "siteIds required" });
  }

  try {
    let query = {
      siteId: { $in: siteIds },
    };

    if (req.user.role === "user") {
      query.userId = req.user._id;
    }

    const deviceList = await Device.find(query, {
      deviceName: 1,
      nodeUid: 1,
      createdAt: 1,
      userId: 1,
      _id: 1,
      siteId: 1,
    }).lean();

    return res.status(200).json({
      msg: deviceList,
    });
  } catch (error) {
    console.log("error =>", error);

    return res.status(500).json({
      msg: error.message,
    });
  }
};

// ========================= Device Data acc. to siteId and userId ============================= //
exports.getdeviceListByuserId = async (req, res, next) => {
  const { siteId, userId } = req.body;

  if (!siteId || !userId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  if (siteId === "null" || siteId === "undefined") {
    return res.status(400).json({ msg: "siteId not found" });
  }

  try {
    let query = { siteId };

    // 👇 user role ke liye hi filter lagao
    if (req.user.role === "user") {
      query.userId = req.user._id;
    } else {
      query.userId = userId;
    }

    const userDeviceList = await Device.find(query, {
      deviceName: 1,
      nodeUid: 1,
      createdAt: 1,
      userId: 1,
      _id: 1,
      siteId: 1,
    }).lean();

    console.log("query", query);
    console.log("devices", userDeviceList);

    return res.status(200).json({ msg: userDeviceList });
  } catch (error) {
    console.log("error from getdeviceListByuserId =>", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ========================= Get Device BY ID ============================= //
exports.getDeviceById = async (req, res, next) => {
  const { deviceId } = req.params;

  if (deviceId === "null" || deviceId === "undefined") {
    return res.status(400).json({ msg: "deviceID not found" });
  }

  if (deviceId) {
    try {
      let device = await Device.findById(deviceId).populate("siteId");
      if (device) {
        return res.status(200).json({ msg: device });
      }
    } catch (error) {
      console.log("error from getDevice", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
};

exports.getDeviceDataById = async (req, res, next) => {
  try {
    const deviceId = req.params.deviceId;
    if (!deviceId) {
      return res.status(400).json({ msg: "deviceID not found" });
    }

    let device = await Device.findById(deviceId).populate("siteId");
    return res.status(200).json({ msg: device });
  } catch (error) {
    console.log("error from getDevice", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ====================== Delete device from user Profile =========================== //
exports.deleteDeviceFromUser = async (req, res, next) => {
  const { userId, deviceId } = req.body;
  if (!deviceId || !userId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }
  try {
    let resp = await Device.findByIdAndUpdate(deviceId, {
      $pullAll: {
        userId: [userId],
      },
    });

    await User.findByIdAndUpdate(userId, {
      $pull: {
        deviceSensors: { deviceId: deviceId },
      },
    });
    if (resp) {
      return res.status(200).json({ msg: "Device deleted from user Profile" });
    }
  } catch (error) {
    console.log("error from deleteSiteFromUser ==>", error.message);
  }
};

// =========================  Download CSV report for Device ========================= //
exports.getCsv = async (req, res, next) => {
  const { sensorName, deviceId, deviceNumber, startDate, endDate } = req.body;
  // {
  //   "deviceId": "6374c4703f72921ccc86c4f7",
  //   "sensorName": "RES",
  //   "deviceNumber": ["RES_0", "RES_2"],
  //   "startDate": "2022-11-21",
  //   "endDate": "2022-11-22"
  // }
  console.log("==== ++++++++++ ====");
  console.log("==== generateCSV ====");
  console.log("==== generateCSV ====");
  console.log("==== generateCSV ====");
  console.log("==== ++++++++++ ====");
  console.table(req.body);

  if (!sensorName || !deviceId || !deviceNumber || !startDate || !endDate) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  if (sensorName === "VMR") {
    try {
      let firstIterate = true;
      let records = [];
      let deviceDetail;

      // for (let item of deviceNumber) {
      deviceDetail = await DeviceMsg.aggregate([
        {
          $match: {
            deviceId: ObjectId(deviceId),
            "msg.DEVICE_TYPE": sensorName,
            createdAt: {
              $gte: moment(startDate).startOf("day").toDate(),
              $lte: moment(endDate).endOf("day").toDate(),
            },
          },
        },
        {
          $unwind: "$msg.DATASTREAMS",
        },
        {
          $match: {
            "msg.DATASTREAMS.deviceNumber": {
              $in: deviceNumber,
            },
          },
        },
        {
          $lookup: {
            from: "devices",
            localField: "deviceId",
            foreignField: "_id",
            // pipeline: [
            //   { "$project": { "deviceName" : 1, "nodeUid": 1 }}
            // ],
            as: "deviceId",
          },
        },
        // {
        //   $addFields: {
        //     "dateAndTime": "$msg.DATASTREAMS.value"
        //   }
        // },
      ]);
      // if (firstIterate) {
      //   deviceDetail = deviceDetails
      //   firstIterate = false
      // } else {
      //   let index = 0
      //   for (let items of deviceDetail) {
      //     items[`${item}`] = deviceDetails[index].msg.DATASTREAMS.value
      //     index++
      //   }
      // }
      // }
      console.log("deviceDetail ==========> ", deviceDetail);
      for (let item of deviceDetail) {
        let obj = {};
        // obj[""]
        obj["deviceUid"] = item.deviceId[0].nodeUid;
        obj["deviceName"] = item.deviceId[0].deviceName;
        obj["date"] = item.date;
        obj["time"] = item.time;
        obj["phaseNumber"] = deviceNumber[0];
        obj["r"] = item.msg.DATASTREAMS.value[0].value;
        obj["y"] = item.msg.DATASTREAMS.value[1].value;
        obj["b"] = item.msg.DATASTREAMS.value[2].value;
        obj["ry"] = item.msg.DATASTREAMS.value[3].value;
        obj["yb"] = item.msg.DATASTREAMS.value[4].value;
        obj["rb"] = item.msg.DATASTREAMS.value[5].value;
        // obj[`${deviceNumber[0]}`] = item.dateAndTime
        // for (let i=1; i < deviceNumber.length; i++) {
        //   obj[`${deviceNumber[i]}`] = item[`${deviceNumber[i]}`]
        // }
        records.push(obj);
      }

      let Headers = [
        { id: "deviceName", title: "Device Name" },
        { id: "date", title: "Date" },
        { id: "time", title: "Time" },
        { id: "phaseNumber", title: "Phase Number" },
        { id: "r", title: "R" },
        { id: "y", title: "Y" },
        { id: "b", title: "B" },
        { id: "ry", title: "RY" },
        { id: "yb", title: "YB" },
        { id: "rb", title: "RB" },
      ];

      // for (let item of deviceNumber) {
      //   let obj = { id: `${item}`, title: `${item}` }
      //   Headers.push(obj)
      // }

      // ========================================================== //
      const writer = csvWriter.createObjectCsvWriter({
        // path: path.resolve(__dirname, 'file.csv.csv'),
        path: "file.csv",
        header: Headers,
      });

      writer.writeRecords(records).then(() => {
        console.log("Done!");
        return res.status(200).json({ msg: "CSV generated successfully" });
      });

      // ========================================================== //
    } catch (error) {
      console.log("error from getCsv VMR ==>", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  } else {
    console.log("it is not a vmr");
    try {
      let firstIterate = true;
      let records = [];
      let deviceDetail;

      for (let item of deviceNumber) {
        try {
          let deviceDetails = await DeviceMsg.aggregate([
            {
              $match: {
                deviceId: ObjectId(deviceId),
                "msg.DEVICE_TYPE": sensorName,
                createdAt: {
                  $gte: moment(startDate).startOf("day").toDate(),
                  $lte: moment(endDate).endOf("day").toDate(),
                },
              },
            },
            {
              $unwind: "$msg.DATASTREAMS",
            },
            {
              $match: {
                "msg.DATASTREAMS.deviceNumber": item,
              },
            },
            {
              $lookup: {
                from: "devices",
                localField: "deviceId",
                foreignField: "_id",
                // pipeline: [
                //   { "$project": { "deviceName" : 1,"nodeUid": 1 }}
                // ],
                as: "deviceId",
              },
            },
            {
              $addFields: {
                dateAndTime: "$msg.DATASTREAMS.value",
              },
            },
          ]);
          if (firstIterate) {
            deviceDetail = deviceDetails;
            firstIterate = false;
          } else {
            let index = 0;
            for (let items of deviceDetail) {
              items[`${item}`] = deviceDetails[index].msg.DATASTREAMS.value;
              index++;
            }
          }

          console.log("deviceDetails: ", deviceDetails);
        } catch (error) {
          console.log(
            `while generating report the value ${item} not found in db`,
          );
        }
      }

      // console.log("deviceDetail ==========> ", deviceDetail)

      for (let item of deviceDetail) {
        let obj = {};
        obj["deviceUid"] = item.deviceId[0].nodeUid;
        obj["deviceName"] = item.deviceId[0].deviceName;
        obj["date"] = item.date;
        obj["time"] = item.time;
        obj[`${deviceNumber[0]}`] = item.dateAndTime;
        for (let i = 1; i < deviceNumber.length; i++) {
          obj[`${deviceNumber[i]}`] = item[`${deviceNumber[i]}`] || 0;
        }
        records.push(obj);
      }

      let Headers = [
        { id: "deviceName", title: "Device Name" },
        { id: "date", title: "Date" },
        { id: "time", title: "Time" },
      ];

      for (let item of deviceNumber) {
        let obj = { id: `${item}`, title: `${item}` };
        Headers.push(obj);
      }

      // ========================================================== //
      const writer = csvWriter.createObjectCsvWriter({
        // path: path.resolve(__dirname, 'file.csv.csv'),
        path: "file.csv",
        header: Headers,
      });

      writer.writeRecords(records).then(() => {
        console.log("Done!");

        return res.status(200).json({ msg: "CSV GENERATED" });
      });

      // return res.status(200).json({msg: records})

      // res.setHeader(
      //   "Content-Type",
      //   "application/vnd.openxmlformats-officedocument.spreadsheatml.sheet"
      // );
      // res.setHeader("Content-Disposition", `attachment; filename=file2.csv`);
      // return res.status(200).json({msg: deviceDetail})
      // ========================================================== //
    } catch (error) {
      console.log("error from getCsv ==>", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
};

// ================================= DownlaodCSV =============================== //
exports.downloadcsv = async (req, res, next) => {
  var directFilepath = path.resolve(__dirname, "../file.csv");
  var file = fs.createReadStream(directFilepath);
  file.pipe(res);
};

// ============================== Get Device by deviceId ============================== //
exports.getDeviceByuserId = async (req, res, next) => {
  console.log(" ====== getDeviceByuserId () ========= ");
  try {
    let resp = await Device.find({
      userId: { $in: [req.params.userId] },
    });
    if (resp) {
      return res.status(200).json({ msg: resp });
    }
  } catch (error) {
    console.log("error from getDeviceByuserId", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================== check DeviceNode UID exists or not ============================== //
exports.checkDeviceUid = async (req, res, next) => {
  const { uid } = req.body;
  try {
    let resp = await Device.findOne({ nodeUid: uid });
    // console.log("resp checkDeviceUid ==>",  resp )
    if (!resp) {
      return res
        .status(200)
        .json({ msg: "This UID is available", status: true });
    }
    if (resp) {
      return res
        .status(200)
        .json({ msg: "This UID is not available", status: false });
    }
  } catch (error) {
    console.log("error from checkDeviceUid", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================== Device Shutdown ================================ //
exports.deviceShutdown = async (req, res, next) => {
  console.log("shutDown triggered");

  let { stdout } = exec("pkill -o firefox");
  if (stdout) {
    exec("echo 123456 | sudo -S shutdown now");
  }

  //  exec("pkill -o firefox",(e,i) =>{
  //      exec("shutdown now");
  //   })

  res.send("shutting down");
};

// ============================== Device Reboot ================================ //
exports.deviceReboot = async (req, res, next) => {
  console.log("Reboot triggered");

  let { stdout } = exec("pkill -o firefox");
  if (stdout) {
    exec("echo 123456 | sudo -S reboot");
  }

  // exec("pkill -o firefox",(e,i) =>{
  //     exec("reboot");
  //   })
  res.send("Rebooting");
};
