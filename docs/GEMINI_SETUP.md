# 🤖 Gemini API Setup Guide

Guide to configure Google Gemini API for ASPERA AI agents.

## 🎯 Quick Setup (5 minutes)

### Step 1: Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Choose **"Create API key in new project"** or select existing project
5. Copy the generated API key

### Step 2: Add API Key to Environment

1. Open the `.env` file in the project root:
   ```bash
   GEMINI_API_KEY=your-api-key-here
   ```

2. Replace `your-api-key-here` with your actual API key:
   ```bash
   GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvwxyz
   ```

### Step 3: Install Dependencies

```powershell
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install Gemini SDK
pip install google-generativeai
```

### Step 4: Verify Setup

Create a test file to verify Gemini is working:

```python
# test_gemini.py
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))

# Create model
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Test generation
response = model.generate_content("Say hello to ASPERA!")
print(response.text)
```

Run the test:
```powershell
python test_gemini.py
```

Expected output:
```
Hello, ASPERA! I'm ready to assist you with AI-powered due diligence.
```

## 🔧 How It Works

### Model Configuration

ASPERA uses **Gemini 2.0 Flash (Experimental)** for:
- Fast inference times
- Cost-effective analysis
- High-quality reasoning
- Extended context window (1M tokens)

### Agent Integration

Each AI agent now uses Gemini:

```python
from src.agents.consistency_agent import ConsistencyAgent

# Agent automatically uses Gemini
agent = ConsistencyAgent(mcp_hub)
result = agent.analyze(document_data, context)
```

### Configuration Options

You can customize the model in the code:

```python
# In base_agent.py or cognitive_risk_engine.py
self.model = genai.GenerativeModel(
    'gemini-2.0-flash-exp',  # Model name
    generation_config=genai.GenerationConfig(
        temperature=0.1,      # Lower = more deterministic
        max_output_tokens=4096,
        top_p=0.95,
        top_k=40
    )
)
```

### Available Models

You can switch to other Gemini models:

| Model | Best For | Context | Speed |
|-------|----------|---------|-------|
| `gemini-2.0-flash-exp` | General use, fast | 1M tokens | Very Fast |
| `gemini-1.5-pro` | Complex reasoning | 2M tokens | Fast |
| `gemini-1.5-flash` | Quick tasks | 1M tokens | Fastest |

## 🎨 Updated Architecture

### Before (AWS Bedrock)
```
Document → Agents (Claude on Bedrock) → DynamoDB → Report
```

### After (Gemini + Supabase)
```
Document → Agents (Gemini API) → Supabase → Report
```

### Key Changes

1. **AI Provider**: AWS Bedrock → Google Gemini
2. **Database**: DynamoDB → Supabase PostgreSQL
3. **Storage**: S3 (unchanged, optional)
4. **Agent Engine**: Same orchestration, different LLM

## 📊 Agent Workflows

### 1. Consistency Agent
Uses Gemini to detect data inconsistencies across documents.

### 2. Greenwashing Detector
Analyzes environmental claims for substantiation.

### 3. Compliance Agent
Verifies regulatory compliance using Gemini's reasoning.

### 4. Math Agent
Validates calculations and financial metrics.

### 5. Risk Analysis Agent
Synthesizes all findings into risk assessment.

## 🔒 Security Best Practices

### API Key Protection

**✅ DO:**
- Store API key in `.env` file (already gitignored)
- Use environment variables
- Rotate keys regularly
- Restrict API key usage in Google Cloud Console

**❌ DON'T:**
- Commit API keys to Git
- Share keys in code or logs
- Use same key for dev and prod
- Expose keys in frontend code

### Rate Limiting

Gemini API has rate limits:
- Free tier: 60 requests/minute
- Paid tier: Higher limits available

Configure retry logic:
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def invoke_llm(self, prompt):
    return self.model.generate_content(prompt)
