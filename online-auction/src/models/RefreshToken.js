const mongoose = require("mongoose");

const RefreshTokenModel = mongoose.Schema({
  id: String,
  email: String,
  expiry: Date,
  userId: String,
});

module.exports =
  mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", RefreshTokenModel);
