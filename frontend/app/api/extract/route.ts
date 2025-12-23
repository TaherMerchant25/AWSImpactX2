import { NextRequest, NextResponse } from 'next/server';

// POST - Extract text from uploaded file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`[Extract API] Processing file: ${file.name}, type: ${file.type}`);

    let extractedText = '';

    // Handle text files directly
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      extractedText = await file.text();
    }
    // Handle CSV files
    else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      extractedText = await file.text();
    }
    // For PDF files - use basic extraction or show message
    else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Try to extract text from PDF using ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Basic PDF text extraction (looks for text streams)
      extractedText = extractTextFromPdfBytes(uint8Array);
      
      if (!extractedText || extractedText.length < 50) {
        return NextResponse.json({
          success: false,
          error: 'PDF text extraction limited. Please copy and paste the text content manually, or use a .txt file.',
          filename: file.name
        }, { status: 400 });
      }
    }
    // For Word documents
    else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      return NextResponse.json({
        success: false,
        error: 'Word document extraction not supported. Please copy and paste the text content manually, or save as .txt file.',
        filename: file.name
      }, { status: 400 });
    }
    else {
      return NextResponse.json({
        success: false,
        error: `Unsupported file type: ${file.type}. Please use .txt, .csv, or copy/paste the content.`,
        filename: file.name
      }, { status: 400 });
    }

    console.log(`[Extract API] Extracted ${extractedText.length} characters`);

    return NextResponse.json({
      success: true,
      text: extractedText,
      filename: file.name,
      characters: extractedText.length
    });

  } catch (error: any) {
    console.error('[Extract API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Text extraction failed' },
      { status: 500 }
    );
  }
}

// Basic PDF text extraction from bytes
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const text: string[] = [];
  
  // Convert to string for searching
  let pdfString = '';
  for (let i = 0; i < bytes.length; i++) {
    pdfString += String.fromCharCode(bytes[i]);
  }
  
  // Look for text between BT (begin text) and ET (end text) markers
  const btPattern = /BT[\s\S]*?ET/g;
  const matches = pdfString.match(btPattern);
  
  if (matches) {
    for (const match of matches) {
      // Extract text from Tj and TJ operators
      const tjPattern = /\(([^)]*)\)\s*Tj/g;
      const tjMatches = match.matchAll(tjPattern);
      for (const tj of tjMatches) {
        if (tj[1]) {
          text.push(decodeEscapedString(tj[1]));
        }
      }
      
      // Extract from TJ arrays
      const tjArrayPattern = /\[(.*?)\]\s*TJ/g;
      const tjArrayMatches = match.matchAll(tjArrayPattern);
      for (const tja of tjArrayMatches) {
        if (tja[1]) {
          const innerPattern = /\(([^)]*)\)/g;
          const innerMatches = tja[1].matchAll(innerPattern);
          for (const inner of innerMatches) {
            if (inner[1]) {
              text.push(decodeEscapedString(inner[1]));
            }
          }
        }
      }
    }
  }
  
  // Also try to find plain text streams
  const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
  const streamMatches = pdfString.matchAll(streamPattern);
  for (const stream of streamMatches) {
    if (stream[1]) {
      // Look for readable ASCII text
      const readable = stream[1].replace(/[^\x20-\x7E\n\r]/g, ' ').trim();
      if (readable.length > 20 && /[a-zA-Z]{3,}/.test(readable)) {
        text.push(readable);
      }
    }
  }
  
  return text.join(' ').replace(/\s+/g, ' ').trim();
}

function decodeEscapedString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}
