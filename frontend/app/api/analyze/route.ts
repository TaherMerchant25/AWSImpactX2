import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  console.log(`[GEMINI API CALL] Sending request to Gemini...`);
  console.log(`[GEMINI API CALL] Prompt length: ${prompt.length} chars`);

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[GEMINI API ERROR] Status: ${response.status}, Body: ${errorText}`);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  console.log(`[GEMINI API RESPONSE] Response length: ${responseText.length} chars`);
  console.log(`[GEMINI API RESPONSE] Preview: ${responseText.substring(0, 200)}...`);
  
  return responseText;
}

function parseJsonResponse(response: string): any {
  try {
    // Find JSON in response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Error parsing JSON response:', e);
  }
  return null;
}

function hasRelevantContent(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword));
}

async function runConsistencyAgent(text: string): Promise<AgentResult | null> {
  // Check if document has relevant content
  const hasNumbers = /\d/.test(text);
  const hasSubstantialContent = text.split(/\s+/).length > 50;
  
  if (!hasNumbers && !hasSubstantialContent) {
    console.log('[Consistency Agent] Skipping - no relevant content');
    return null;
  }

  const prompt = `You are an expert data analyst checking for internal consistency in documents.

CRITICAL INSTRUCTIONS:
1. ONLY report inconsistencies that are ACTUALLY present in the document below
2. DO NOT generate generic or hypothetical findings
3. Each finding must reference SPECIFIC contradictions or mismatches you found
4. If the document is internally consistent, return an empty findings array
5. DO NOT make up issues - only report what you actually find

Document to analyze:
---
${text.substring(0, 6000)}
---

Analyze for:
1. Contradictory statements (different values for the same metric)
2. Numerical inconsistencies (totals that don't add up)
3. Date/timeline conflicts
4. Conflicting claims or assertions

For each SPECIFIC inconsistency found, provide:
- title: A specific, descriptive title
- description: Detailed explanation with SPECIFIC references to the conflicting data
- severity: "CRITICAL", "HIGH", or "MEDIUM"
- evidence: The exact conflicting values or statements from the document
- recommendations: How to resolve the inconsistency

Respond ONLY in this JSON format:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "consistency",
      "title": "specific title",
      "description": "detailed description with specific references",
      "evidence": ["exact quote 1", "conflicting quote 2"],
      "recommendations": ["how to fix"]
    }
  ],
  "confidence": 0.85,
  "reasoning": "summary of what was checked"
}

If NO inconsistencies are found, respond with:
{
  "findings": [],
  "confidence": 0.95,
  "reasoning": "Document is internally consistent - no contradictions found"
}`;

  console.log('[Consistency Agent] Calling Gemini API...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    const findings = (parsed.findings || []).filter((f: any) => 
      f.description && f.description.length > 20
    );
    console.log(`[Consistency Agent] Found ${findings.length} valid findings`);
    return {
      agent: 'Consistency Agent',
      findings,
      confidence: parsed.confidence || 0.85,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Consistency Agent',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse Gemini response'
  };
}

async function runGreenwashingAgent(text: string): Promise<AgentResult | null> {
  // Check if document has ESG/environmental content
  const esgKeywords = [
    'carbon', 'sustainable', 'green', 'environmental', 'eco', 'climate',
    'renewable', 'emissions', 'net zero', 'biodegradable', 'recyclable', 'esg'
  ];
  
  if (!hasRelevantContent(text, esgKeywords)) {
    console.log('[Greenwashing Agent] Skipping - no ESG content found');
    return null;
  }

  const prompt = `You are an expert ESG analyst specializing in detecting greenwashing - misleading or unsubstantiated environmental claims.

CRITICAL INSTRUCTIONS:
1. ONLY report greenwashing issues that are ACTUALLY present in the document below
2. DO NOT generate generic or hypothetical findings
3. Each finding must reference a SPECIFIC claim from the document that lacks evidence
4. If all environmental claims are properly substantiated, return an empty findings array
5. DO NOT make up issues - only report what you actually find

Document to analyze:
---
${text.substring(0, 6000)}
---

Greenwashing indicators to look for:
1. Vague claims without specific metrics (e.g., "eco-friendly" without data)
2. Claims without third-party verification or certification
3. Selective disclosure (highlighting positives, hiding negatives)
4. Hidden trade-offs
5. False or misleading claims

For each SPECIFIC greenwashing issue found, provide:
- title: Descriptive title
- description: Why this claim is problematic with SPECIFIC reference to the document
- severity: "CRITICAL" (false claim), "HIGH" (misleading), or "MEDIUM" (vague)
- evidence: The exact claim from the document
- recommendations: How to properly substantiate the claim

Respond ONLY in this JSON format:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "esg",
      "title": "specific title",
      "description": "why this specific claim is problematic",
      "evidence": ["exact quote of the unsubstantiated claim"],
      "recommendations": ["what evidence is needed"]
    }
  ],
  "confidence": 0.85,
  "reasoning": "summary of ESG claims analyzed"
}

