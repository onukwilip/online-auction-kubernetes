const mongoose = require("mongoose");

const connect = async () => {
  const con = await mongoose
    .connect(process.env.MONGODB_URI)
    .catch(async (e) => {
      console.log(e);
      await connect();
    });
  if (con) {
    console.log(`Connected successfully`);
  }
  // console.log("URI", process.env.MONGODB_URI);
};

module.exports = connect;
