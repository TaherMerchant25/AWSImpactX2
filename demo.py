"""
ASPERA Demo - AI Agents with Gemini + Supabase
Interactive demo showing agent capabilities
"""
import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import datetime
import asyncio

# Load environment
load_dotenv()

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(f" {text}")
    print("=" * 70 + "\n")

def print_section(text):
    """Print formatted section"""
    print(f"\n{'─' * 70}")
    print(f" {text}")
    print('─' * 70)

async def demo_consistency_agent():
    """Demo consistency checking"""
    print_header("🔍 CONSISTENCY AGENT DEMO")
    
    from src.agents.consistency_agent import ConsistencyAgent
    from src.mcp_hub.mcp_hub import MCPHub
    
    print("Initializing Consistency Agent with Gemini...")
    agent = ConsistencyAgent(MCPHub())
    
    print_section("Test Document with Inconsistencies")
    
    document_data = {
        'text_content': [
            {'text': 'Our company achieved $5 million in revenue during Q1 2024.'},
            {'text': 'The total annual revenue for 2024 was $3 million.'},
            {'text': 'We grew revenue by 200% compared to the previous year.'},
            {'text': 'Previous year (2023) revenue stood at $1.5 million.'}
        ],
        'metadata': {'document_id': 'demo_001'}
    }
    
    print("Document statements:")
    for i, item in enumerate(document_data['text_content'], 1):
        print(f"  {i}. {item['text']}")
    
    print_section("Agent Analysis (Gemini 2.0 Flash)")
    print("Analyzing for consistency issues...")
    
    result = agent.analyze(document_data, {})
    
    print(f"\n✓ Analysis complete!")
    print(f"  Confidence: {result.confidence:.2%}")
    print(f"  Findings: {len(result.findings)}")
    
    if result.findings:
        print("\n📋 Detected Issues:")
        for i, finding in enumerate(result.findings, 1):
            print(f"\n  [{i}] {finding.title}")
            print(f"      Severity: {finding.severity}")
            print(f"      Category: {finding.category}")
            print(f"      Description: {finding.description}")
            print(f"      Confidence: {finding.confidence:.2%}")
    
    print(f"\n💭 Agent Reasoning:")
    print(f"   {result.reasoning}\n")
    
    return result

async def demo_greenwashing_detector():
    """Demo greenwashing detection"""
    print_header("🌱 GREENWASHING DETECTOR DEMO")
    
    from src.agents.greenwashing_detector import GreenwashingDetectorAgent
    from src.mcp_hub.mcp_hub import MCPHub
    
    print("Initializing Greenwashing Detector with Gemini...")
    agent = GreenwashingDetectorAgent(MCPHub())
    
    print_section("Test Document with Environmental Claims")
    
    document_data = {
        'text_content': [
            {'text': 'Our product is 100% eco-friendly and carbon neutral.'},
            {'text': 'We use sustainable materials in all our manufacturing.'},
            {'text': 'Certified carbon neutral by independent auditors since 2020.'},
            {'text': 'No third-party verification available for our claims.'}
        ],
        'metadata': {'document_id': 'demo_002'}
    }
    
    print("Environmental claims:")
    for i, item in enumerate(document_data['text_content'], 1):
        print(f"  {i}. {item['text']}")
    
    print_section("Agent Analysis (Gemini 2.0 Flash)")
    print("Analyzing for greenwashing indicators...")
    
    result = agent.analyze(document_data, {})
    
    print(f"\n✓ Analysis complete!")
    print(f"  Confidence: {result.confidence:.2%}")
    print(f"  Findings: {len(result.findings)}")
    
    if result.findings:
        print("\n📋 Detected Issues:")
        for i, finding in enumerate(result.findings, 1):
            print(f"\n  [{i}] {finding.title}")
            print(f"      Severity: {finding.severity}")
            print(f"      Category: {finding.category}")
            print(f"      Description: {finding.description}")
            
            if finding.recommendations:
                print(f"      Recommendations:")
                for rec in finding.recommendations:
                    print(f"        - {rec}")
    
    print(f"\n💭 Agent Reasoning:")
    print(f"   {result.reasoning}\n")
    
    return result

