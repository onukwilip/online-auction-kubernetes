const mongoose = require("mongoose");

const Users = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: Number,
  },
  image: String,
  authenticated: {
    type: Boolean,
    required: true,
  },
  auth: {
    code: { type: Number, required: true },
    expiry: { type: Date, required: true },
  },
  image: String,
});

module.exports = mongoose.models.Users || mongoose.model("Users", Users);
