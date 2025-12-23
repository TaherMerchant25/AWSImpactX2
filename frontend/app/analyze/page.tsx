"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Brain, 
  FileText, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft,
  RefreshCw,
  Loader2,
  Play,
  Eye,
  Leaf,
  Scale,
  Calculator,
  Shield,
  File,
  X,
  Cloud
} from "lucide-react";

interface AgentResult {
  agent: string;
  findings: any[];
  confidence: number;
  reasoning: string;
}

interface AnalysisResults {
  success: boolean;
  results: AgentResult[];
  summary: {
    total_findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  path: string;
  url: string;
  document_id: string | null;
}

const AGENTS = [
  { id: 'consistency', name: 'Consistency Agent', icon: Eye, description: 'Detects data inconsistencies and contradictions' },
  { id: 'greenwashing', name: 'Greenwashing Detector', icon: Leaf, description: 'Analyzes environmental claims for substantiation' },
  { id: 'compliance', name: 'Compliance Agent', icon: Scale, description: 'Checks regulatory compliance requirements' },
  { id: 'math', name: 'Math Agent', icon: Calculator, description: 'Validates financial calculations and metrics' },
  { id: 'risk', name: 'Risk Analysis Agent', icon: Shield, description: 'Comprehensive risk assessment synthesis' },
];

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['consistency', 'greenwashing', 'compliance', 'math', 'risk']);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // File upload states
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
      setError('Please upload a PDF, TXT, DOC, DOCX, or CSV file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadedFile({
        name: data.file.name,
        size: data.file.size,
        type: data.file.type,
        path: data.file.path,
        url: data.file.url,
        document_id: data.document_id
      });

      setDocumentName(file.name);

      // Extract text from file
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        // Read text files directly
        const textContent = await file.text();
        setText(textContent);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Try to extract text from PDF
        const extractFormData = new FormData();
        extractFormData.append('file', file);
        
        const extractResponse = await fetch('/api/extract', {
          method: 'POST',
          body: extractFormData
        });
        
        const extractData = await extractResponse.json();
        
        if (extractData.success && extractData.text) {
          setText(extractData.text);
        } else {
          // PDF extraction failed - prompt user to paste text
          setText('');
          setError(`PDF uploaded but text extraction limited. Please copy and paste the document text into the text area below for analysis.`);
        }
      } else {
        // Other file types - prompt user to paste text
        setText('');
        setError(`File uploaded. Please copy and paste the document text into the text area below for analysis.`);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setUploadedFile(null);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setText("");
    setDocumentName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("Please enter or paste document text to analyze, or upload a file");
      return;
    }

    if (selectedAgents.length === 0) {
      setError("Please select at least one agent");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      // Use uploaded file's document_id if available, otherwise create new record
      let documentId = uploadedFile?.document_id || null;
      
      if (!documentId && documentName) {
        const docResponse = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: documentName || 'Untitled Document',
            file_type: uploadedFile?.type || 'text/plain',
            file_size: uploadedFile?.size || text.length,
            s3_key: uploadedFile?.path || null,
            metadata: { 
              source: uploadedFile ? 'file_upload' : 'manual_input',
              uploaded_url: uploadedFile?.url
            }
          })
        });
        const docData = await docResponse.json();
        documentId = docData.document?.id;
      }

      // Run analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          text,
          run_agents: selectedAgents
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setAnalyzing(false);
      setCurrentAgent(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    const sev = severity?.toUpperCase();
    switch (sev) {
      case "CRITICAL": return "text-red-400 bg-red-500/10 border-red-500/20";
      case "HIGH": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "MEDIUM": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "LOW": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const sampleDocument = `Financial Report Q1 2024 - GreenTech Solutions Inc.

Executive Summary:
Our company achieved $5 million in revenue during Q1 2024, representing significant growth.
Total annual revenue for 2024 is projected to be $3 million based on current trends.
We grew revenue by 200% compared to the previous year.
Previous year (2023) revenue stood at $1.5 million.

Environmental Initiatives:
GreenTech Solutions is 100% eco-friendly and carbon neutral.
We use sustainable materials in all our manufacturing processes.
Our facilities are powered by renewable energy sources.
Note: Third-party verification of environmental claims is pending.

Compliance Status:
All operations comply with local and federal regulations.
Risk assessments are conducted quarterly.
[Section 4.2 - Regulatory disclosure details to be added]

Financial Projections:
Based on our growth trajectory, we expect Q2 revenue of $8 million.
Market expansion into Asia Pacific region planned for Q3.
Total investment in R&D increased by 150% year-over-year.`;

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-black selection:text-white">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200" : "bg-white border-b border-gray-100"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">Analyze Document</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 max-w-7xl mx-auto px-6">
        {!results ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload Section */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  Upload Document
                </h2>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  accept=".pdf,.txt,.doc,.docx,.csv"
                  className="hidden"
                />

                {!uploadedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-black bg-gray-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {uploading ? (
                      <div className="space-y-4">
                        <Loader2 className="w-12 h-12 mx-auto animate-spin text-black" />
                        <p className="text-gray-600">Uploading to AWSIMPACTX bucket...</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                          <div 
                            className="bg-black h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-500">{uploadProgress}%</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-gray-700 font-medium mb-2">
                          Drag and drop your document here, or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                          Supported formats: PDF, TXT, DOC, DOCX, CSV (Max 10MB)
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <File className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(uploadedFile.size)} • Uploaded to AWSIMPACTX
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={clearUploadedFile}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      File uploaded successfully to Supabase Storage
                    </div>
                  </div>
                )}
              </div>

              {/* Text Input Section */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Document Content
                </h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Name (optional)</label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="e.g., Q1 2024 Financial Report"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {uploadedFile ? 'Extracted/Uploaded Content (editable)' : 'Paste or type document text to analyze'}
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your document content here or upload a file above..."
                    rows={15}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none font-mono text-sm transition-all"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {text.length} characters
                  </span>
                  <button
                    onClick={() => setText(sampleDocument)}
                    className="text-sm font-medium text-black hover:underline"
                  >
                    Load sample document
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </div>

            {/* Agent Selection */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Select Agents
                </h2>
                
                <div className="space-y-3">
                  {AGENTS.map((agent) => {
                    const Icon = agent.icon;
                    const isSelected = selectedAgents.includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-black' : 'bg-gray-100'}`}>
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{agent.name}</div>
                            <div className="text-xs text-gray-500">{agent.description}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-black bg-black' : 'border-gray-300'
                          }`}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-gray-500">{selectedAgents.length} agents selected</span>
                    <button
                      onClick={() => setSelectedAgents(selectedAgents.length === AGENTS.length ? [] : AGENTS.map(a => a.id))}
                      className="font-medium text-black hover:underline"
                    >
                      {selectedAgents.length === AGENTS.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || !text.trim() || selectedAgents.length === 0}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  analyzing || !text.trim() || selectedAgents.length === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-black hover:bg-gray-800 text-white'
                }`}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Analysis Complete
                </h2>
                <button
                  onClick={() => {
                    setResults(null);
                    setText("");
                    setDocumentName("");
                    setUploadedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Analysis
                </button>
              </div>

              {/* Document Info */}
              {uploadedFile && (
                <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <File className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(uploadedFile.size)} • Stored in AWSIMPACTX bucket
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gray-100 text-center">
                  <div className="text-2xl font-bold text-gray-900">{results.summary.total_findings}</div>
                  <div className="text-xs text-gray-500">Total Findings</div>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
                  <div className="text-2xl font-bold text-red-700">{results.summary.critical}</div>
                  <div className="text-xs text-red-600">Critical</div>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-center">
                  <div className="text-2xl font-bold text-orange-700">{results.summary.high}</div>
                  <div className="text-xs text-orange-600">High</div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <div className="text-2xl font-bold text-amber-700">{results.summary.medium}</div>
                  <div className="text-xs text-amber-600">Medium</div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <div className="text-2xl font-bold text-blue-700">{results.summary.low}</div>
                  <div className="text-xs text-blue-600">Low</div>
                </div>
              </div>
            </div>

            {/* Agent Results */}
            <div className="space-y-4">
              {results.results.map((result, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                      {result.agent}
                    </h3>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      Confidence: {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {result.reasoning && (
                    <p className="text-gray-500 text-sm mb-4 italic bg-gray-50 p-3 rounded-lg">
                      &ldquo;{result.reasoning}&rdquo;
                    </p>
                  )}

                  {result.findings.length === 0 ? (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      No issues detected by this agent
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {result.findings.map((finding, fIndex) => (
                        <div key={fIndex} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getSeverityColor(finding.severity)}`}>
                              {finding.severity}
                            </span>
                            <span className="text-xs text-gray-500">{finding.category}</span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-2">{finding.title}</h4>
                          <p className="text-sm text-gray-600 mb-3">{finding.description}</p>
                          
                          {finding.evidence && finding.evidence.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-gray-500 mb-1">Evidence:</div>
                              <ul className="list-disc list-inside text-sm text-gray-600">
                                {finding.evidence.map((ev: string, i: number) => (
                                  <li key={i}>{ev}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {finding.recommendations && finding.recommendations.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">Recommendations:</div>
                              <ul className="list-disc list-inside text-sm text-black">
                                {finding.recommendations.map((rec: string, i: number) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="flex-1 py-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-center font-medium text-gray-900 transition-colors"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => {
                  setResults(null);
                  setText("");
                  setDocumentName("");
                  setUploadedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-black hover:bg-gray-800 text-center font-medium text-white transition-colors"
              >
                Analyze Another Document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
