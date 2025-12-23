"""
Base Agent Class
Foundation for all specialized agents in the system
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from dataclasses import dataclass
import json
import os
import google.generativeai as genai

# Optional AWS tracing for local development
try:
    from aws_lambda_powertools import Logger, Tracer
    logger = Logger()
    tracer = Tracer()
except:
    # Fallback for local development
    import logging
    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO)
    
    # Mock tracer
    class MockTracer:
        def capture_method(self, func):
            return func
    tracer = MockTracer()

# Configure Gemini API
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))


@dataclass
class Finding:
    """Represents a finding from an agent"""
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str
    title: str
    description: str
    evidence: List[str]
    confidence: float
    recommendations: List[str]


class BaseAgent(ABC):
    """Base class for all agents"""
    
    def __init__(self, agent_name: str, mcp_hub):
        self.agent_name = agent_name
        self.mcp_hub = mcp_hub
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.generation_config = genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=4096
        )
    
    @abstractmethod
    def analyze(self, document_data: Dict[str, Any], 
               context: Dict[str, Any],
               previous_results: Dict[str, Any] = None) -> Any:
        """Main analysis method - must be implemented by subclasses"""
        pass
    
    @abstractmethod
    def has_relevant_content(self, document_data: Dict[str, Any]) -> bool:
        """
        Check if document has relevant content for this agent.
        Must be implemented by subclasses.
        Returns True if agent should analyze, False to skip.
        """
        pass
    
    @tracer.capture_method
    def invoke_llm(self, prompt: str, temperature: float = 0.1) -> str:
        """Invoke Gemini LLM with prompt"""
        
        try:
            # Update generation config with custom temperature
            config = genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=4096
            )
            
            response = self.model.generate_content(
                prompt,
                generation_config=config
            )
            
            return response.text
            
        except Exception as e:
            logger.exception(f"Error invoking Gemini for {self.agent_name}")
            raise
    
    def extract_text_content(self, document_data: Dict[str, Any]) -> str:
        """Extract full text from document data"""
        
        text_content = document_data.get('text_content', [])
        return " ".join([t.get('text', '') for t in text_content])
    
    def create_finding(self, severity: str, category: str, title: str,
                      description: str, evidence: List[str],
                      confidence: float, recommendations: List[str]) -> Finding:
        """Create a standardized finding"""
        
        return Finding(
            severity=severity,
            category=category,
            title=title,
            description=description,
            evidence=evidence,
            confidence=confidence,
            recommendations=recommendations
        )
