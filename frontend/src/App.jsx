import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useWorkflowSocket } from './hooks/useWorkflowSocket';
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
import CommandBar from './components/CommandBar';
import ActionDock from './components/ActionDock';
import AiGenerateModal from './components/AiGenerateModal';
import CustomNode from './components/CustomNode';
import Modals from './components/Modals';
import PropertiesSidebar from './components/PropertiesSidebar';
import Notification from './components/Notification';
import ContextMenu from './components/ContextMenu';
import ExecutionPanel from './components/ExecutionPanel';
import TestInputModal from './components/TestInputModal';
import PublishModal from './components/PublishModal';
import WorkflowTabs from './components/WorkflowTabs';
import N8NEdge from './components/N8NEdge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getId = (prefix = 'node') => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

const nodeTypes = {
  customTask: CustomNode,
};

const edgeTypes = {
  n8n: N8NEdge,
};

const BuilderCanvas = () => {
  const { fitView } = useReactFlow();
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

  // AI Debug Assistant State
  const [sidebarMode, setSidebarMode] = useState('nodes');
  const [debugMessages, setDebugMessages] = useState([]);
  const [isExplainingError, setIsExplainingError] = useState(false);

  // Clear "new" flag on debug messages when switching to chat mode
  useEffect(() => {
    if (sidebarMode === 'chat' && isSidebarOpen) {
      setDebugMessages(prev => prev.map(m => ({ ...m, isNew: false })));
    }
  }, [sidebarMode, isSidebarOpen]);

  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'n8n' }, eds)), []);

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
  const generateWorkflow = async (promptText) => {
    console.log('[Generate] button clicked');
    const finalPrompt = typeof promptText === 'string' ? promptText : aiPrompt;
    if (!finalPrompt) return;
    setIsGenerating(true);
    setGeneratedJsonResult(null);
    try {
      const { data } = await axios.post(`${API_URL}/ai/generate-workflow`, { prompt: finalPrompt });
      setGeneratedJsonResult(data);
      notify('success', 'Workflow architecture generated successfully.');
    } catch (error) {
      console.error('Failed to generate workflow:', error);
      notify('error', error.response?.data?.error || 'Failed to generate workflow.');
    } finally {
      setIsGenerating(false);
    }
  };

  const modifyWorkflow = async (promptText) => {
    const finalPrompt = typeof promptText === 'string' ? promptText : aiPrompt;
    if (!finalPrompt) return;
    setIsGenerating(true);
    setGeneratedJsonResult(null);
    try {
      const { data } = await axios.post(`${API_URL}/ai/modify-workflow`, {
        currentWorkflow: { nodes, edges },
        prompt: finalPrompt,
        selectedNodeId: selectedNode?.id
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

  const applyGeneratedWorkflow = (suggestedData = null) => {
    // If called via onClick, suggestedData is the event object. We need to ignore it.
    const isEvent = suggestedData && (suggestedData.nativeEvent || suggestedData.target);
    const data = (suggestedData && !isEvent) ? suggestedData : generatedJsonResult;

    if (!data) return;

    const generatedNodes = [];
    const generatedEdges = [];

    if (data.nodes && data.edges) {
      data.nodes.forEach((n, index) => {
        // Find if this node already exists to preserve some of its local config/data
        const existingNode = nodes.find(oldNode => oldNode.id === n.id);
        const existingConfig = existingNode?.data?.config || {};

        // Type Normalization Mapping (AI often gets creative with names)
        const typeAliases = {
          'telegram': 'app_event',
          'telegram_bot': 'app_event',
          'telegram_trigger': 'app_event',
          'gmail': 'send_email',
          'email': 'send_email',
          'db': 'save_to_database',
          'mongodb': 'save_to_database',
          'database': 'save_to_database',
          'rest_api': 'http_request',
          'api_call': 'http_request',
          'wait': 'delay',
          'condition': 'ifElse',
          'split': 'ifElse'
        };

        const rawType = n.type || n.data?.type || 'http_request';
        const actualType = typeAliases[rawType.toLowerCase()] || rawType;
        const actualLabel = n.data?.label || n.label || actualType;

        generatedNodes.push({
          id: n.id,
          type: 'customTask',
          position: n.position || (existingNode?.position) || { x: 300 + (index % 2 === 0 ? 0 : 250), y: 100 + (index * 120) },
          data: {
            label: actualLabel,
            type: actualType,
            isTrigger: actualType.toLowerCase().includes('trigger') || ['app_event', 'form_submission', 'chat_message'].includes(actualType),
            config: { ...existingConfig, ...(n.data?.config || n.config || {}) }
          }
        });
      });

      data.edges.forEach((e) => {
        const sourceNode = generatedNodes.find(n => n.id === e.source);
        const isIfElse = sourceNode && sourceNode.data && sourceNode.data.type === 'ifElse';
        let safeSourceHandle = e.sourceHandle;
        
        // If the source node is not an ifElse node, it does not have named handles.
        if (!isIfElse) {
            safeSourceHandle = undefined;
        } else if (safeSourceHandle !== 'true' && safeSourceHandle !== 'false') {
            // For ifElse nodes, ensure valid handles
            safeSourceHandle = 'true'; // default to true if malformed
        }

        generatedEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: safeSourceHandle || undefined
        });
      });
    } else {
      let yOffset = 100;

      if (data.trigger) {
        const tType = data.trigger.type || 'webhook_trigger';
        generatedNodes.push({
          id: 'trigger_1',
          type: 'customTask',
          position: { x: 300, y: yOffset },
          data: {
            label: 'Trigger',
            type: tType,
            isTrigger: true,
            config: data.trigger.config || {}
          }
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
    if (!suggestedData) notify('success', 'Workflow applied to canvas.', 'Success');
    setTimeout(() => {
      onLayout(generatedNodes, generatedEdges);
      setViewport({ x: 0, y: 0, zoom: 0.6 }, { duration: 800 });
    }, 200);
  };

  const onApplyFix = (suggestedFix) => {
    applyGeneratedWorkflow(suggestedFix);
    setDebugMessages(prev => [...prev, { role: 'assistant', text: 'Auto-fix applied successfully! You can try running the workflow again.' }]);
    notify('success', 'AI suggested fix applied to canvas.');
  };

  // Open the test input modal first — actual execution happens after user fills inputs
  const handleTestRun = () => {
    if (nodes.length === 0) return notify('info', 'Please add nodes to test your workflow.');
    setShowTestInputModal(true);
  };

  // ── Socket.IO real-time node animation ────────────────────────────────────
  // We use useMemo so the callbacks object is stable between re-renders
  const socketCallbacks = useMemo(() => ({
    onNodeStart: ({ nodeId }) => {
      setNodes(nds => nds.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, executionStatus: 'loading' } } : n
      ));
    },
    onNodeComplete: ({ nodeId, result }) => {
      setNodes(nds => nds.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, executionStatus: 'success', executionResult: result } } : n
      ));
    },
    onNodeError: ({ nodeId, error }) => {
      setNodes(nds => nds.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, executionStatus: 'failure', executionResult: error } } : n
      ));
    },
  }), []);

  useWorkflowSocket(activeWorkflowId, socketCallbacks);

  // Called by TestInputModal with the filled payload
  const executeTestRun = async (testPayload) => {
    setIsExecuting(true);

    // Reset node statuses
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, executionStatus: null, executionResult: null }
    })));

    try {
      // If we have a saved workflowId, use the persisted route so socket events fire
      const endpoint = activeWorkflowId && !activeWorkflowId.startsWith('unsaved_')
        ? `${API_URL}/workflows/${activeWorkflowId}/execute`
        : `${API_URL}/workflows/test/execute`;

      const res = await axios.post(endpoint, {
        nodes,
        edges,
        payload: testPayload
      });

      const { nodeLogs = [] } = res.data;

      // If no socket (unsaved workflow fallback) — apply states from response
      if (!activeWorkflowId || activeWorkflowId.startsWith('unsaved_')) {
        for (const log of nodeLogs) {
          setNodes(nds => nds.map(node =>
            node.id === log.nodeId
              ? { ...node, data: { ...node.data, executionStatus: log.status, executionResult: log.result || log.error } }
              : node
          ));
        }
      }

      if (res.data.status === 'failure') {
        notify('error', res.data.error, 'Workflow Execution Failed');

        // AUTO-DEBUG: Call Explain Error API
        setIsSidebarOpen(true);
        setSidebarMode('chat');
        setIsExplainingError(true);
        const failingNodeId = nodeLogs.find(l => l.status === 'failure')?.nodeId || 'Unknown Node';
        setDebugMessages([{ role: 'assistant', text: `⚠️ I've detected a failure in node "${failingNodeId}". Analyzing the cause...` }]);

        try {
          const debugRes = await axios.post(`${API_URL}/ai/explain-error`, {
            logs: nodeLogs,
            error: res.data.error,
            currentWorkflow: { nodes, edges }
          });

          const { explanation, cause, fix, suggestedFixWorkflow } = debugRes.data;

          setDebugMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              text: `Explanation: ${explanation}\n\nCause: ${cause}\n\nFix: ${fix}`,
              suggestedFix: suggestedFixWorkflow,
              isNew: true
            }
          ]);
        } catch (err) {
          console.error('AI Debugging failed:', err);
          setDebugMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error while trying to analyze the execution failure.' }]);
        } finally {
          setIsExplainingError(false);
        }

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

  const onLayout = useCallback((customNodes, customEdges) => {
    const isCustomNodesArray = Array.isArray(customNodes);
    const targetNodes = isCustomNodesArray ? customNodes : nodes;
    const targetEdges = isCustomNodesArray ? customEdges : edges;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 200 });

    const nodeWidth = 320;
    const nodeHeight = 200;

    targetNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    targetEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = targetNodes.map((node) => {
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

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user', text };
    setDebugMessages(prev => [...prev, userMsg]);

    setIsExplainingError(true);
    try {
      const lastError = executionResult?.status === 'failure' ? executionResult.error : null;
      const res = await axios.post(`${API_URL}/ai/chat-debug`, {
        message: text,
        history: debugMessages.slice(-5), // Send last 5 messages for context
        currentWorkflow: { nodes, edges },
        lastError
      });

      const { text: aiResponse, suggestedFixWorkflow } = res.data;

      setDebugMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: aiResponse,
          suggestedFix: suggestedFixWorkflow,
          isNew: true
        }
      ]);
    } catch (error) {
      console.error("AI Chat Debug failed:", error);
      setDebugMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble connecting to the AI brain right now." }]);
    } finally {
      setIsExplainingError(false);
    }
  };


  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-200 font-['Outfit'] overflow-hidden relative">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sidebarMode={sidebarMode}
        setSidebarMode={setSidebarMode}
        debugMessages={debugMessages}
        onSendMessage={handleSendMessage}
        onApplyFix={onApplyFix}
        isExplainingError={isExplainingError}
      />

      <div className="flex-1 relative canvas-wrapper" ref={reactFlowWrapper}>
        {/* Soft vignette overlay overlay */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          boxShadow: 'inset 0 0 150px rgba(7,9,15, 0.9), inset 0 0 60px rgba(7,9,15, 0.7)'
        }} />
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

        <CommandBar
          workflowName={workflowName}
          setWorkflowName={setWorkflowName}
          handleTestRun={handleTestRun}
          isExecuting={isExecuting}
          onStop={() => setIsExecuting(false)} // Need full abort implementation for real stop
          setShowSaveModal={setShowSaveModal}
          setShowAiModal={setShowAiModal}
          isSaved={activeWorkflowId && !activeWorkflowId.startsWith('unsaved_')}
        />

        <ActionDock
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarOpen={isSidebarOpen}
          onLayout={onLayout}
          onZoomFit={() => fitView({ duration: 600, padding: 0.2 })}
          openHistoryModal={openHistoryModal}
          isPropertiesOpen={!!selectedNode}
        />

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
          <Background color="rgba(0, 212, 255, 0.15)" gap={24} size={1.5} />
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
          key={selectedNode.id}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          updateNodeConfig={updateNodeConfig}
        />
      )}

      <AiGenerateModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onGenerate={generateWorkflow}
        onApply={applyGeneratedWorkflow}
        isLoading={isGenerating}
        aiResponse={generatedJsonResult ? 'Done' : null}
      />

      <Modals
        showAiModal={false} setShowAiModal={() => {}} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt}
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
        workflowId={activeWorkflowId}
        defaultName={workflowName}
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
