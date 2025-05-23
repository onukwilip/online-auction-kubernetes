const mongoose = require("mongoose");

let retries = 10;

const connect = async () => {
  while (retries) {
    try {
      console.log("URI: ", process.env.MONGODB_URI);
      await mongoose.connect(process.env.MONGODB_URI);
      console.log(`✅ Connected successfully`);
      break;
    } catch (e) {
      console.log(
        `❌ MongoDB connection failed. Retrying in 10s...`,
        e.message
      );
      retries--;
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  if (!retries) {
    console.error("🔥 Could not connect to MongoDB after multiple attempts.");
    process.exit(1);
  }
};

module.exports = connect;
