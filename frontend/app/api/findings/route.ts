import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// GET - Fetch all findings
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ findings: [], warning: 'Supabase not configured' });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('findings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[Findings API] Query error:', error.message);
      return NextResponse.json({ findings: [], error: error.message });
    }

    return NextResponse.json({ findings: data || [] });
  } catch (error: any) {
    console.error('[Findings API] Error:', error);
    return NextResponse.json({ findings: [], error: error.message });
  }
}

// POST - Create a new finding
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        finding: null, 
        warning: 'Supabase not configured - finding not saved' 
      });
    }

    const body = await request.json();
    
    const { data, error } = await supabase
      .from('findings')
      .insert({
        document_id: body.document_id,
        agent_type: body.agent_type,
        severity: body.severity,
        category: body.category,
        title: body.title,
        description: body.description,
        evidence: body.evidence || [],
        recommendations: body.recommendations || [],
        confidence_score: body.confidence_score || 0
      })
      .select()
      .single();

    if (error) {
      console.warn('[Findings API] Insert error:', error.message);
      return NextResponse.json({ finding: null, warning: error.message });
    }

    return NextResponse.json({ finding: data });
  } catch (error: any) {
    console.error('[Findings API] Error:', error);
    return NextResponse.json({ finding: null, error: error.message });
  }
}
