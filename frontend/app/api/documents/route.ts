import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// GET - Fetch all documents
export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ documents: [], warning: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('upload_timestamp', { ascending: false });

    if (error) {
      console.warn('[Documents API] Query error:', error.message);
      return NextResponse.json({ documents: [], error: error.message });
    }

    return NextResponse.json({ documents: data || [] });
  } catch (error: any) {
    console.error('[Documents API] Error:', error);
    return NextResponse.json({ documents: [], error: error.message });
  }
}

// POST - Create a new document
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      // Return a mock document ID for testing without database
      return NextResponse.json({ 
        document: { id: `mock-${Date.now()}` },
        warning: 'Supabase not configured - using mock ID'
      });
    }

    const body = await request.json();
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        filename: body.filename,
        file_type: body.file_type,
        file_size: body.file_size,
        s3_key: body.s3_key || null,
        processing_status: 'pending',
        metadata: body.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.warn('[Documents API] Insert error:', error.message);
      // Return mock ID if table doesn't exist
      return NextResponse.json({ 
        document: { id: `mock-${Date.now()}` },
        warning: error.message
      });
    }

    return NextResponse.json({ document: data });
  } catch (error: any) {
    console.error('[Documents API] Error:', error);
    return NextResponse.json({ 
      document: { id: `mock-${Date.now()}` },
      error: error.message
    });
  }
}
