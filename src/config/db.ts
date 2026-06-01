import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", true);

    await mongoose.connect((process.env.MONGO_URI as string) || "", {
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("MongoDB connected");
  } catch (error) {
    console.error("Database connection failed:", error);

    process.exit(1);
  }
};

export default connectDB;
