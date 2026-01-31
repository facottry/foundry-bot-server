const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    query: { type: String, required: true },
    answer: { type: String, required: true },
    persona: { type: String },
    action_result: { type: String }, // For REX actions
    timestamp: { type: Date, default: Date.now },
    meta: {
        confidence: Number,
        source: [String],
        notes: String
    }
});

const sessionLogSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String },
    founderId: { type: String }, // If authenticated as founder
    mode: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastUpdatedAt: { type: Date, default: Date.now },
    interactions: [interactionSchema]
});

module.exports = mongoose.model('SessionLog', sessionLogSchema);