async def demo_supabase_storage():
    """Demo Supabase data storage"""
    print_header("💾 SUPABASE STORAGE DEMO")
    
    from src.utils.supabase_client import get_db
    
    print("Connecting to Supabase...")
    db = get_db()
    print("✓ Connected!\n")
    
    print_section("Storing Demo Results")
    
    # Create demo document
    doc_id = f"demo_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    print(f"Creating document: {doc_id}")
    
    document_data = {
        'filename': 'demo_analysis.pdf',
        'file_type': 'application/pdf',
        'file_size': 125000,
        's3_key': f'demos/{doc_id}.pdf',
        'processing_status': 'completed',
        'metadata': {
            'demo': True,
            'timestamp': datetime.now().isoformat()
        }
    }
    
    result = await db.create_document(**document_data)
    print(f"✓ Document created: ID {result.get('id')}")
    
    # Create demo finding
    print("\nCreating finding...")
    
    finding_data = {
        'document_id': result.get('id'),
        'agent_type': 'consistency',
        'severity': 'HIGH',
        'category': 'financial',
        'title': 'Revenue Inconsistency Detected',
        'description': 'Q1 revenue exceeds annual total',
        'evidence': ['Statement 1', 'Statement 2'],
        'recommendations': ['Verify revenue figures', 'Check calculation methodology'],
        'confidence_score': 0.95
    }
    
    finding = await db.create_finding(**finding_data)
    print(f"✓ Finding created: ID {finding.get('id')}")
    
    # Create execution log
    print("\nCreating agent execution log...")
    
    execution_data = {
        'document_id': result.get('id'),
        'agent_name': 'consistency_agent',
        'status': 'completed',
        'execution_time': 2.5,
        'findings_count': 1,
        'confidence_score': 0.95,
        'metadata': {
            'model': 'gemini-2.0-flash-exp',
            'tokens_used': 1500
        }
    }
    
    execution = await db.create_execution(**execution_data)
    print(f"✓ Execution logged: ID {execution.get('id')}")
    
    print_section("Retrieving Data from Supabase")
    
    # Get recent documents
    print("\nFetching recent documents...")
    docs = db.client.table('documents').select('*').limit(3).execute()
    print(f"✓ Retrieved {len(docs.data)} documents")
    
    for doc in docs.data:
        print(f"  - {doc['filename']} ({doc['processing_status']})")
    
    # Get recent findings
    print("\nFetching recent findings...")
    findings = db.client.table('findings').select('*').limit(3).execute()
    print(f"✓ Retrieved {len(findings.data)} findings")
    
    for f in findings.data:
        print(f"  - {f['title']} ({f['severity']})")
    
    print("\n✅ Supabase storage working perfectly!\n")
    
    return result

async def demo_full_pipeline():
    """Demo complete analysis pipeline"""
    print_header("🚀 FULL PIPELINE DEMO")
    
    print("This demo shows the complete ASPERA workflow:")
    print("  1. Consistency Agent analyzes document")
    print("  2. Greenwashing Detector checks claims")
    print("  3. Results stored in Supabase")
    print("  4. Findings displayed on dashboard")
    
    input("\nPress Enter to start pipeline demo...")
    
    # Run consistency agent
    consistency_result = await demo_consistency_agent()
    
    input("\nPress Enter to continue...")
    
    # Run greenwashing detector
    greenwashing_result = await demo_greenwashing_detector()
    
    input("\nPress Enter to continue...")
    
    # Store in Supabase
    storage_result = await demo_supabase_storage()
    
    print_header("✨ PIPELINE COMPLETE")
    
    print("Summary:")
    print(f"  ✓ Consistency Agent: {len(consistency_result.findings)} findings")
    print(f"  ✓ Greenwashing Detector: {len(greenwashing_result.findings)} findings")
    print(f"  ✓ Data stored in Supabase")
    print("\n🎉 All systems operational!")

def print_menu():
    """Print demo menu"""
    print_header("ASPERA AI AGENTS - INTERACTIVE DEMO")
    
    print("Choose a demo:")
    print()
    print("  [1] Consistency Agent - Detect data inconsistencies")
    print("  [2] Greenwashing Detector - Analyze environmental claims")
    print("  [3] Supabase Storage - Database operations")
    print("  [4] Full Pipeline - Complete workflow")
    print("  [Q] Quit")
    print()

async def main():
    """Main demo loop"""
    
    # Verify environment
    if not os.getenv('GEMINI_API_KEY'):
        print("❌ GEMINI_API_KEY not found in environment")
        print("Please add it to your .env file")
        return
    
    if not os.getenv('SUPABASE_URL'):
        print("❌ SUPABASE_URL not found in environment")
        print("Please add it to your .env file")
        return
    
    print("✓ Environment configured")
    print(f"✓ Gemini API: {os.getenv('GEMINI_API_KEY')[:10]}...")
    print(f"✓ Supabase: {os.getenv('SUPABASE_URL')}")
    
    while True:
        print_menu()
        choice = input("Your choice: ").strip().upper()
        
        if choice == 'Q':
            print("\nThank you for using ASPERA! 👋\n")
            break
        elif choice == '1':
            await demo_consistency_agent()
            input("\nPress Enter to continue...")
        elif choice == '2':
            await demo_greenwashing_detector()
            input("\nPress Enter to continue...")
        elif choice == '3':
            await demo_supabase_storage()
            input("\nPress Enter to continue...")
        elif choice == '4':
            await demo_full_pipeline()
            input("\nPress Enter to continue...")
        else:
            print("\n⚠️  Invalid choice. Please try again.\n")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nDemo interrupted. Goodbye! 👋\n")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
