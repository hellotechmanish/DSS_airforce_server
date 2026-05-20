import express from "express";
import type { Application } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
// import helmet from "helmet";
// import morgan from "morgan";

// routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/userRoutes.js";
// import siteRoutes from "./routes/siteRoutes.js";
// import deviceRoutes from "./routes/deviceRoutes.js";
// import alarmRoutes from "./routes/alarmRoutes.js";

// middleware
import { checkauth } from "./middleware/checkauth.js";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

/* -------------------- Middlewares -------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(helmet());
// app.use(helmet.frameguard({ action: "deny" }));

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  }),
);

// app.use(morgan("dev"));

/* -------------------- Routes -------------------- */

// health check
app.get("/api", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "DERMS API Running",
  });
});

// public
app.use("/api/auth", authRoutes);

// protected
app.use("/api/user", checkauth, userRoutes);
// app.use("/api/site", checkauth, siteRoutes);
// app.use("/api/device", checkauth, deviceRoutes);
// app.use("/api/alarm", checkauth, alarmRoutes);

/* -------------------- DB Connection -------------------- */

mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

connectDB();
