import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// GET - Fetch dashboard statistics
export async function GET() {
  try {
    // If Supabase is not configured, return mock data
    if (!supabase) {
      console.warn('[Stats API] Supabase not configured, returning mock data');
      return NextResponse.json({
        documents: { total: 0, completed: 0, processing: 0, pending: 0 },
        findings: { total: 0, critical: 0, high: 0, medium: 0, low: 0, recentWeek: 0 },
        agents: [
          { name: 'Consistency Agent', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
          { name: 'Greenwashing Detector', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
          { name: 'Compliance Agent', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
          { name: 'Math Agent', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
          { name: 'Risk Analysis Agent', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
        ],
        performance: { avgProcessingTime: 0, totalExecutions: 0 },
        findingsByAgent: {},
        warning: 'Supabase not configured'
      });
    }

    // Get document counts - handle table not existing
    let documents: any[] = [];
    let findings: any[] = [];
    let executions: any[] = [];

    try {
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('id, processing_status');
      
      if (docError) {
        console.warn('[Stats API] Documents table error:', docError.message);
      } else {
        documents = docData || [];
      }
    } catch (e: any) {
      console.warn('[Stats API] Documents query failed:', e.message);
    }

    try {
      const { data: findData, error: findError } = await supabase
        .from('findings')
        .select('id, severity, agent_type, created_at');
      
      if (findError) {
        console.warn('[Stats API] Findings table error:', findError.message);
      } else {
        findings = findData || [];
      }
    } catch (e: any) {
      console.warn('[Stats API] Findings query failed:', e.message);
    }

    try {
      const { data: execData, error: execError } = await supabase
        .from('agent_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (execError) {
        console.warn('[Stats API] Executions table error:', execError.message);
      } else {
        executions = execData || [];
      }
    } catch (e: any) {
      console.warn('[Stats API] Executions query failed:', e.message);
    }

    // Calculate stats
    const totalDocuments = documents.length;
    const completedDocuments = documents.filter(d => d.processing_status === 'completed').length;
    const processingDocuments = documents.filter(d => d.processing_status === 'processing').length;

    const totalFindings = findings.length;
    const criticalFindings = findings.filter(f => f.severity === 'critical').length;
    const highFindings = findings.filter(f => f.severity === 'high').length;
    const mediumFindings = findings.filter(f => f.severity === 'medium').length;
    const lowFindings = findings.filter(f => f.severity === 'low').length;

    // Calculate average processing time
    const completedExecutions = executions.filter(e => e.status === 'completed' && e.execution_time);
    const avgProcessingTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.execution_time || 0), 0) / completedExecutions.length
      : 0;

    // Agent status summary
    const agentNames = ['Consistency Agent', 'Greenwashing Detector', 'Compliance Agent', 'Math Agent', 'Risk Analysis Agent'];
    const agentStats = agentNames.map(name => {
      const agentExecutions = executions.filter(e => e.agent_name === name);
      const lastExecution = agentExecutions[0];
      return {
        name,
        status: lastExecution?.status || 'idle',
        lastRun: lastExecution?.started_at || null,
        totalRuns: agentExecutions.length,
        avgConfidence: agentExecutions.length > 0
          ? agentExecutions.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / agentExecutions.length
          : 0
      };
    });

    // Findings by agent
    const findingsByAgent = agentNames.reduce((acc, name) => {
      acc[name] = findings.filter(f => f.agent_type === name).length;
      return acc;
    }, {} as Record<string, number>);

    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentFindings = findings.filter(f => new Date(f.created_at) > weekAgo).length;

    return NextResponse.json({
      documents: {
        total: totalDocuments,
        completed: completedDocuments,
        processing: processingDocuments,
        pending: totalDocuments - completedDocuments - processingDocuments
      },
      findings: {
        total: totalFindings,
        critical: criticalFindings,
        high: highFindings,
        medium: mediumFindings,
        low: lowFindings,
        recentWeek: recentFindings
      },
      agents: agentStats,
      performance: {
        avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
        totalExecutions: executions.length
      },
      findingsByAgent
    });

  } catch (error: any) {
    console.error('[Stats API] Error:', error);
    // Return empty stats instead of error
    return NextResponse.json({
      documents: { total: 0, completed: 0, processing: 0, pending: 0 },
      findings: { total: 0, critical: 0, high: 0, medium: 0, low: 0, recentWeek: 0 },
      agents: [
        { name: 'Consistency Agent', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
        { name: 'Greenwashing Detector', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
        { name: 'Compliance Agent', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
        { name: 'Math Agent', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
        { name: 'Risk Analysis Agent', status: 'idle', lastRun: null, totalRuns: 0, avgConfidence: 0 },
      ],
      performance: { avgProcessingTime: 0, totalExecutions: 0 },
      findingsByAgent: {},
      error: error.message
    });
  }
}
