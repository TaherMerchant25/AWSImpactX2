"""
Step Functions State Machine Orchestrator
Coordinates the entire due diligence pipeline
"""
import json
import os
from typing import Dict, Any
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from datetime import datetime
from src.utils.supabase_client import get_db

# Import components
from src.ingestion.document_processor import DocumentProcessor
from src.knowledge.knowledge_graph_builder import KnowledgeGraphBuilder
from src.knowledge.vector_store_manager import VectorStoreManager
from src.mcp_hub.mcp_hub import MCPHub, MCPContextManager
from src.mcp_hub.cognitive_risk_engine import CognitiveRiskEngine
from src.agents.consistency_agent import ConsistencyAgent
from src.agents.greenwashing_detector import GreenwashingDetectorAgent
from src.agents.compliance_agent import ComplianceCheckAgent
from src.agents.math_agent import MathAgent
from src.agents.risk_analysis_agent import RiskAnalysisAgent

logger = Logger()
tracer = Tracer()
        self.mcp_hub = MCPHub()
        self.context_manager = MCPContextManager()
        
        # Initialize Supabase client
        self.supabase = get_db()
        
        # Initialize components
        self.vector_store = VectorStoreManager()
        self.kg_builder = KnowledgeGraphBuilder()
        self.cognitive_engine = CognitiveRiskEngine(self.mcp_hub)
        
        # Initialize agents
        self.consistency_agent = ConsistencyAgent(self.mcp_hub)
        self.greenwashing_agent = GreenwashingDetectorAgent(self.mcp_hub)
        self.compliance_agent = ComplianceCheckAgent(self.mcp_hub)
        self.math_agent = MathAgent(self.mcp_hub)
        self.risk_agent = RiskAnalysisAgent(self.mcp_hub)
        
        # Register agents with cognitive engine
        from src.mcp_hub.cognitive_risk_engine import AgentType
        self.cognitive_engine.register_agent(AgentType.CONSISTENCY, self.consistency_agent)
        self.cognitive_engine.register_agent(AgentType.GREENWASHING, self.greenwashing_agent)
        self.cognitive_engine.register_agent(AgentType.COMPLIANCE, self.compliance_agent)
        self.cognitive_engine.register_agent(AgentType.MATH, self.math_agent)
        self.cognitive_engine.register_agent(AgentType.RISK_ANALYSIS, self.risk_agent)
    
    @tracer.capture_method
    def process_document(self, bucket: str, key: str, 
                        context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Complete end-to-end document processing pipeline
        """
        logger.info(f"Starting pipeline for {bucket}/{key}")
        
        # Create context for this analysis
        context_id = f"{bucket}_{key}_{context.get('request_id', 'unknown')}"
        self.context_manager.create_context(context_id, {
            'bucket': bucket,
            'key': key,
            'start_time': context.get('start_time')
        })
        
        # Stage 1: Document Ingestion & Extraction
        logger.info("Stage 1: Document Ingestion")
        processor = DocumentProcessor()
        structured_data = processor.extract_text_and_tables(bucket, key)
        
        structured_data['metadata'] = {
            'document_id': context_id,
            'original_bucket': bucket,
            'original_key': key
        }
        
        # Stage 2: Knowledge Graph Construction
        logger.info("Stage 2: Knowledge Graph Construction")
        knowledge_graph = self.kg_builder.build_graph(structured_data)
        
        # Stage 3: Vector Embedding & Indexing
        logger.info("Stage 3: Vector Embedding")
        chunks = self.vector_store.chunk_document(structured_data)
        indexing_result = self.vector_store.index_chunks(chunks)
        
        # Update context
        self.context_manager.update_context(context_id, {
            'knowledge_graph': knowledge_graph,
            'chunks_indexed': indexing_result['indexed_count']
        })
        
        # Stage 4: Multi-Agent Analysis
        logger.info("Stage 4: Multi-Agent Analysis")
        analysis_result = self.cognitive_engine.orchestrate_analysis(
            structured_data,
            {'context_id': context_id}
        )
        
        # Stage 5: Generate Final Report
        logger.info("Stage 5: Generate Report")
        final_report = self._generate_final_report(
            structured_data,
            knowledge_graph,
            analysis_result,
            context
        )
        
        # Save results
        self._save_results(context_id, final_report)
        
        logger.info("Pipeline completed successfully")
        return final_report
    
    def _generate_final_report(self, document_data: Dict[str, Any],
                              knowledge_graph: Dict[str, Any],
                              analysis_result: Dict[str, Any],
                              context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate final comprehensive report"""
        
        recommendation = analysis_result.get('recommendation', {})
        synthesis = analysis_result.get('synthesis', {})
        agent_results = analysis_result.get('agent_results', {})
        
        # Compile executive summary
        executive_summary = {
            'decision': recommendation.get('decision'),
            'rationale': recommendation.get('rationale'),
            'confidence_score': recommendation.get('confidence_score'),
            'risk_level': synthesis.get('overall_assessment', 'Unknown'),
            'critical_risks_count': recommendation.get('critical_risks_count', 0),
            'compliance_status': synthesis.get('compliance_status', 'Unknown')
        }
        
        # Extract key findings from each agent
        key_findings = {}
        for agent_type, result in agent_results.items():
            if isinstance(result, dict):
                findings = result.get('findings', [])
                critical_findings = [
                    f for f in findings 
                    if isinstance(f, dict) and f.get('severity') in ['CRITICAL', 'HIGH']
                ]
                key_findings[str(agent_type)] = {
                    'total_findings': len(findings),
                    'critical_findings': len(critical_findings),
                    'reasoning': result.get('reasoning', '')
                }
        
        return {
            'document_id': document_data.get('metadata', {}).get('document_id'),
            'timestamp': context.get('timestamp'),
            'executive_summary': executive_summary,
            'recommendation': recommendation,
            'synthesis': synthesis,
            'agent_findings': key_findings,
            'knowledge_graph_summary': {
                'entities': knowledge_graph.get('metadata', {}).get('entity_count', 0),
                'relationships': knowledge_graph.get('metadata', {}).get('relationship_count', 0)
            },
            'risk_heatmap': recommendation.get('risk_heatmap', {}),
            'status': 'COMPLETED'
        }
    
    async def _save_results(self, context_id: str, report: Dict[str, Any]):
        """Save results to Supabase"""
        
        try:
            # Save to documents table
            document_data = {
                'document_id': context_id,
                'filename': report.get('document_id', context_id),
                'upload_date': datetime.utcnow().isoformat(),
                'status': report.get('status', 'COMPLETED'),
                'analysis_result': report.get('executive_summary', {})
            }
            await self.supabase.insert_document(document_data)
            
            # Save findings
            agent_findings = report.get('agent_findings', {})
            for agent_type, findings_data in agent_findings.items():
                if findings_data.get('critical_findings', 0) > 0:
                    finding_data = {
                        'document_id': context_id,
                        'agent_type': agent_type,
                        'severity': 'CRITICAL',
                        'category': 'risk',
                        'title': f'{agent_type} Critical Findings',
                        'description': findings_data.get('reasoning', ''),
                        'confidence_score': report['executive_summary'].get('confidence_score', 0.0)
                    }
                    await self.supabase.insert_finding(finding_data)
            
            # Save agent execution
            execution_data = {
                'document_id': context_id,
                'agent_name': 'orchestrator',
                'status': 'completed',
                'execution_time': 0.0,  # TODO: Calculate actual time
                'findings_count': sum(f.get('total_findings', 0) for f in agent_findings.values()),
                'confidence_score': report['executive_summary'].get('confidence_score', 0.0)
            }
            await self.supabase.insert_execution(execution_data)
            
            logger.info(f"Saved results to Supabase for {context_id}")
        except Exception as e:
            logger.error(f"Error saving results to Supabase: {e}")
            # Log to system_logs table
            try:
                await self.supabase.insert_log({
                    'log_level': 'ERROR',
                    'component': 'pipeline_orchestrator',
                    'message': f'Failed to save results: {str(e)}',
                    'metadata': {'context_id': context_id}
                })
            except:
                pass


# Lambda Handlers for Step Functions

@logger.inject_lambda_context
@tracer.capture_lambda_handler
def orchestrator_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Main orchestrator Lambda function
    """
    orchestrator = PipelineOrchestrator()
    
    bucket = event.get('bucket')
    key = event.get('key')
    
    if not bucket or not key:
        raise ValueError("Missing required parameters: bucket, key")
    
    result = orchestrator.process_document(bucket, key, event)
    
    return result


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def ingestion_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Handle ingestion stage
    """
    processor = DocumentProcessor()
    
    bucket = event['bucket']
    key = event['key']
    
    structured_data = processor.extract_text_and_tables(bucket, key)
    
    return {
        'statusCode': 200,
        'structured_data': structured_data,
        'bucket': bucket,
        'key': key
    }


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def knowledge_graph_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Handle knowledge graph construction
    """
    builder = KnowledgeGraphBuilder()
    
    structured_data = event['structured_data']
    knowledge_graph = builder.build_graph(structured_data)
    
    return {
        'statusCode': 200,
        'knowledge_graph': knowledge_graph
    }


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def vector_indexing_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Handle vector embedding and indexing
    """
    vector_store = VectorStoreManager()
    
    structured_data = event['structured_data']
    chunks = vector_store.chunk_document(structured_data)
    result = vector_store.index_chunks(chunks)
    
    return {
        'statusCode': 200,
        'indexing_result': result
    }


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def agent_orchestration_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Handle multi-agent orchestration
    """
    mcp_hub = MCPHub()
    cognitive_engine = CognitiveRiskEngine(mcp_hub)
    
    # Register agents
    from src.mcp_hub.cognitive_risk_engine import AgentType
    from src.agents.consistency_agent import ConsistencyAgent
    from src.agents.greenwashing_detector import GreenwashingDetectorAgent
    from src.agents.compliance_agent import ComplianceCheckAgent
    from src.agents.math_agent import MathAgent
    from src.agents.risk_analysis_agent import RiskAnalysisAgent
    
    cognitive_engine.register_agent(AgentType.CONSISTENCY, ConsistencyAgent(mcp_hub))
    cognitive_engine.register_agent(AgentType.GREENWASHING, GreenwashingDetectorAgent(mcp_hub))
    cognitive_engine.register_agent(AgentType.COMPLIANCE, ComplianceCheckAgent(mcp_hub))
    cognitive_engine.register_agent(AgentType.MATH, MathAgent(mcp_hub))
    cognitive_engine.register_agent(AgentType.RISK_ANALYSIS, RiskAnalysisAgent(mcp_hub))
    
    structured_data = event['structured_data']
    analysis_result = cognitive_engine.orchestrate_analysis(structured_data, event)
    
    return {
        'statusCode': 200,
        'analysis_result': analysis_result
    }
