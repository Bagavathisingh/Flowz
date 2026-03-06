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
import { Zap, Plus } from 'lucide-react';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CustomNode from './components/CustomNode';
import Modals from './components/Modals';
import PropertiesSidebar from './components/PropertiesSidebar';
import Notification from './components/Notification';
import ContextMenu from './components/ContextMenu';
import ExecutionPanel from './components/ExecutionPanel';
import TestInputModal from './components/TestInputModal';
import PublishModal from './components/PublishModal';
import WorkflowTabs from './components/WorkflowTabs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let id = 10;
const getId = () => `dndnode_${id++}`;

const nodeTypes = {
  customTask: CustomNode,
};

const BuilderCanvas = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [generatedJsonResult, setGeneratedJsonResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const [menu, setMenu] = useState(null);

  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [showTestInputModal, setShowTestInputModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Multi-Workflow / Tabs State
  const [openWorkflows, setOpenWorkflows] = useState([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState(null);

  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      const pane = reactFlowWrapper.current.getBoundingClientRect();
      setMenu({
        id: node.id,
        type: 'node',
        node: node,
        top: event.clientY < pane.height - 200 ? event.clientY - pane.top : undefined,
        left: event.clientX < pane.width - 200 ? event.clientX - pane.left : undefined,
        right: event.clientX >= pane.width - 200 ? pane.width - (event.clientX - pane.left) : undefined,
        bottom: event.clientY >= pane.height - 200 ? pane.height - (event.clientY - pane.top) : undefined,
      });
    },
    [setMenu],
  );

  const onEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      const pane = reactFlowWrapper.current.getBoundingClientRect();
      setMenu({
        id: edge.id,
        type: 'edge',
        edge: edge,
        top: event.clientY < pane.height - 200 ? event.clientY - pane.top : undefined,
        left: event.clientX < pane.width - 200 ? event.clientX - pane.left : undefined,
        right: event.clientX >= pane.width - 200 ? pane.width - (event.clientX - pane.left) : undefined,
        bottom: event.clientY >= pane.height - 200 ? pane.height - (event.clientY - pane.top) : undefined,
      });
    },
    [setMenu],
  );

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setMenu(null);
  }, [setMenu]);

  const deleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    setMenu(null);
    if (selectedNode?.id === id) setSelectedNode(null);
  }, [setNodes, setEdges, selectedNode]);

  const deleteEdge = useCallback((id) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
    setMenu(null);
  }, [setEdges]);

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
    setMenu(null);
  }, []);

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    closeMenu();
  }, [closeMenu]);

  const updateNodeConfig = (key, value) => {
    if (!selectedNode) return;

    const applyUpdate = (currentConfig) => {
      if (key === 'full_config') return value;
      if (typeof key === 'object' && key !== null) return { ...currentConfig, ...key };
      return { ...currentConfig, [key]: value };
    };

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, data: { ...node.data, config: applyUpdate(node.data.config || {}) } };
        }
        return node;
      })
    );

    setSelectedNode((prev) => {
      if (!prev) return null;
      return { ...prev, data: { ...prev.data, config: applyUpdate(prev.data.config || {}) } };
    });
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

  const modifyWorkflow = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setGeneratedJsonResult(null);
    try {
      const { data } = await axios.post(`${API_URL}/ai/modify-workflow`, {
        currentWorkflow: { nodes, edges },
        prompt: aiPrompt
      });
      setGeneratedJsonResult(data);
      notify('success', 'Workflow modification suggested by AI.');
    } catch (error) {
      console.error('Failed to modify workflow:', error);
      notify('error', error.response?.data?.error || 'Failed to modify workflow.');
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
    setSelectedNode(null); // Clear selected node to hide property panel
    setAiPrompt('');
    notify('success', 'Workflow applied to canvas.', 'Success');
    setTimeout(() => setViewport({ x: 0, y: 0, zoom: 0.6 }), 100);
  };

  // Open the test input modal first — actual execution happens after user fills inputs
  const handleTestRun = () => {
    if (nodes.length === 0) return notify('info', 'Please add nodes to test your workflow.');
    setShowTestInputModal(true);
  };

  // Called by TestInputModal with the filled payload
  const executeTestRun = async (testPayload) => {
    setIsExecuting(true);

    // Reset node statuses
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, executionStatus: null, executionResult: null }
    })));

    try {
      const res = await axios.post(`${API_URL}/workflows/test/execute`, {
        nodes,
        edges,
        payload: testPayload
      });

      const { nodeLogs } = res.data;

      // SEQUENTIAL ANIMATION per node
      for (const log of nodeLogs) {
        setNodes(nds => nds.map(node =>
          node.id === log.nodeId
            ? { ...node, data: { ...node.data, executionStatus: 'loading' } }
            : node
        ));
        await new Promise(r => setTimeout(r, 200)); // Reduced from 600ms
        setNodes(nds => nds.map(node =>
          node.id === log.nodeId
            ? { ...node, data: { ...node.data, executionStatus: log.status, executionResult: log.result || log.error } }
            : node
        ));
        await new Promise(r => setTimeout(r, 100)); // Reduced from 200ms
      }

      if (res.data.status === 'failure') {
        notify('error', res.data.error, 'Workflow Execution Failed');
      } else {
        notify('success', 'All nodes executed successfully!', 'Success');
      }

      setExecutionResult(res.data);
      setShowExecutionPanel(true);

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
    const workflowId = workflow._id || workflow.id;

    // Check if already open
    const alreadyOpen = openWorkflows.find(wf => (wf._id || wf.id) === workflowId);

    if (alreadyOpen) {
      switchWorkflow(workflowId);
    } else {
      // Save current before opening new
      if (activeWorkflowId) {
        setOpenWorkflows(prev => {
          const updated = prev.map(wf => (wf._id || wf.id) === activeWorkflowId ? { ...wf, nodes, edges, name: workflowName } : wf);
          return [...updated, workflow];
        });
      } else {
        setOpenWorkflows([workflow]);
      }

      setNodes(workflow.nodes || []);
      setEdges(workflow.edges || []);
      setWorkflowName(workflow.name || '');
      setActiveWorkflowId(workflowId);
    }

    setShowHistoryModal(false);
    notify('info', `Opened workflow: ${workflow.name}`);
    setTimeout(() => setViewport({ x: 0, y: 0, zoom: 0.6 }), 100);
  };

  const deleteWorkflow = async (id) => {
    try {
      await axios.delete(`${API_URL}/workflows/${id}`);
      notify('success', 'Workflow deleted successfully!');
      fetchWorkflows();
      // Remove from tabs if open
      setOpenWorkflows(prev => prev.filter(wf => (wf._id || wf.id) !== id));
      if (activeWorkflowId === id) {
        setNodes([]);
        setEdges([]);
        setWorkflowName('');
        setActiveWorkflowId(null);
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      notify('error', 'Could not delete workflow.');
    }
  };

  const switchWorkflow = (targetId) => {
    if (targetId === activeWorkflowId) return;

    // Save current active workflow state into openWorkflows list
    const updatedOpenWorkflows = openWorkflows.map(wf => {
      const currentId = wf._id || wf.id;
      if (currentId === activeWorkflowId) {
        return { ...wf, nodes, edges, name: workflowName };
      }
      return wf;
    });

    const targetWorkflow = updatedOpenWorkflows.find(wf => (wf._id || wf.id) === targetId);

    if (targetWorkflow) {
      setOpenWorkflows(updatedOpenWorkflows);
      setNodes(targetWorkflow.nodes || []);
      setEdges(targetWorkflow.edges || []);
      setWorkflowName(targetWorkflow.name || '');
      setActiveWorkflowId(targetId);
      setTimeout(() => setViewport({ x: 0, y: 0, zoom: 0.6 }), 50);
    }
  };

  const closeWorkflow = (id) => {
    const remaining = openWorkflows.filter(wf => (wf._id || wf.id) !== id);
    setOpenWorkflows(remaining);

    if (activeWorkflowId === id) {
      if (remaining.length > 0) {
        const next = remaining[remaining.length - 1];
        const nextId = next._id || next.id;
        setNodes(next.nodes || []);
        setEdges(next.edges || []);
        setWorkflowName(next.name || '');
        setActiveWorkflowId(nextId);
      } else {
        setNodes([]);
        setEdges([]);
        setWorkflowName('');
        setActiveWorkflowId(null);
      }
    }
  };

  const createNewWorkflow = () => {
    const newId = `unsaved_${Date.now()}`;
    const newWf = {
      id: newId,
      name: 'Untitled Workflow',
      nodes: [],
      edges: []
    };

    // Save current before switching
    if (activeWorkflowId) {
      setOpenWorkflows(prev => {
        const updated = prev.map(wf => (wf._id || wf.id) === activeWorkflowId ? { ...wf, nodes, edges, name: workflowName } : wf);
        return [...updated, newWf];
      });
    } else {
      setOpenWorkflows([newWf]);
    }

    setNodes([]);
    setEdges([]);
    setWorkflowName('Untitled Workflow');
    setActiveWorkflowId(newId);
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
      // Update local state if it's the current tab
      setOpenWorkflows(prev => prev.map(wf =>
        (wf._id || wf.id) === activeWorkflowId ? { ...wf, name: workflowName, nodes, edges } : wf
      ));
      notify('success', 'Your workflow has been saved to the database.', 'Workflow Saved');
      fetchWorkflows(); // Refresh list to get the real MongoDB ID if it was unsaved
    } catch (error) {
      console.error('Failed to save workflow:', error);
      notify('error', 'Error saving workflow to database.');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-200 font-['Outfit'] overflow-hidden relative">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 relative bg-[radial-gradient(circle_at_50%_50%,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[size:24px_24px]" ref={reactFlowWrapper}>
        {/* Floating Top Header (Tabs) */}
        <div className="z-30">
          <WorkflowTabs
            openWorkflows={openWorkflows}
            activeWorkflowId={activeWorkflowId}
            onSwitch={switchWorkflow}
            onClose={closeWorkflow}
            onNew={createNewWorkflow}
          />
        </div>

        {/* Floating Action Controls (Right Side) */}
        <div className="z-[45]">
          <TopBar
            setShowSaveModal={setShowSaveModal}
            openHistoryModal={openHistoryModal}
            setShowAiModal={setShowAiModal}
            handleTestRun={handleTestRun}
            isExecuting={isExecuting}
            onLayout={onLayout}
            setIsSidebarOpen={setIsSidebarOpen}
            isSidebarOpen={isSidebarOpen}
            hasNodes={nodes.length > 0}
            isPropertiesOpen={!!selectedNode}
          />
        </div>

        {nodes.length === 0 && !isSidebarOpen && (
          <div className="absolute inset-0 flex items-center justify-center z-10 animate-[fadeIn_0.5s_ease] pointer-events-none">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="group flex flex-col items-center gap-4 bg-transparent border-none cursor-pointer hover:scale-105 transition-all active:scale-95 pointer-events-auto"
            >
              <div className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-slate-600 flex items-center justify-center bg-slate-900/30 group-hover:border-blue-500/50 group-hover:bg-slate-800/40 transition-colors">
                <Plus size={40} className="text-slate-500 group-hover:text-blue-400 transition-colors" strokeWidth={1.5} />
              </div>
              <span className="text-xl font-bold text-white tracking-tight drop-shadow-md">Add first step...</span>
            </button>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={handlePaneClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          fitView
          colorMode="dark"
        >
          <Background color="#30363d" gap={20} />
          <Controls />
        </ReactFlow>

        {menu && (
          <ContextMenu
            onClick={closeMenu}
            {...menu}
            deleteNode={deleteNode}
            deleteEdge={deleteEdge}
            setSelectedNode={setSelectedNode}
          />
        )}
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
        isGenerating={isGenerating} generateWorkflow={generateWorkflow} modifyWorkflow={modifyWorkflow}
        generatedJsonResult={generatedJsonResult} applyGeneratedWorkflow={applyGeneratedWorkflow} setGeneratedJsonResult={setGeneratedJsonResult}
        showSaveModal={showSaveModal} setShowSaveModal={setShowSaveModal} workflowName={workflowName} setWorkflowName={setWorkflowName} isSaving={isSaving} saveWorkflow={saveWorkflow}
        showHistoryModal={showHistoryModal} setShowHistoryModal={setShowHistoryModal} isLoadingHistory={isLoadingHistory} workflowHistory={workflowHistory} loadWorkflow={loadWorkflow} deleteWorkflow={deleteWorkflow}
      />

      <ExecutionPanel
        isOpen={showExecutionPanel}
        onClose={() => setShowExecutionPanel(false)}
        executionResult={executionResult}
        nodes={nodes}
        onPublish={() => setShowPublishModal(true)}
      />

      <TestInputModal
        isOpen={showTestInputModal}
        onClose={() => setShowTestInputModal(false)}
        onRun={executeTestRun}
        triggerNode={nodes.find(n => n.data?.isTrigger || n.data?.type?.toLowerCase().includes('trigger') || n.data?.type === 'app_event' || n.data?.type === 'form_submission' || n.data?.type === 'chat_message' || n.data?.type === 'other_ways')}
      />

      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        nodes={nodes}
        edges={edges}
        triggerNode={nodes.find(n => n.data?.isTrigger || n.data?.type?.toLowerCase().includes('trigger') || n.data?.type === 'app_event' || n.data?.type === 'form_submission' || n.data?.type === 'chat_message' || n.data?.type === 'other_ways')}
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
