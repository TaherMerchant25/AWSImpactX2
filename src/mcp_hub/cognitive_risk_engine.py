"""
Cognitive Risk Engine - AI Agent Orchestra
Coordinates multiple AI agents using Chain of Thought reasoning
"""
import json
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import google.generativeai as genai

# Optional AWS tracing for local development
try:
    from aws_lambda_powertools import Logger, Tracer
    logger = Logger()
    tracer = Tracer()
except:
    import logging
    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO)
    
    class MockTracer:
        def capture_method(self, func):
            return func
    tracer = MockTracer()

# Configure Gemini API
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))


class AgentType(Enum):
    """Enum for agent types"""
    CONSISTENCY = "consistency"
    GREENWASHING = "greenwashing"
    COMPLIANCE = "compliance"
    MATH = "math"
    RISK_ANALYSIS = "risk_analysis"


@dataclass
class AgentTask:
    """Represents a task for an agent"""
    agent_type: AgentType
    task_description: str
    input_data: Dict[str, Any]
    priority: int
    dependencies: List[str] = None


@dataclass
class AgentResponse:
    """Response from an agent"""
    agent_type: AgentType
    success: bool
    findings: List[Dict[str, Any]]
    confidence: float
    reasoning: str
    metadata: Dict[str, Any]


class CognitiveRiskEngine:
    """
    Orchestrates multiple AI agents for comprehensive due diligence
    Uses Chain of Thought reasoning with Amazon Bedrock
    """
    
    def __init__(self, mcp_hub):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.generation_config = genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=4096
        )
        self.mcp_hub = mcp_hub
        self.agents: Dict[AgentType, Any] = {}
    
    def register_agent(self, agent_type: AgentType, agent):
        """Register an agent with the engine"""
        self.agents[agent_type] = agent
        logger.info(f"Registered agent: {agent_type.value}")
    
    @tracer.capture_method
    def orchestrate_analysis(self, document_data: Dict[str, Any], 
                           context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Orchestrate multi-agent analysis using Chain of Thought
        """
        logger.info("Starting orchestrated analysis")
        
        # Define task execution graph
        tasks = self._create_task_graph(document_data, context)
        
        # Execute tasks in priority order
        results = self._execute_tasks(tasks, context)
        
        # Synthesize results with Chain of Thought
        synthesis = self._synthesize_results(results, document_data, context)
        
        # Generate final recommendation
        recommendation = self._generate_recommendation(synthesis, context)
        
        return {
            'agent_results': results,
            'synthesis': synthesis,
            'recommendation': recommendation,
            'metadata': {
                'timestamp': datetime.utcnow().isoformat(),
                'agents_executed': len(results)
            }
        }
    
    def _create_task_graph(self, document_data: Dict[str, Any], 
                          context: Dict[str, Any]) -> List[AgentTask]:
        """Create task execution graph based on document type and priority"""
        
        tasks = []
        
        # Consistency check (highest priority)
        tasks.append(AgentTask(
            agent_type=AgentType.CONSISTENCY,
            task_description="Verify data consistency across document",
            input_data=document_data,
            priority=1
        ))
        
        # Greenwashing detection
        tasks.append(AgentTask(
            agent_type=AgentType.GREENWASHING,
            task_description="Detect unsubstantiated environmental claims",
            input_data=document_data,
            priority=2
        ))
        
        # Compliance check
        tasks.append(AgentTask(
            agent_type=AgentType.COMPLIANCE,
            task_description="Verify regulatory compliance",
            input_data=document_data,
            priority=3
        ))
        
        # Mathematical analysis
        tasks.append(AgentTask(
            agent_type=AgentType.MATH,
            task_description="Validate financial calculations and metrics",
            input_data=document_data,
            priority=4
        ))
        
        # Risk analysis (requires previous results)
        tasks.append(AgentTask(
            agent_type=AgentType.RISK_ANALYSIS,
            task_description="Comprehensive risk assessment",
            input_data=document_data,
            priority=5,
            dependencies=['consistency', 'compliance', 'math']
        ))
        
        return sorted(tasks, key=lambda t: t.priority)
    
    def _execute_tasks(self, tasks: List[AgentTask], 
                      context: Dict[str, Any]) -> Dict[AgentType, AgentResponse]:
        """Execute agent tasks in order, skipping agents without relevant content"""
        
        results = {}
        
        for task in tasks:
            # Check dependencies
            if task.dependencies:
                if not all(dep in [r.value for r in results.keys()] 
                          for dep in task.dependencies):
                    logger.warning(f"Skipping task {task.agent_type.value} due to unmet dependencies")
                    continue
            
            # Execute agent
            if task.agent_type in self.agents:
                agent = self.agents[task.agent_type]
                
                # Check if document has relevant content for this agent
                if not agent.has_relevant_content(task.input_data):
                    logger.info(f"Skipping agent {task.agent_type.value} - no relevant content found")
                    continue
                
                logger.info(f"Executing agent: {task.agent_type.value}")
                response = agent.analyze(task.input_data, context, previous_results=results)
                results[task.agent_type] = response
            else:
                logger.warning(f"Agent not registered: {task.agent_type.value}")
        
        return results
    
    @tracer.capture_method
    def _synthesize_results(self, results: Dict[AgentType, AgentResponse], 
                           document_data: Dict[str, Any],
                           context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synthesize agent results using Chain of Thought reasoning
        """
        
        # Prepare synthesis prompt
        synthesis_prompt = self._build_synthesis_prompt(results, document_data)
        
        # Use Gemini for synthesis
        try:
            response = self.model.generate_content(
                synthesis_prompt,
                generation_config=self.generation_config
            )
            
            synthesis_text = response.text
            
            # Parse synthesis response
            synthesis = self._parse_synthesis(synthesis_text)
            
            return synthesis
            
        except Exception as e:
            logger.exception("Error in synthesis")
            return {
                'error': str(e),
                'fallback_synthesis': self._fallback_synthesis(results)
            }
    
    def _build_synthesis_prompt(self, results: Dict[AgentType, AgentResponse], 
                               document_data: Dict[str, Any]) -> str:
        """Build Chain of Thought synthesis prompt"""
        
        prompt_parts = [
            "You are an expert investment analyst synthesizing due diligence findings.",
            "\n## Document Analysis Results\n"
        ]
        
        # Add agent findings
        for agent_type, response in results.items():
            prompt_parts.append(f"\n### {agent_type.value.upper()} Agent:\n")
            prompt_parts.append(f"Confidence: {response.confidence:.2f}\n")
            prompt_parts.append(f"Reasoning: {response.reasoning}\n")
            prompt_parts.append(f"Findings: {json.dumps(response.findings, indent=2)}\n")
        
        prompt_parts.append("\n## Task\n")
        prompt_parts.append(
            "Using Chain of Thought reasoning:\n"
            "1. Analyze the findings from all agents\n"
            "2. Identify critical risks and compliance issues\n"
            "3. Assess the overall investment viability\n"
            "4. Consider interdependencies between findings\n"
            "5. Provide a synthesized risk assessment\n\n"
            "Format your response as JSON with:\n"
            "{\n"
            '  "critical_risks": [],\n'
            '  "medium_risks": [],\n'
            '  "opportunities": [],\n'
            '  "compliance_status": "",\n'
            '  "financial_health": "",\n'
            '  "overall_assessment": "",\n'
            '  "confidence_score": 0.0\n'
            "}"
        )
        
        return "".join(prompt_parts)
    
    def _parse_synthesis(self, synthesis_text: str) -> Dict[str, Any]:
        """Parse synthesis response from LLM"""
        
        try:
            # Extract JSON from response
            start_idx = synthesis_text.find('{')
            end_idx = synthesis_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = synthesis_text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                return {'raw_synthesis': synthesis_text}
                
        except Exception as e:
            logger.error(f"Error parsing synthesis: {e}")
            return {'raw_synthesis': synthesis_text}
    
    def _fallback_synthesis(self, results: Dict[AgentType, AgentResponse]) -> Dict[str, Any]:
        """Fallback synthesis if LLM fails"""
        
        critical_risks = []
        medium_risks = []
        
        for agent_type, response in results.items():
            for finding in response.findings:
                if finding.get('severity') == 'CRITICAL':
                    critical_risks.append(finding)
                elif finding.get('severity') == 'MEDIUM':
                    medium_risks.append(finding)
        
        return {
            'critical_risks': critical_risks,
            'medium_risks': medium_risks,
            'fallback': True
        }
    
    @tracer.capture_method
    def _generate_recommendation(self, synthesis: Dict[str, Any], 
                                context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate final investment recommendation"""
        
        critical_risks = synthesis.get('critical_risks', [])
        medium_risks = synthesis.get('medium_risks', [])
        compliance_status = synthesis.get('compliance_status', '')
        confidence_score = synthesis.get('confidence_score', 0.0)
        
        # Decision logic
        if len(critical_risks) > 0:
            decision = "NO_GO"
            rationale = f"Found {len(critical_risks)} critical risk(s)"
        elif len(medium_risks) > 3:
            decision = "CONDITIONAL"
            rationale = f"Found {len(medium_risks)} medium risk(s) requiring mitigation"
        elif compliance_status.lower() in ['non-compliant', 'failed']:
            decision = "NO_GO"
            rationale = "Compliance requirements not met"
        elif confidence_score < 0.5:
            decision = "REQUIRES_REVIEW"
            rationale = "Low confidence in analysis - human review required"
        else:
            decision = "GO"
            rationale = "Analysis indicates acceptable risk profile"
        
        # Generate risk heatmap data
        risk_heatmap = self._generate_risk_heatmap(synthesis)
        
        return {
            'decision': decision,
            'rationale': rationale,
            'confidence_score': confidence_score,
            'risk_heatmap': risk_heatmap,
            'critical_risks_count': len(critical_risks),
            'medium_risks_count': len(medium_risks),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _generate_risk_heatmap(self, synthesis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate risk heatmap for visualization"""
        
        return {
            'categories': {
                'financial': self._calculate_category_risk(synthesis, 'financial'),
                'compliance': self._calculate_category_risk(synthesis, 'compliance'),
                'operational': self._calculate_category_risk(synthesis, 'operational'),
                'esg': self._calculate_category_risk(synthesis, 'esg'),
                'market': self._calculate_category_risk(synthesis, 'market')
            }
        }
    
    def _calculate_category_risk(self, synthesis: Dict[str, Any], category: str) -> str:
        """Calculate risk level for a category"""
        
        # Simplified calculation
        critical_risks = synthesis.get('critical_risks', [])
        medium_risks = synthesis.get('medium_risks', [])
        
        category_critical = [r for r in critical_risks 
                           if r.get('category', '').lower() == category]
        category_medium = [r for r in medium_risks 
                         if r.get('category', '').lower() == category]
        
        if len(category_critical) > 0:
            return "CRITICAL"
        elif len(category_medium) > 2:
            return "HIGH"
        elif len(category_medium) > 0:
            return "MEDIUM"
        else:
            return "LOW"
