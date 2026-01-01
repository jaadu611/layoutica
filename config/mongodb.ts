import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const connectDB = async (retries = 5, delayMs = 3000) => {
  try {
    mongoose.set("strictQuery", true);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB runtime error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });
  } catch (error) {
    console.error(
      `MongoDB connection failed (${retries - 1} retries remaining):`,
      error
    );

    if (retries <= 0) {
      console.error("Exhausted MongoDB connection retries. Exiting.");
      process.exit(1);
    }

    await new Promise((res) => setTimeout(res, delayMs));
    return connectDB(retries - 1, delayMs);
  }
};

const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received. Closing MongoDB connection...`);
  await mongoose.connection.close();
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default connectDB;
