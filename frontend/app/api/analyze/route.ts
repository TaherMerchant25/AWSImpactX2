import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

interface Finding {
  severity: string;
  category: string;
  title: string;
  description: string;
  evidence: string[];
  recommendations: string[];
}

interface AgentResult {
  agent: string;
  findings: Finding[];
  confidence: number;
  reasoning: string;
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  console.log(`[GEMINI API CALL] Sending request...`);

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[GEMINI API ERROR] Status: ${response.status}, Body: ${errorText}`);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  console.log(`[GEMINI API RESPONSE] Length: ${responseText.length} chars`);
  
  return responseText;
}

function parseJsonResponse(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[JSON Parse Error]', e);
  }
  return null;
}

async function runConsistencyAgent(text: string): Promise<AgentResult> {
  const prompt = `You are a Consistency Agent analyzing documents for data inconsistencies.

Analyze this document and identify ANY inconsistencies, contradictions, or conflicting information:

"""
${text.substring(0, 8000)}
"""

Look for:
- Numbers that don't match (e.g., revenue stated as $5M in one place and $3M elsewhere)
- Contradictory statements
- Timeline inconsistencies
- Percentages that don't add up
- Claims that conflict with each other

You MUST provide findings if there are ANY inconsistencies. Be thorough.

Return JSON:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "consistency",
      "title": "brief title",
      "description": "detailed explanation of the inconsistency",
      "evidence": ["quote 1", "conflicting quote 2"],
      "recommendations": ["how to fix"]
    }
  ],
  "confidence": 0.85,
  "reasoning": "summary"
}`;

  console.log('[Consistency Agent] Calling Gemini...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    console.log(`[Consistency Agent] Found ${parsed.findings?.length || 0} findings`);
    return {
      agent: 'Consistency Agent',
      findings: parsed.findings || [],
      confidence: parsed.confidence || 0.85,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Consistency Agent',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse response'
  };
}

async function runGreenwashingAgent(text: string): Promise<AgentResult> {
  const prompt = `You are a Greenwashing Detector analyzing documents for unsubstantiated environmental claims.

Analyze this document for greenwashing - misleading or vague environmental/sustainability claims:

"""
${text.substring(0, 8000)}
"""

Look for:
- Vague terms like "eco-friendly", "green", "sustainable" without specific data
- Claims of being "carbon neutral" or "net zero" without certification proof
- Environmental claims without third-party verification
- Selective disclosure (only showing positive environmental aspects)
- Claims without measurable metrics or timelines

You MUST identify any environmental claims that lack proper substantiation. Be thorough.

Return JSON:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "esg",
      "title": "brief title",
      "description": "why this claim is problematic",
      "evidence": ["the exact claim from the document"],
      "recommendations": ["what substantiation is needed"]
    }
  ],
  "confidence": 0.85,
  "reasoning": "summary of ESG claims found"
}`;

  console.log('[Greenwashing Agent] Calling Gemini...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    console.log(`[Greenwashing Agent] Found ${parsed.findings?.length || 0} findings`);
    return {
      agent: 'Greenwashing Detector',
      findings: parsed.findings || [],
      confidence: parsed.confidence || 0.85,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Greenwashing Detector',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse response'
  };
}

async function runComplianceAgent(text: string): Promise<AgentResult> {
  const prompt = `You are a Compliance Agent checking documents for regulatory and disclosure issues.

Analyze this document for compliance concerns:

"""
${text.substring(0, 8000)}
"""

Look for:
- Missing risk disclosures that should be present
- Incomplete regulatory statements
- Missing required disclaimers
- Vague compliance statements without specifics
- Potential conflicts of interest not disclosed
- Missing data protection/privacy statements if personal data is mentioned
- Incomplete financial disclosures

You MUST identify compliance gaps and missing disclosures. Be thorough.

Return JSON:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "compliance",
      "title": "brief title",
      "description": "detailed explanation of the compliance issue",
      "evidence": ["relevant quote or missing element"],
      "recommendations": ["specific action to address"]
    }
  ],
  "confidence": 0.85,
  "reasoning": "summary of compliance review"
}`;

  console.log('[Compliance Agent] Calling Gemini...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    console.log(`[Compliance Agent] Found ${parsed.findings?.length || 0} findings`);
    return {
      agent: 'Compliance Agent',
      findings: parsed.findings || [],
      confidence: parsed.confidence || 0.85,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Compliance Agent',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse response'
  };
}

async function runMathAgent(text: string): Promise<AgentResult> {
  const prompt = `You are a Math Agent validating financial calculations and numerical data.

Analyze this document for mathematical and financial issues:

"""
${text.substring(0, 8000)}
"""

