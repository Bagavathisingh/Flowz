import { useState, useCallback, useRef } from 'react';
import dagre from 'dagre';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CustomNode from './components/CustomNode';
import Modals from './components/Modals';
import PropertiesSidebar from './components/PropertiesSidebar';
import Notification from './components/Notification';

const API_URL = 'http://localhost:5000/api';

let id = 10;
const getId = () => `dndnode_${id++}`;

const nodeTypes = {
  customTask: CustomNode,
};

const BuilderCanvas = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [generatedJsonResult, setGeneratedJsonResult] = useState(null);
  const [notification, setNotification] = useState(null);

  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const notify = (type, message, title) => {
    setNotification({ type, message, title });
  };

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const typeData = event.dataTransfer.getData('application/reactflow');

      if (typeof typeData === 'undefined' || !typeData) {
        return;
      }

      const { type, label, isTrigger } = JSON.parse(typeData);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: 'customTask',
        position,
        data: { label, type, isTrigger, config: {} },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeConfig = (key, value) => {
    if (!selectedNode) return;
    const updatedConfig = key === 'full_config'
      ? value
      : { ...(selectedNode.data.config || {}), [key]: value };

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, data: { ...node.data, config: updatedConfig } };
        }
        return node;
      })
    );

    setSelectedNode((prev) => ({
      ...prev,
      data: { ...prev.data, config: updatedConfig }
    }));
  };

  const generateWorkflow = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setGeneratedJsonResult(null);
    try {
      const { data } = await axios.post(`${API_URL}/ai/generate-workflow`, { prompt: aiPrompt });
      setGeneratedJsonResult(data);
      notify('success', 'Workflow architecture generated successfully.');
    } catch (error) {
      console.error('Failed to generate workflow:', error);
      notify('error', error.response?.data?.error || 'Failed to generate workflow.');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyGeneratedWorkflow = () => {
    if (!generatedJsonResult) return;
    const data = generatedJsonResult;
    const generatedNodes = [];
    const generatedEdges = [];

    if (data.nodes && data.edges) {
      data.nodes.forEach((n, index) => {
        generatedNodes.push({
          id: n.id,
          type: 'customTask',
          position: n.position || { x: 300 + (index % 2 === 0 ? 0 : 250), y: 100 + (index * 120) },
          data: {
            label: n.data?.label || n.type,
            type: n.type,
            isTrigger: n.type.toLowerCase().includes('trigger'),
            config: n.data?.config || {}
          }
        });
      });

      data.edges.forEach((e) => {
        generatedEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined
        });
      });
    } else {
      let yOffset = 100;

      if (data.trigger) {
        generatedNodes.push({
          id: 'trigger_1',
          type: 'customTask',
          position: { x: 300, y: yOffset },
          data: { label: 'Trigger', type: data.trigger.type, isTrigger: true, config: data.trigger.config || {} }
        });
        yOffset += 150;
      }

      if (data.actions) {
        data.actions.forEach((action, index) => {
          const nid = `action_${index + 1}`;
          generatedNodes.push({
            id: nid,
            type: 'customTask',
            position: { x: 300, y: yOffset },
            data: { label: `Action ${index + 1}`, type: action.type, isTrigger: false, config: action.config || {} }
          });

          generatedEdges.push({
            id: `edge_${index}`,
            source: index === 0 ? 'trigger_1' : `action_${index}`,
            target: nid
          });
          yOffset += 150;
        });
      }
    }

    setNodes(generatedNodes);
    setEdges(generatedEdges);
    setShowAiModal(false);
    setGeneratedJsonResult(null);
    setAiPrompt('');
    notify('success', 'Workflow applied to canvas.', 'Success');
    setTimeout(() => setViewport({ x: 0, y: 0, zoom: 1 }), 100);
  };

  const handleTestRun = async () => {
    if (nodes.length === 0) return notify('info', 'Please add nodes to test your workflow.');
    setIsExecuting(true);

    // Initial state: Set all nodes to pending (null status)
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, executionStatus: null, executionResult: null }
    })));

    try {
      const res = await axios.post(`${API_URL}/workflows/test/execute`, {
        nodes,
        edges,
        payload: {
          event: "user_login",
          user: "admin_user",
          ip_address: "106.192.167.104",
          location: "Chennai, Tamil Nadu, India",
          browser: "Chrome/Windows"
        }
      });

      const { nodeLogs } = res.data;

      // SEQUENTIAL ANIMATION
      for (const log of nodeLogs) {
        setNodes(nds => nds.map(node =>
          node.id === log.nodeId
            ? { ...node, data: { ...node.data, executionStatus: 'loading' } }
            : node
        ));

        await new Promise(r => setTimeout(r, 600));

        setNodes(nds => nds.map(node =>
          node.id === log.nodeId
            ? {
              ...node,
              data: {
                ...node.data,
                executionStatus: log.status,
                executionResult: log.result || log.error
              }
            }
            : node
        ));

        await new Promise(r => setTimeout(r, 200));
      }

      if (res.data.status === 'failure') {
        notify('error', res.data.error, 'Workflow Execution Failed');
      } else {
        notify('success', 'Workflow executed successfully from start to finish!', 'Success');
      }

    } catch (e) {
      console.error(e);
      notify('error', 'The execution engine encountered an error. Check backend logs.', 'Engine Error');
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, executionStatus: null } })));
    } finally {
      setIsExecuting(false);
    }
  };

  const fetchWorkflows = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/workflows`);
      setWorkflowHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      notify('error', 'Could not load workflow history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openHistoryModal = () => {
    fetchWorkflows();
    setShowHistoryModal(true);
  };

  const loadWorkflow = (workflow) => {
    setNodes(workflow.nodes || []);
    setEdges(workflow.edges || []);
    setShowHistoryModal(false);
    notify('info', `Loaded workflow: ${workflow.name}`);
    setTimeout(() => setViewport({ x: 0, y: 0, zoom: 1 }), 100);
  };

  const onLayout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Setup graph
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 70, ranksep: 100 });

    const nodeWidth = 250;
    const nodeHeight = 80;

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    });

    setNodes(newNodes);
    notify('success', 'Workspace organized!', 'Auto-Layout');
    setTimeout(() => {
      setViewport({ x: 50, y: 50, zoom: 0.8 }, { duration: 800 });
    }, 100);
  }, [nodes, edges, setNodes, setViewport]);

  const saveWorkflow = async () => {
    if (!workflowName) return;
    setIsSaving(true);
    try {
      await axios.post(`${API_URL}/workflows`, {
        name: workflowName,
        nodes,
        edges
      });
      setShowSaveModal(false);
      setWorkflowName('');
      notify('success', 'Your workflow has been saved to the database.', 'Workflow Saved');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      notify('error', 'Error saving workflow to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-200 font-['Outfit'] overflow-hidden">
      <Sidebar />

      <div className="flex-1 relative bg-[radial-gradient(circle_at_50%_50%,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[size:24px_24px]" ref={reactFlowWrapper}>
        <TopBar
          setShowSaveModal={setShowSaveModal}
          openHistoryModal={openHistoryModal}
          setShowAiModal={setShowAiModal}
          handleTestRun={handleTestRun}
          isExecuting={isExecuting}
          onLayout={onLayout}
        />

        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background color="#30363d" gap={20} />
          <Controls />
        </ReactFlow>
      </div>

      {selectedNode && (
        <PropertiesSidebar
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          updateNodeConfig={updateNodeConfig}
        />
      )}

      <Modals
        showAiModal={showAiModal} setShowAiModal={setShowAiModal} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt}
        isGenerating={isGenerating} generateWorkflow={generateWorkflow}
        generatedJsonResult={generatedJsonResult} applyGeneratedWorkflow={applyGeneratedWorkflow} setGeneratedJsonResult={setGeneratedJsonResult}
        showSaveModal={showSaveModal} setShowSaveModal={setShowSaveModal} workflowName={workflowName} setWorkflowName={setWorkflowName} isSaving={isSaving} saveWorkflow={saveWorkflow}
        showHistoryModal={showHistoryModal} setShowHistoryModal={setShowHistoryModal} isLoadingHistory={isLoadingHistory} workflowHistory={workflowHistory} loadWorkflow={loadWorkflow}
      />

      <Notification notification={notification} setNotification={setNotification} />
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <BuilderCanvas />
    </ReactFlowProvider>
  );
}