If NO greenwashing issues are found, respond with:
{
  "findings": [],
  "confidence": 0.95,
  "reasoning": "All environmental claims appear properly substantiated"
}`;

  console.log('[Greenwashing Agent] Calling Gemini API...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    const findings = (parsed.findings || []).filter((f: any) => 
      f.description && f.description.length > 20 && f.evidence && f.evidence.length > 0
    );
    console.log(`[Greenwashing Agent] Found ${findings.length} valid findings`);
    return {
      agent: 'Greenwashing Detector',
      findings,
      confidence: parsed.confidence || 0.85,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Greenwashing Detector',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse Gemini response'
  };
}

async function runComplianceAgent(text: string): Promise<AgentResult | null> {
  // Check if document has compliance-related content
  const complianceKeywords = [
    'compliance', 'regulatory', 'sec', 'gdpr', 'sox', 'audit', 'disclosure',
    'securities', 'regulation', 'legal', 'policy', 'governance', 'risk factors'
  ];
  
  if (!hasRelevantContent(text, complianceKeywords)) {
    console.log('[Compliance Agent] Skipping - no compliance content found');
    return null;
  }

  const prompt = `You are an expert regulatory compliance analyst.

CRITICAL INSTRUCTIONS:
1. ONLY report compliance issues that are ACTUALLY present in the document below
2. DO NOT generate generic or hypothetical findings
3. Each finding must reference SPECIFIC content from the document
4. If the document appears compliant, return an empty findings array
5. DO NOT make up issues - only report what you actually find

Document to analyze:
---
${text.substring(0, 6000)}
---

Analyze for compliance with relevant frameworks (SEC, GDPR, SOX, etc.) based on document content.

For each SPECIFIC compliance issue found, provide:
- title: Specific, descriptive title
- description: Detailed explanation referencing SPECIFIC text from the document
- severity: "CRITICAL", "HIGH", or "MEDIUM" based on actual risk
- evidence: Direct quotes or specific references from the document
- recommendations: Actionable steps to address the specific issue

Respond ONLY in this JSON format:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "compliance",
      "title": "specific compliance issue title",
      "description": "detailed explanation with document references",
      "evidence": ["specific quote or reference from document"],
      "recommendations": ["specific action to take"]
    }
  ],
  "confidence": 0.85,
  "reasoning": "summary of compliance review"
}

If NO compliance issues are found, respond with:
{
  "findings": [],
  "confidence": 0.95,
  "reasoning": "Document appears compliant - no issues identified"
}`;

  console.log('[Compliance Agent] Calling Gemini API...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    const findings = (parsed.findings || []).filter((f: any) => 
      f.description && f.description.length > 20
    );
    console.log(`[Compliance Agent] Found ${findings.length} valid findings`);
    return {
      agent: 'Compliance Agent',
      findings,
      confidence: parsed.confidence || 0.85,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Compliance Agent',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse Gemini response'
  };
}

async function runMathAgent(text: string): Promise<AgentResult | null> {
  // Check if document has financial/numerical content
  const financialKeywords = [
    'revenue', 'profit', 'loss', 'income', 'expense', 'asset', 'liability',
    'equity', 'cash', 'debt', 'margin', 'ratio', 'growth', '%', 'million', 'billion'
  ];
  
  const hasNumbers = /\d+/.test(text);
  if (!hasNumbers || !hasRelevantContent(text, financialKeywords)) {
    console.log('[Math Agent] Skipping - no financial content found');
    return null;
  }

  const prompt = `You are an expert financial analyst and auditor.

CRITICAL INSTRUCTIONS:
1. ONLY report calculation errors that are ACTUALLY present in the document below
2. DO NOT generate generic or hypothetical findings
3. Each finding must reference SPECIFIC numbers from the document
4. If all calculations appear correct, return an empty findings array
5. DO NOT make up issues - only report what you actually find

Document to analyze:
---
${text.substring(0, 6000)}
---

Analyze for:
1. Calculation errors (totals that don't add up, incorrect percentages)
2. Financial ratio anomalies
3. Inconsistent financial figures
4. Unrealistic projections

For each SPECIFIC calculation issue found, provide:
- title: Specific, descriptive title
- description: Detailed explanation with SPECIFIC numbers from the document
- severity: "CRITICAL" (major error), "HIGH" (significant), or "MEDIUM" (minor)
- evidence: The exact numbers that are problematic
- recommendations: How to correct the issue

Respond ONLY in this JSON format:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "financial",
      "title": "specific calculation issue",
      "description": "detailed explanation with specific numbers",
      "evidence": ["number 1: X", "number 2: Y", "discrepancy: Z"],
      "recommendations": ["correction needed"]
    }
  ],
  "confidence": 0.90,
  "reasoning": "summary of calculations verified"
}

