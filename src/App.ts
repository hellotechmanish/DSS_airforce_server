import express from "express";
import type { Application } from "express";
import dotenv from "dotenv";

// routes
import authRoutes from "./routes/auth.routes.js";

// middleware
import { checkauth } from "./middleware/checkauth.js";

// db
import connectDB from "./config/db.js";
import corsConfig from "./config/cors.js";
import userRoutes from "./routes/user.routes.js";
import siteroutes from "./routes/site.routes.js";
import deviceroutes from "./routes/device.routes.js";
// import sensorroutes from "./routes/sensor.routes.js";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;
/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);
app.use(corsConfig);

/* ================= HEALTH ================= */
app.get("/api", (_req, res) => {
  res.status(200).json({
    success: true,

    message: "DERMS API Running",
  });
});

/* ================= ROUTES ================= */

// public
app.use("/api/auth", authRoutes);

// protected
app.use("/api/user", checkauth, userRoutes);
app.use("/api/site", checkauth, siteroutes);
app.use("/api/device", checkauth, deviceroutes);
// app.use("/api/sensor", checkauth, sensorroutes);

/* ================= START SERVER ================= */
const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();
