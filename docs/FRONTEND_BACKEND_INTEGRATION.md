# Frontend-Backend Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ASPERA Frontend                          │
│                     (Next.js 14 + React)                       │
├─────────────────────────────────────────────────────────────────┤
│  Pages                      │  API Routes                      │
│  ├── / (Landing)            │  ├── /api/health                 │
│  ├── /dashboard             │  ├── /api/stats                  │
│  ├── /analyze               │  ├── /api/documents              │
│  ├── /documents             │  ├── /api/findings               │
│  └── /findings              │  ├── /api/executions             │
│                             │  └── /api/analyze                │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
├───────────────────────────┬─────────────────────────────────────┤
│      Google Gemini        │          Supabase                   │
│   (AI Agent Engine)       │       (PostgreSQL DB)               │
│                           │                                     │
│  ┌─────────────────────┐  │  ┌───────────────────────────────┐ │
│  │ Consistency Agent   │  │  │ documents                      │ │
│  │ Greenwashing Agent  │  │  │ findings                       │ │
│  │ Compliance Agent    │  │  │ agent_executions               │ │
│  │ Math Agent          │  │  │ system_logs                    │ │
│  │ Risk Analysis Agent │  │  └───────────────────────────────┘ │
│  └─────────────────────┘  │                                     │
└───────────────────────────┴─────────────────────────────────────┘
```

## Data Flow

### 1. Document Analysis Flow

```
User enters text → /api/analyze → Gemini API (5 agents) → Store in Supabase → Return results
```

**Detailed Steps:**
1. User navigates to `/analyze`
2. User pastes/enters document text
3. User selects agents to run
4. Frontend POSTs to `/api/analyze`
5. API creates document record in Supabase (optional)
6. API calls Gemini for each selected agent:
   - Consistency Agent: Checks for contradictions
   - Greenwashing Detector: Flags unsubstantiated claims
   - Compliance Agent: Verifies regulatory adherence
   - Math Agent: Validates calculations
   - Risk Analysis Agent: Synthesizes all findings
7. Each agent's findings stored in Supabase `findings` table
8. Execution metadata stored in `agent_executions` table
9. Results returned to frontend for display

### 2. Dashboard Data Flow

```
Dashboard loads → /api/stats → Supabase aggregations → Display
Dashboard loads → /api/findings?limit=10 → Recent findings → Display
```

### 3. Documents List Flow

```
Documents page → /api/documents → Supabase query → Display table
```

### 4. Findings List Flow

```
Findings page → /api/findings?filters → Supabase query → Display with filters
```

## API Route Details

### `/api/health` (GET)
Health check for all services.
```json
{
  "status": "healthy",
  "services": {
    "supabase": { "status": "healthy" },
    "gemini": { "status": "healthy", "model": "gemini-2.0-flash-exp" }
  }
}
```

### `/api/stats` (GET)
Dashboard statistics.
```json
{
  "documents": { "total": 10, "completed": 8, "processing": 1, "pending": 1 },
  "findings": { "total": 45, "critical": 5, "high": 12, "medium": 18, "low": 10 },
  "agents": [{ "name": "...", "status": "...", "totalRuns": 20 }],
  "performance": { "avgProcessingTime": 2.5, "totalExecutions": 100 }
}
```

### `/api/analyze` (POST)
Run AI analysis on document text.
```json
// Request
{
  "text": "Document content...",
  "document_id": "optional-uuid",
  "run_agents": ["consistency", "greenwashing", "compliance", "math", "risk"]
}

// Response
{
  "success": true,
  "results": [
    {
      "agent": "Consistency Agent",
      "findings": [...],
      "confidence": 0.85,
      "reasoning": "..."
    }
  ],
  "summary": { "total_findings": 5, "critical": 1, "high": 2, "medium": 1, "low": 1 }
}
```

### `/api/documents` (GET/POST)
Document CRUD operations.
```json
// GET Response
{ "documents": [...], "total": 10 }

// POST Request
{ "filename": "report.pdf", "file_type": "application/pdf", "file_size": 12345 }
```

### `/api/findings` (GET/POST)
Findings with filtering.
```json
// GET with params: ?document_id=xxx&severity=critical&limit=50
{ "findings": [...], "total": 45 }
```

## Environment Variables

### Frontend (`frontend/.env.local`)
```env
# Supabase (Public - used by client)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Gemini (Server-side only)
GEMINI_API_KEY=AIzaSy...
```

## Database Schema

See `infrastructure/supabase-schema.sql` for the complete schema.

### Tables:
- **documents** - Uploaded/analyzed documents
- **findings** - AI agent findings
- **agent_executions** - Execution history and performance
- **system_logs** - Application events

## Running the Application

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Then open http://localhost:3000

## Testing the Integration

1. **Check health**: GET http://localhost:3000/api/health
2. **View dashboard**: http://localhost:3000/dashboard
3. **Analyze document**: 
   - Go to http://localhost:3000/analyze
   - Click "Load sample document"
   - Click "Start Analysis"
   - Wait for all 5 agents to complete
4. **View findings**: http://localhost:3000/findings
5. **View documents**: http://localhost:3000/documents
