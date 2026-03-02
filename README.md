# Flowz: Intelligent Automation Architecture

Flowz is a sophisticated workflow automation environment designed to bridge the gap between creative logic and functional execution. By integrating generative artificial intelligence with a performance-optimized drag-and-drop interface, Flowz empowers users to architect complex processes through a seamless, visual experience.

## Core Capabilities

- **AI-Native Workflow Synthesizer**: Leverage Google Gemini to transform natural language descriptions into fully functional logical structures.
- **Dynamic Logic Canvas**: An intuitive, high-performance interface for manual orchestration, powered by React Flow.
- **Cognitive Integration Nodes**: Embed proprietary intelligence directly into your flows using OpenAI or Gemini for real-time decision-making.
- **Enterprise-Grade Integrations**: Connect seamlessly with Webhooks, MongoDB, Gmail-compatible SMTP, GitHub Repository Push, and standard REST API endpoints.
- **Auto-Dynamic Layout Engine**: Maintain visual clarity in complex systems with Dagre-powered structural optimization.
- **Premium Design Philosophy**: A refined, dark-mode professional interface featuring glassmorphic elements and optimized micro-animations.

## Technical Foundation

The architecture is built on a modern, distributed stack designed for performance and extensibility.

### Frontend Architecture
- **Framework**: React 19 + Vite for rapid development and lightweight delivery.
- **Core Canvas**: React Flow (@xyflow/react) for robust graph management.
- **Design System**: Tailwind CSS 4 with custom glassmorphism utilities.
- **Structural Optimization**: Dagre engine for deterministic graph positioning.

### Backend Infrastructure
- **Server Environment**: Node.js + Express.
- **Persistence Layer**: MongoDB + Mongoose for schema-defined workflow storage.
- **Communication Protocols**: Nodemailer for SMTP delivery and standard Axios for HTTP-based interactions.
- **AI Integration**: Direct implementation of Google Generative AI and OpenAI SDKs.

## Implementation Guide

Follow these steps to establish a local development environment.

### Prerequisites
- Node.js (Version 18 or higher)
- MongoDB instance (Local or Atlas)
- Gmail App Password for SMTP functionality
- API keys for Google Gemini or OpenAI

### Installation Pipeline

1. **Repository Setup**
   ```bash
   git clone <repository-url>
   cd miniN8N
   ```

2. **Core Server Configuration**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/flowz
   OPEN_API_KEY=your_gemini_key
   OPENAI_API_KEY=your_openai_key
   ```
   *Note: SMTP configurations are managed per-node via the user interface.*

3. **Frontend Initialization**
   ```bash
   cd ../frontend
   npm install
   ```

### Operational Launch

Execute these commands in separate terminal sessions:

- **Start Backend**: `cd backend && npm run dev`
- **Start Frontend**: `cd frontend && npm run dev`

The application will be accessible at `http://localhost:5173`.

## Operational Workflow

1. **Synthesize**: Drag nodes into the environment to define your architectural logic.
2. **Execute Links**: Establish connections between trigger points and functional units.
3. **Configure**: Access the properties panel for each node to authenticate and parameterize your logic.
4. **Architectural Cleanup**: Utilize the Auto Arrange tool to maintain structural integrity.
5. **Validation**: Execute Test Runs to monitor real-time performance and data flow.
6. **Deployment**: Utilize generated Webhook URLs for external service triggers.

## License
MIT License. Developed with a focus on precision and agentic intelligence.

---
**Flowz** - *Architecture for the Intelligence Era.*

