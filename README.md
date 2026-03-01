#  Flowz

**Flowz** is a powerful, premium workflow automation platform that allows you to build, visualize, and execute complex logic chains through an intuitive drag-and-drop interface. Inspired by tools like n8n, Flowz brings AI-powered intelligence and seamless integrations to your automation tasks.

![Flowz Interface](https://raw.githubusercontent.com/lucide-react/lucide/main/icons/zap.svg)

---

## Key Features

- **Intuitive Workflow Builder**: Create automation flows using a high-performance drag-and-drop canvas powered by React Flow.
- **AI-Powered Generation**: Simply describe your automation in plain English, and Flowz will architect the entire workflow for you using Google Gemini.
- **Smart AI Nodes**: Integrate **Google Gemini** or **OpenAI** directly into your flows to summarize data, generate content, or make decisions.
- **Robust Integration Nodes**:
  - **Webhook Triggers**: Receive data from any external service.
  - **Send Email**: Pro-grade SMTP integration (optimized for Gmail App Passwords).
  - **Database Integration**: Save results to internal or external MongoDB collections.
  - **HTTP Requests**: Connect to any REST API.
  - **Logic & Flow**: Includes Delay nodes and coming soon Conditional branching.
- **Auto-Layout**: Instantly organize messy workflows with a single click using the integrated Dagre engine.
- **Premium Aesthetics**: A sleek, dark-mode professional interface with glassmorphism, micro-animations, and responsive design.

---

##  Tech Stack

### Frontend
- **React 19** & **Vite**
- **React Flow (@xyflow/react)** for the canvas.
- **Tailwind CSS 4** for premium styling.
- **Lucide React** for iconography.
- **Dagre** for graph auto-layout.

### Backend
- **Node.js** & **Express**
- **MongoDB** with **Mongoose** for workflow storage.
- **Nodemailer** for robust email delivery.
- **Google Generative AI** & **OpenAI SDK** for intelligence.

---

##  Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Gmail App Password (for email features)
- Google Gemini or OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd miniN8N
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` folder:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/flowz
   OPEN_API_KEY=your_gemini_key
   OPENAI_API_KEY=your_openai_key
   ```
   *Note: SMTP settings are configured per-node in the UI.*

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running Locally

- **Start Backend**: `cd backend && npm run dev`
- **Start Frontend**: `cd frontend && npm run dev`

Access the application at `http://localhost:5173`

---

##  How to Use

1. **Create**: Drag nodes from the left sidebar onto the canvas.
2. **Connect**: Link the dots between nodes to define the execution order.
3. **Configure**: Click a node to open the **Properties Sidebar** and enter your settings (API keys, SMTP details, prompts).
4. **Arrange**: Use the **"Auto Arrange"** button in the top bar to clean up your canvas.
5. **Test**: Hit **"Test Run"** to see your workflow execute in real-time with sequential animations.
6. **Deploy**: Use the Webhook URL to trigger your flow from external apps.

---

##  License
MIT License - Developed for Advanced Agentic Coding.

---

**Flowz** - *Automate with Intelligence.*
