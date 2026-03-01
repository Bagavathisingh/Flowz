import express from 'express';
import { generateWorkflowConfig, explainErrorLog } from '../controllers/aiController.js';
import { runWorkflow } from '../engine/index.js';
import Workflow from '../models/Workflow.js';

const router = express.Router();

// AI Routes
router.post('/ai/generate-workflow', generateWorkflowConfig);
router.post('/ai/explain-error', explainErrorLog);

// Workflow execution testing route
router.post('/workflows/:id/execute', async (req, res) => {
    try {
        const { nodes, edges, payload } = req.body;
        console.log(`[ROUTE] Received execution request for workflow: ${req.params.id}`);
        console.log(`[ROUTE] Total Nodes: ${nodes?.length}, Total Edges: ${edges?.length}`);

        if (!nodes || !edges) {
            return res.status(400).json({ error: 'Nodes and edges are required for execution' });
        }

        const result = await runWorkflow(nodes, edges, payload || {});
        console.log(`[ROUTE] Execution finished with status: ${result.status}`);
        res.json(result);
    } catch (error) {
        console.error(`[ROUTE ERROR]: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Workflow CRUD routes
router.get('/workflows', async (req, res) => {
    try {
        const workflows = await Workflow.find().sort({ createdAt: -1 });
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/workflows', async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        const newWorkflow = new Workflow({
            name,
            nodes,
            edges
        });
        const savedWorkflow = await newWorkflow.save();
        res.status(201).json(savedWorkflow);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
