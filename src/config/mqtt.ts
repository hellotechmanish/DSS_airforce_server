import mqtt from "mqtt";
import { createClient } from "redis";
import Device from "../models/device.model.js";
import { saveLatestData } from "../services/device.service.js";
import dotenv from "dotenv";

dotenv.config();

/* ============================== CONFIGURATION ============================== */
const saveIntervalMinutes = parseFloat(
  process.env.SAVE_INTERVAL_MINUTES || ".5",
);
const SAVE_INTERVAL_MS = Number.isNaN(saveIntervalMinutes)
  ? 60000
  : saveIntervalMinutes * 60 * 1000;

/* ============================== REDIS SETUP ============================== */
const redisClient = createClient({
  url: "redis://127.0.0.1:6379",
  socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 500) },
});

// Redis Error Handling (Filtering out version mismatch noise)
redisClient.on("error", (err: Error) => {
  if (err.message.includes("HELLO") || err.message.includes("unknown command"))
    return;
  console.log("❌ Redis Error:", err.message);
});

(async () => {
  try {
    await redisClient.connect();
    console.log("🚀 [SYSTEM] Redis Connected (Aggregator Ready)");
  } catch (err) {
    console.log("❌ [SYSTEM] Redis Connection Fail.");
  }
})();

/* ============================== MQTT SETUP ============================== */
const client = mqtt.connect(process.env.MQTT_URL || "mqtt://127.0.0.1:1883");

client.on("connect", () => {
  console.log("✅ [SYSTEM] MQTT Active & Subscribed to Topics");
  client.subscribe(process.env.MQTT_TOPIC || "b25saW5lcmVzbW9uaXRvcg==");
});

/* ============================== MESSAGE PROCESSING logic ============================== */

client.on("message", async (topic, message) => {
  try {
    // 1. RAW DATA PARSING
    const raw = JSON.parse(message.toString());
    console.log("data from brokker", raw);

    const nodeId = raw.Node_Id.toString();
    console.log("NODE ID", nodeId);

    const decoded = JSON.parse(
      Buffer.from(raw.data, "base64").toString("utf8"),
    );
    console.log("decode information", decoded);

    const redisKey = `node_state:${nodeId}`;
    console.log("rediskey", redisKey);

    // 2. AGGREGATION STEP: Sare sensors ka data Redis Hash mein save/update ho raha hai
    for (const [key, value] of Object.entries(decoded)) {
      if (!["start", "end", "initialStart", "alarm"].includes(key)) {
        const valStr =
          value == null
            ? ""
            : typeof value === "object"
              ? JSON.stringify(value)
              : value.toString();
        await redisClient.hSet(redisKey, key, valStr);
      }
    }

    // 3. INTERVAL CONTROL: Check if it's time to flush to MongoDB
    if (decoded.end) {
      const lastSaved = await redisClient.hGet(redisKey, "last_db_save");
      const now = Date.now();

      if (!lastSaved || now - parseInt(lastSaved) >= SAVE_INTERVAL_MS) {
        // INTERVAL HIT!
        const allData = await redisClient.hGetAll(redisKey);

        // Update pichle save ka timestamp turant (Concurrency handle karne ke liye)
        await redisClient.hSet(redisKey, "last_db_save", now.toString());

        // Process final sync
        await commitToMongoDB(nodeId, allData);
      } else {
        // INTERVAL NOT HIT: Just buffering
        const wait = Math.round(
          (SAVE_INTERVAL_MS - (now - parseInt(lastSaved))) / 1000,
        );
        // console.log(`⏳ [BUFFER] Node ${nodeId}: Updates in ${wait}s`);
      }
    }
  } catch (error: any) {
    console.error("❌ [PARSE ERROR]:", error.message);
  }
});

/* ============================== DATABASE SYNC LOGIC (OPTIMIZED) ============================== */

