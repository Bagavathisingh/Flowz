import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true }
}, { _id: false, strict: false });

const edgeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true }
}, { _id: false, strict: false });

const workflowSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    name: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    nodes: [nodeSchema],
    edges: [edgeSchema]
}, { timestamps: true });

const Workflow = mongoose.model('Workflow', workflowSchema);
export default Workflow;
