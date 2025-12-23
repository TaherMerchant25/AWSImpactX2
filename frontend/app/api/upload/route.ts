import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const BUCKET_NAME = 'AWSIMPACTX';

// POST - Upload file to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      console.error('[Upload API] Supabase not configured');
      return NextResponse.json(
        { error: 'Storage not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`[Upload API] Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `documents/${timestamp}_${sanitizedName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[Upload API] Storage upload error:', uploadError);
      
      // Check if bucket doesn't exist
      if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
        return NextResponse.json(
          { error: `Storage bucket "${BUCKET_NAME}" not found. Please create it in Supabase Dashboard > Storage.` },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload file' },
        { status: 500 }
      );
    }

    console.log(`[Upload API] File uploaded successfully to: ${filePath}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Try to create document record in database (may fail if table doesn't exist)
    let documentId = null;
    let documentData = null;

    try {
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          s3_key: filePath,
          processing_status: 'pending',
          metadata: {
            bucket: BUCKET_NAME,
            original_name: file.name,
            upload_timestamp: new Date().toISOString(),
            public_url: urlData.publicUrl
          }
        })
        .select()
        .single();

      if (docError) {
        console.warn('[Upload API] Document record error (table may not exist):', docError.message);
      } else {
        documentId = docData.id;
        documentData = docData;
        console.log(`[Upload API] Document record created: ${documentId}`);
      }
    } catch (dbError: any) {
      console.warn('[Upload API] Database error:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      file: {
        path: filePath,
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type
      },
      document_id: documentId,
      document: documentData
    });

  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

// GET - List files in bucket
export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        files: [], 
        bucket: BUCKET_NAME,
        warning: 'Supabase not configured' 
      });
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('documents', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.warn('[Upload API] List files error:', error.message);
      return NextResponse.json({ 
        files: [], 
        bucket: BUCKET_NAME,
        error: error.message 
      });
    }

    return NextResponse.json({
      files: data || [],
      bucket: BUCKET_NAME
    });

  } catch (error: any) {
    console.error('[Upload API] List error:', error);
    return NextResponse.json({ 
      files: [], 
      bucket: BUCKET_NAME,
      error: error.message 
    });
  }
}
