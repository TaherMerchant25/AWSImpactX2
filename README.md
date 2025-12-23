# ASPERA: AI-Powered Due Diligence Platform

**Intelligent Document Processing with Gemini AI + Supabase**

> 🎉 **Now Running on Google Gemini 2.0 Flash** with **97% cost savings** vs AWS Bedrock!

## Work Flow

<img width="1752" height="989" alt="image" src="https://github.com/user-attachments/assets/bc262e22-4217-48ba-b659-07b962d477b9" />


## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- Python 3.13+ ([Download](https://www.python.org/))
- Google Gemini API Key ([Get One](https://makersuite.google.com/app/apikey))
- Supabase Account ([Sign Up](https://supabase.com/))

### 1. Setup Environment

```powershell
# Clone and navigate to the project
cd d:\Downloads\Code_Autonomous\AWS

# Copy environment template
copy .env.example .env

# Add your credentials to .env:
# GEMINI_API_KEY=your_api_key
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_anon_key
```

### 2. Setup Database

1. Go to your Supabase project SQL Editor
2. Run the schema file: `infrastructure/supabase-schema.sql`

### 3. Start the Frontend

```powershell
cd frontend
npm install
npm run dev
```

Then open: **http://localhost:3000**

## 📱 Application Pages

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/` | Hero page with platform overview |
| Dashboard | `/dashboard` | Real-time stats, agent status, findings |
| Analyze | `/analyze` | Upload/paste documents for AI analysis |
| Documents | `/documents` | View all processed documents |
| Findings | `/findings` | Browse all findings with filters |

## 🔌 API Routes

The frontend includes built-in API routes that call Gemini directly:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Dashboard statistics |
| `/api/documents` | GET/POST | Document CRUD |
| `/api/findings` | GET/POST | Finding CRUD with filters |
| `/api/executions` | GET/POST | Agent execution logs |
| `/api/analyze` | POST | Run AI analysis on document |

📖 **Full documentation:** 
- [STARTUP.md](STARTUP.md) - Complete startup guide
- [docs/GEMINI_SETUP.md](docs/GEMINI_SETUP.md) - Gemini API configuration
- [docs/OAUTH_SETUP.md](docs/OAUTH_SETUP.md) - Authentication setup
- [docs/MIGRATION_SUMMARY.md](docs/MIGRATION_SUMMARY.md) - Migration details

---

## Overview
ASPERA is a generative AI platform powered by **Google Gemini 2.0 Flash** and **Supabase** that ingests, digitizes, and rigorously analyzes complex contracts and proposals before human analyst review. The system accelerates capital deployment into high-impact sectors by automating technical and financial due diligence.

## 🏗️ Modern Architecture

### Frontend Layer
- **Next.js 14** - React framework with TypeScript
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful component library
- **Direct API Routes** - No separate backend needed

### Backend Layer (AI Agents)
- **Google Gemini 2.0 Flash Exp** - Fast, cost-effective AI
- **5 Specialized Agents**:
  - Consistency Agent
  - Greenwashing Detector
  - Compliance Agent
  - Math Agent
  - Risk Analysis Agent

### Data Layer
- **Supabase PostgreSQL** - Modern database with real-time features
- **Row Level Security** - Fine-grained access control
- **4 Core Tables**: Documents, Findings, Agent Executions, System Logs

### Legacy Components (Optional)
- **Amazon Textract** - OCR and table extraction
- **OpenSearch** - Vector search (can be replaced)
- **S3** - Document storage (can be replaced)

## 🎯 Key Features

✨ **AI-Powered Analysis**
- Multi-agent orchestration with Chain of Thought reasoning
- Consistency checking across documents
- Greenwashing detection for environmental claims
- Regulatory compliance verification
- Financial calculation validation
- Comprehensive risk assessment

🔐 **Flexible Authentication (Optional)**
- OAuth 2.0 with multiple providers
- Google, GitHub, Microsoft sign-in
- Session management with Supabase
- Skip auth for development mode

📊 **Modern Dashboard**
- Real-time agent monitoring
- Risk heatmap visualization
- Finding categorization
- Document tracking

💰 **Cost Effective**
- 97% cheaper than AWS Bedrock
- $0.075 per 1M input tokens
- $0.30 per 1M output tokens

## Architecture

### 1. Document Ingestion
- **Upload Interface**: Modern drag-and-drop UI
- **Storage**: Supabase Storage or S3
- **Processing**: Text extraction and structuring
- **Output**: Structured JSON data

### 2. AI Agent Layer
- **Gemini 2.0 Flash**: Fast, accurate LLM
- **Multi-Agent System**: 5 specialized agents
- **Orchestration**: Cognitive Risk Engine
- **Output**: Structured findings and recommendations
- **Kiro Spec-Driven**: Specification-based ingestion and processing

### 3. Cognitive Risk Engine & MCP Hub
- **AI Agent Orchestra**: Lambda + Step Functions coordination
- **Amazon Bedrock**: Foundation models with Chain of Thought
- **MCP Hub**: Universal tool access protocol for agent coordination
- **Data Access**: Application databases and external APIs

### 4. User Experience Layer
- **Specialized Agents**: Consistency, Greenwashing Detection, Compliance
- **React Dashboard**: Visual interface for results
- **AWS Amplify**: Frontend hosting
- **Amazon Translate**: Multi-language support

## Components

### Agents
- **Consistency Agent**: Validates data integrity across documents
- **Greenwashing Detector**: Identifies unsubstantiated environmental claims
- **Compliance Check Agent**: Ensures regulatory adherence
- **Math Agent**: Financial calculations and modeling
- **Risk Analysis Agent**: Comprehensive risk assessment

### MCP Hub
Universal tool access layer providing:
- Database connectivity
- External API integration
- LambdaStep function orchestration
- Context management across agents

## Output
- Risk heatmap visualization
- Go/No-Go investment recommendation
- Comprehensive due diligence report

## Technology Stack
- **AWS Lambda**: Serverless compute
- **AWS Step Functions**: Workflow orchestration
- **Amazon Bedrock**: LLM foundation
- **Amazon OpenSearch**: Vector storage
- **Amazon S3**: Document storage
- **Amazon Textract**: Document processing
- **Amazon EventBridge**: Event routing
- **AWS Amplify**: Frontend hosting

## Getting Started

### Prerequisites
```bash
- AWS Account with appropriate permissions
- Python 3.11+
- Node.js 18+
- AWS CLI configured
- AWS CDK or SAM CLI
```

### Installation
```bash
pip install -r requirements.txt
npm install
```

### Deployment
```bash
# Deploy infrastructure
cdk deploy --all

# Or using SAM
sam build
sam deploy --guided
```

## Project Structure
```
├── src/
│   ├── agents/              # Multi-agent implementations
│   ├── ingestion/           # Document ingestion layer
│   ├── knowledge/           # RAG and knowledge graph
│   ├── mcp_hub/             # Model Context Protocol hub
│   ├── orchestration/       # Workflow coordination
│   └── utils/               # Shared utilities
├── infrastructure/          # AWS CDK/SAM templates
├── frontend/               # React dashboard
├── tests/                  # Unit and integration tests
└── config/                 # Configuration files
```

## License
MIT