Look for:
- Calculation errors (totals that don't add up)
- Percentage errors
- Growth rate inconsistencies
- Revenue/profit figures that conflict
- Projections that don't align with stated data
- Financial ratios that seem incorrect

You MUST identify any numerical discrepancies or calculation issues. Be thorough.

Return JSON:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "financial",
      "title": "brief title",
      "description": "detailed explanation with the actual numbers",
      "evidence": ["number 1", "number 2", "the discrepancy"],
      "recommendations": ["how to correct"]
    }
  ],
  "confidence": 0.90,
  "reasoning": "summary of calculations checked"
}`;

  console.log('[Math Agent] Calling Gemini...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    console.log(`[Math Agent] Found ${parsed.findings?.length || 0} findings`);
    return {
      agent: 'Math Agent',
      findings: parsed.findings || [],
      confidence: parsed.confidence || 0.90,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Math Agent',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse response'
  };
}

async function runRiskAgent(text: string, previousFindings: Finding[]): Promise<AgentResult> {
  const previousContext = previousFindings.length > 0 
    ? `\n\nPrevious findings from other agents:\n${JSON.stringify(previousFindings.slice(0, 5), null, 2)}`
    : '';

  const prompt = `You are a Risk Analysis Agent performing comprehensive due diligence.

Analyze this document for business and investment risks:

"""
${text.substring(0, 7000)}
"""
${previousContext}

Identify risks across these categories:
- Financial Risk (cash flow, debt, profitability concerns)
- Operational Risk (execution, capacity, supply chain)
- Market Risk (competition, market conditions)
- Compliance Risk (regulatory issues)
- Strategic Risk (business model, competitive position)
- Reputational Risk (brand, public perception)

You MUST identify significant risks. Consider both explicit risks mentioned and implicit risks from the content. Be thorough.

Return JSON:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "the risk category",
      "title": "brief title",
      "description": "detailed risk explanation",
      "evidence": ["supporting quote or data"],
      "recommendations": ["mitigation action"]
    }
  ],
  "confidence": 0.85,
  "reasoning": "overall risk assessment summary",
  "overall_risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendation": "GO|NO_GO|CONDITIONAL"
}`;

  console.log('[Risk Agent] Calling Gemini...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    console.log(`[Risk Agent] Found ${parsed.findings?.length || 0} findings`);
    return {
      agent: 'Risk Analysis Agent',
      findings: parsed.findings || [],
      confidence: parsed.confidence || 0.85,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Risk Analysis Agent',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse response'
  };
}

// POST - Analyze document with all agents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_id, text, run_agents } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured. Add it to frontend/.env.local' }, { status: 500 });
    }

    console.log(`[Analysis] Starting - Text length: ${text.length} chars`);

    const agents = run_agents || ['consistency', 'greenwashing', 'compliance', 'math', 'risk'];
    const results: AgentResult[] = [];
    const allFindings: Finding[] = [];

    for (const agent of agents) {
      let result: AgentResult;
      const startTime = Date.now();

      try {
        switch (agent) {
          case 'consistency':
            result = await runConsistencyAgent(text);
            break;
          case 'greenwashing':
            result = await runGreenwashingAgent(text);
            break;
          case 'compliance':
            result = await runComplianceAgent(text);
            break;
          case 'math':
            result = await runMathAgent(text);
            break;
          case 'risk':
            result = await runRiskAgent(text, allFindings);
            break;
          default:
            continue;
        }
      } catch (agentError: any) {
        console.error(`[${agent}] Error:`, agentError.message);
        result = {
          agent: agent,
          findings: [],
          confidence: 0,
          reasoning: `Error: ${agentError.message}`
        };
      }

      const executionTime = Date.now() - startTime;
      console.log(`[${agent}] Done in ${executionTime}ms - ${result.findings.length} findings`);
      
      results.push(result);
      allFindings.push(...result.findings);

      // Store to database if configured
      if (document_id && supabase) {
        try {
          await supabase.from('agent_executions').insert({
            document_id,
            agent_name: result.agent,
            status: 'completed',
            execution_time: executionTime / 1000,
            findings_count: result.findings.length,
            confidence_score: result.confidence
          });

          for (const finding of result.findings) {
            await supabase.from('findings').insert({
              document_id,
              agent_type: result.agent,
              severity: finding.severity?.toLowerCase() || 'medium',
              category: finding.category || 'General',
              title: finding.title || 'Finding',
              description: finding.description || '',
              evidence: finding.evidence || [],
              recommendations: finding.recommendations || [],
              confidence_score: result.confidence
            });
          }
        } catch (dbError: any) {
          console.warn(`[${agent}] DB error:`, dbError.message);
        }
      }
    }

    if (document_id && supabase) {
      try {
        await supabase
          .from('documents')
          .update({ processing_status: 'completed' })
          .eq('id', document_id);
      } catch (e) {}
    }

    console.log(`[Analysis] Complete - ${allFindings.length} total findings`);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total_findings: allFindings.length,
        critical: allFindings.filter(f => f.severity === 'CRITICAL').length,
        high: allFindings.filter(f => f.severity === 'HIGH').length,
        medium: allFindings.filter(f => f.severity === 'MEDIUM').length,
        low: allFindings.filter(f => f.severity === 'LOW').length,
        agents_executed: results.length
      }
    });

  } catch (error: any) {
    console.error('[Analysis] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