```

## 💰 Cost Optimization

### Pricing (Gemini 2.0 Flash Exp)

- **Input**: $0.075 per 1M tokens (prompt)
- **Output**: $0.30 per 1M tokens (completion)

### Cost Saving Tips

1. **Use Caching** (when available):
   ```python
   # Cache common prompts
   cached_content = genai.caching.CachedContent.create(
       model='gemini-2.0-flash-exp',
       content='Your frequently used context...'
   )
   ```

2. **Optimize Prompts**:
   - Be concise and clear
   - Avoid repetitive context
   - Use structured outputs

3. **Batch Requests**:
   - Combine multiple small analyses
   - Reduce API calls

4. **Monitor Usage**:
   - Check Google Cloud Console
   - Set up billing alerts

## 🚀 Testing

### Test Individual Agent

```python
from src.agents.consistency_agent import ConsistencyAgent
from src.mcp_hub.mcp_hub import MCPHub

# Initialize
mcp_hub = MCPHub()
agent = ConsistencyAgent(mcp_hub)

# Test data
document_data = {
    'text_content': [
        {'text': 'Revenue for 2023 was $1M'},
        {'text': 'Total revenue reached $2M in 2023'}
    ]
}

# Analyze
result = agent.analyze(document_data, {})
print(result)
```

### Test Cognitive Engine

```python
from src.mcp_hub.cognitive_risk_engine import CognitiveRiskEngine
from src.mcp_hub.mcp_hub import MCPHub

engine = CognitiveRiskEngine(MCPHub())

# Full orchestration
result = engine.orchestrate_analysis(document_data, {})
print(result['synthesis'])
```

### Integration Test

```bash
# Run full pipeline test
python test_pipeline.py
```

## 🐛 Troubleshooting

### "API Key not found" Error

**Problem**: Gemini can't find your API key

**Solution**:
```python
# Verify .env file
import os
from dotenv import load_dotenv

load_dotenv()
print(os.environ.get('GEMINI_API_KEY'))  # Should show your key
```

### "Invalid API Key" Error

**Problem**: API key is incorrect or expired

**Solution**:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Generate a new API key
3. Update `.env` file

### "Rate Limit Exceeded" Error

**Problem**: Too many requests

**Solution**:
```python
import time

# Add delay between requests
time.sleep(1)  # Wait 1 second

# Or use exponential backoff (already in base_agent.py)
```

### "Model Not Found" Error

**Problem**: Model name is incorrect

**Solution**:
```python
# Use correct model name
model = genai.GenerativeModel('gemini-2.0-flash-exp')  # ✅
# NOT: genai.GenerativeModel('gemini-2.0')  # ❌
```

### Connection Timeout

**Problem**: Network issues or slow response

**Solution**:
```python
# Increase timeout
import httpx

model = genai.GenerativeModel(
    'gemini-2.0-flash-exp',
    request_options={'timeout': 60.0}  # 60 seconds
)
```

## 📈 Monitoring

### Log Gemini Usage

Already implemented in base_agent.py:
```python
logger.info(f"Invoking Gemini for {self.agent_name}")
# ... API call ...
logger.info(f"Gemini response received")
```

### Track Costs

Add to your code:
```python
# Estimate token usage
input_tokens = len(prompt.split()) * 1.3  # Rough estimate
output_tokens = len(response.text.split()) * 1.3

cost = (input_tokens / 1_000_000 * 0.075) + (output_tokens / 1_000_000 * 0.30)
logger.info(f"Estimated cost: ${cost:.4f}")
```

### View API Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Dashboard**
4. View **Gemini API** usage metrics

## ✅ Verification Checklist

- [ ] Gemini API key obtained from Google AI Studio
- [ ] API key added to `.env` file
- [ ] `google-generativeai` package installed
- [ ] Test script runs successfully
- [ ] All 5 agents updated to use Gemini
- [ ] Cognitive engine using Gemini for synthesis
- [ ] Supabase configured for data storage
- [ ] Error handling and logging in place
- [ ] Rate limiting configured

## 🎯 Next Steps

After Gemini is working:
1. Run full pipeline test with sample document
2. Monitor token usage and costs
3. Optimize prompts for better results
4. Set up billing alerts in Google Cloud
5. Consider upgrading to paid tier for production

---

**Your AI agents are now powered by Google Gemini!** 🚀

All agents use Gemini 2.0 Flash for fast, cost-effective analysis while storing results in Supabase.
