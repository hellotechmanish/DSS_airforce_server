const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Falls back to a local string if MONGO_URI is missing in .env
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/dss_airforce",
    );
    console.log(`[->] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[X] Database connection failed: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
