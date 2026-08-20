import mongoose, { Schema } from "mongoose";

const summarySchema = new Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        unique: true,
    },

    content: {
        type: String,
        required: true,
    },

    summarizedUntil: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true,
});

const Summary = mongoose.model("Summary", summarySchema);

export default Summary;