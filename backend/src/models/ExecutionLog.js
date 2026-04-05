import mongoose from 'mongoose';

// Per-node execution record stored inside each run document
const nodeLogSchema = new mongoose.Schema({
    nodeId:    { type: String, required: true },
    nodeLabel: { type: String },
    nodeType:  { type: String, required: true },
    status:    { type: String, enum: ['success', 'failure', 'skipped'], required: true },
    error:     { type: String },
    result:    { type: mongoose.Schema.Types.Mixed },  // raw output
    input:     { type: mongoose.Schema.Types.Mixed },  // snapshot of context at execution time
    retries:   { type: Number, default: 0 },
    duration:  { type: Number, required: true },       // ms
    startedAt: { type: Date, default: Date.now }
}, { _id: false });

const executionLogSchema = new mongoose.Schema({
    workflowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workflow',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['running', 'success', 'failure'],
        default: 'running'
    },
    error:       { type: String },
    nodeLogs:    [nodeLogSchema],
    duration:    { type: Number },          // total ms
    triggeredBy: {
        type: String,
        enum: ['manual', 'webhook', 'schedule', 'form', 'chat', 'app_event', 'sub_workflow', 'api'],
        default: 'api'
    }
}, { timestamps: true });

const ExecutionLog = mongoose.model('ExecutionLog', executionLogSchema);
export default ExecutionLog;

