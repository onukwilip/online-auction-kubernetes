const mongoose = require('mongoose')

const BiddingsModel = mongoose.Schema({
    userId: {type: String, required: true},
    datePosted: {type: Date, required: true},
    bidId: { type: String, required: true },
    amount: {type: Number, required: true}
})

module.exports=mongoose.models.Biddings || mongoose.model('Biddings', BiddingsModel)