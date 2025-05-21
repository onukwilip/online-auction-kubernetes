const mongoose = require("mongoose");

const SubscribedUsers = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  subscriptions: {
    type: [
      {
        endpoint: String,
        keys: {
          p256dh: String,
          auth: String,
        },
      },
    ],
    required: false,
  },
});

module.exports =
  mongoose.models.SubscribedUsers ||
  mongoose.model("SubscribedUsers", SubscribedUsers);
