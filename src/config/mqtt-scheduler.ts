// import {saveLatestData} from "../services/device.service.js";

const startScheduler = () => {
  const interval = Number(process.env.SAVE_INTERVAL_MINUTES) * 60 * 1000;

  console.log(`✅ Scheduler Started (${interval / 1000}s)`);

  setInterval(async () => {
    console.log("📡 Fetching device data...");
    // await saveLatestData();
  }, interval);
};

export default startScheduler;
