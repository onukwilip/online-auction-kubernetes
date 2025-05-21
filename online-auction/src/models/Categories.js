const mongoose = require("mongoose");

const Category = mongoose.Schema({
  name: { type: String, required: true },
});

module.exports =
  mongoose.models.Categories || mongoose.model("Categories", Category);