If NO calculation issues are found, respond with:
{
  "findings": [],
  "confidence": 0.95,
  "reasoning": "All calculations appear correct"
}`;

  console.log('[Math Agent] Calling Gemini API...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    const findings = (parsed.findings || []).filter((f: any) => 
      f.description && f.description.length > 20
    );
    console.log(`[Math Agent] Found ${findings.length} valid findings`);
    return {
      agent: 'Math Agent',
      findings,
      confidence: parsed.confidence || 0.90,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Math Agent',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse Gemini response'
  };
}

async function runRiskAgent(text: string, previousFindings: Finding[]): Promise<AgentResult> {
  // Risk agent always runs if there's substantial content
  if (text.split(/\s+/).length < 50) {
    console.log('[Risk Agent] Skipping - document too short');
    return {
      agent: 'Risk Analysis Agent',
      findings: [],
      confidence: 0.5,
      reasoning: 'Document too short for risk analysis'
    };
  }

  const previousContext = previousFindings.length > 0 
    ? `\n\nPrevious agent findings:\n${JSON.stringify(previousFindings.slice(0, 10), null, 2)}`
    : '';

  const prompt = `You are an expert risk analyst performing due diligence.

CRITICAL INSTRUCTIONS:
1. ONLY report risks that are ACTUALLY evident from the document content below
2. DO NOT generate generic or hypothetical risks
3. Each risk must reference SPECIFIC content from the document
4. If no significant risks are evident, return an empty findings array
5. DO NOT make up issues - only report what you actually find

Document to analyze:
---
${text.substring(0, 5000)}
---
${previousContext}

Analyze for risks across categories:
- Financial Risk
- Operational Risk
- Market Risk
- Compliance Risk
- Strategic Risk
- Technology Risk

For each SPECIFIC risk identified, provide:
- title: Specific, descriptive title
- description: Detailed explanation referencing SPECIFIC content from the document
- severity: "CRITICAL", "HIGH", or "MEDIUM"
- evidence: Specific quotes or references from the document
- recommendations: Actions to mitigate the risk

Respond ONLY in this JSON format:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "category": "risk category",
      "title": "specific risk title",
      "description": "detailed explanation with document references",
      "evidence": ["specific quote or data point"],
      "recommendations": ["mitigation action"]
    }
  ],
  "confidence": 0.85,
  "reasoning": "summary of risk assessment",
  "overall_risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendation": "GO|NO_GO|CONDITIONAL"
}

If NO significant risks are found, respond with:
{
  "findings": [],
  "confidence": 0.95,
  "reasoning": "No significant risks identified",
  "overall_risk": "LOW",
  "recommendation": "GO"
}`;

  console.log('[Risk Agent] Calling Gemini API...');
  const response = await callGemini(prompt);
  const parsed = parseJsonResponse(response);
  
  if (parsed) {
    const findings = (parsed.findings || []).filter((f: any) => 
      f.description && f.description.length > 20
    );
    console.log(`[Risk Agent] Found ${findings.length} valid findings`);
    return {
      agent: 'Risk Analysis Agent',
      findings,
      confidence: parsed.confidence || 0.85,
      reasoning: parsed.reasoning || 'Analysis complete'
    };
  }
  
  return {
    agent: 'Risk Analysis Agent',
    findings: [],
    confidence: 0.5,
    reasoning: 'Unable to parse Gemini response'
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
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    console.log(`[Analysis] Starting analysis for document: ${document_id || 'no-id'}`);
    console.log(`[Analysis] Text length: ${text.length} chars`);

    const agents = run_agents || ['consistency', 'greenwashing', 'compliance', 'math', 'risk'];
    const results: AgentResult[] = [];
    const allFindings: Finding[] = [];

    // Run agents sequentially (risk agent needs previous results)
    for (const agent of agents) {
      let result: AgentResult | null = null;
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
        console.error(`[${agent}] Agent error:`, agentError.message);
        continue;
      }

      // Skip if agent returned null (no relevant content)
      if (!result) {
        console.log(`[${agent}] Skipped - no relevant content`);
        continue;
      }

      const executionTime = Date.now() - startTime;
      console.log(`[${agent}] Completed in ${executionTime}ms with ${result.findings.length} findings`);
      
      results.push(result);
      allFindings.push(...result.findings);

      // Store execution record if document_id provided
      if (document_id) {
        try {
          await supabase.from('agent_executions').insert({
            document_id,
            agent_name: result.agent,
            status: 'completed',
            execution_time: executionTime / 1000,
            findings_count: result.findings.length,
            confidence_score: result.confidence
          });

          // Store findings
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
          console.error(`[${agent}] Database error:`, dbError.message);
        }
      }
    }

    // Update document status
    if (document_id) {
      try {
        await supabase
          .from('documents')
          .update({ processing_status: 'completed' })
          .eq('id', document_id);
      } catch (dbError: any) {
        console.error('[Analysis] Error updating document status:', dbError.message);
      }
    }

    console.log(`[Analysis] Complete - ${results.length} agents ran, ${allFindings.length} total findings`);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total_findings: allFindings.length,
        critical: allFindings.filter(f => f.severity === 'CRITICAL').length,
        high: allFindings.filter(f => f.severity === 'HIGH').length,
        medium: allFindings.filter(f => f.severity === 'MEDIUM').length,
        low: allFindings.filter(f => f.severity === 'LOW').length,
        agents_executed: results.length,
        agents_skipped: agents.length - results.length
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
