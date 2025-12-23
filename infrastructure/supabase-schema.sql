-- ASPERA Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the tables

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER DEFAULT 0,
    s3_key VARCHAR(500),
    processing_status VARCHAR(50) DEFAULT 'pending',
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Findings table
CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    agent_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    category VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    evidence JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    confidence_score DECIMAL(3,2) DEFAULT 0.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Executions table
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time DECIMAL(10,3),
    findings_count INTEGER DEFAULT 0,
    confidence_score DECIMAL(3,2),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- System Logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents(upload_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_findings_document ON findings(document_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_agent ON findings(agent_type);
CREATE INDEX IF NOT EXISTS idx_executions_document ON agent_executions(document_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp DESC);

-- Enable Row Level Security (RLS) - optional, disable for development
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for development)
-- In production, you should create proper RLS policies based on user authentication

-- Grant access to anonymous users (for development)
GRANT ALL ON documents TO anon;
GRANT ALL ON findings TO anon;
GRANT ALL ON agent_executions TO anon;
GRANT ALL ON system_logs TO anon;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
