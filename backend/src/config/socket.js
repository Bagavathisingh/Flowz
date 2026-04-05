import { Server as SocketIOServer } from 'socket.io';

let io;

export const initSocketParams = (httpServer) => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(o => o.trim()),
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`[SOCKET] User connected: ${socket.id}`);
        
        socket.on('join_workflow', (workflowId) => {
            if (workflowId) {
                socket.join(`workflow_${workflowId}`);
                console.log(`[SOCKET] Socket ${socket.id} joined workflow_${workflowId}`);
            }
        });
        
        socket.on('disconnect', () => {
            console.log(`[SOCKET] User disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        console.warn('Socket.io is not initialized yet');
    }
    return io;
};
