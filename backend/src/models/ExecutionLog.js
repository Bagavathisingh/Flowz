import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
    nodeId: { type: String, required: true },
    nodeType: { type: String, required: true },
    status: { type: String, enum: ['success', 'failure'], required: true },
    error: { type: String },
    duration: { type: Number, required: true }, // ms
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const executionLogSchema = new mongoose.Schema({
    workflowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workflow',
        required: true
    },
    status: {
        type: String,
        enum: ['running', 'success', 'failure'],
        default: 'running'
    },
    error: { type: String },
    nodeLogs: [logSchema]
}, { timestamps: true });

const ExecutionLog = mongoose.model('ExecutionLog', executionLogSchema);
export default ExecutionLog;