async function commitToMongoDB(nodeId: string, sensorData: any) {
  try {
    // 1. CHECK CACHE FIRST: Har baar DB hit karke findOne karne ki zaroorat nahi
    let dbId = await redisClient.get(`cache:id:${nodeId}`);

    if (!dbId) {
      // Agar cache mein nahi hai, tabhi MongoDB mein dhoondo (Sirf pehli baar)
      const device = await Device.findOne({ nodeUid: nodeId }).select("_id");
      if (!device) {
        // console.log(`⚠️ Node ${nodeId} unknown. Skipping.`);
        return;
      }
      dbId = device._id.toString();
      // Cache it for 24 hours
      await redisClient.set(`cache:id:${nodeId}`, dbId, { EX: 86400 });
      console.log(`💾 [NEW CACHE] Mapped Node ${nodeId} -> DB ID ${dbId}`);
    }

    const tasks = [];

    // 2. DATA FORMATTING
    let dataObj = sensorData;
    if (Array.isArray(sensorData)) {
      dataObj = {};
      for (let i = 0; i < sensorData.length; i += 2) {
        dataObj[sensorData[i]] = sensorData[i + 1];
      }
    }

    // 3. TASK QUEUING (Batching for this Node)
    // RES_0, RES_1
    if (dataObj.RES_0)
      tasks.push(
        saveLatestData(
          {
            DEVICE_TYPE: "RES",
            DATASTREAMS: [
              { deviceNumber: "RES_0", value: Number(dataObj.RES_0) || 0 },
            ],
          },
          dbId,
          "ResValues",
        ),
      );
    if (dataObj.RES_1)
      tasks.push(
        saveLatestData(
          {
            DEVICE_TYPE: "RES",
            DATASTREAMS: [
              { deviceNumber: "RES_1", value: Number(dataObj.RES_1) || 0 },
            ],
          },
          dbId,
          "ResValues",
        ),
      );

    // NER_0, NER_1
    if (dataObj.NER_0)
      tasks.push(
        saveLatestData(
          {
            DEVICE_TYPE: "NER",
            DATASTREAMS: [
              { deviceNumber: "NER_0", value: Number(dataObj.NER_0) || 0 },
            ],
          },
          dbId,
          "NerValues",
        ),
      );
    if (dataObj.NER_1)
      tasks.push(
        saveLatestData(
          {
            DEVICE_TYPE: "NER",
            DATASTREAMS: [
              { deviceNumber: "NER_1", value: Number(dataObj.NER_1) || 0 },
            ],
          },
          dbId,
          "NerValues",
        ),
      );

    // VMR
    if (dataObj.VMR_R || dataObj.VMR_Y || dataObj.VMR_B) {
      tasks.push(
        saveLatestData(
          {
            DEVICE_TYPE: "VMR",
            DATASTREAMS: [
              { deviceNumber: "R", value: Number(dataObj.VMR_R) || 0 },
              { deviceNumber: "Y", value: Number(dataObj.VMR_Y) || 0 },
              { deviceNumber: "B", value: Number(dataObj.VMR_B) || 0 },
            ],
          },
          dbId,
          "VmrValues",
        ),
      );
    }

    // TEMP & HUM
    if (dataObj.Temp)
      tasks.push(
        saveLatestData(
          {
            DEVICE_TYPE: "TEMP",
            DATASTREAMS: [
              { deviceNumber: "Temp", value: Number(dataObj.Temp) || 0 },
            ],
          },
          dbId,
          "TempValues",
        ),
      );
    if (dataObj.Hum)
      tasks.push(
        saveLatestData(
          {
            DEVICE_TYPE: "HUM",
            DATASTREAMS: [
              { deviceNumber: "Hum", value: Number(dataObj.Hum) || 0 },
            ],
          },
          dbId,
          "HumValues",
        ),
      );

    // 4. BATCH EXECUTION
    if (tasks.length > 0) {
      await Promise.all(tasks);
      // Sirf success log dikhayein, pura payload nahi (200 nodes ke liye terminal saaf rahega)
      console.log(`✅ [SYNC SUCCESS] Node ${nodeId}`);
    }
  } catch (err: any) {
    console.error(`❌ [SYNC ERROR] Node ${nodeId}:`, err.message);
  }
}

export default client;
