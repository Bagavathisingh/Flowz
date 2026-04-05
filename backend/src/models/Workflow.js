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
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        default: null,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    isPublished: {
        type: Boolean,
        default: false
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
