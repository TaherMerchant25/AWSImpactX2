"""
Test Supabase Database Connection
Run this script to verify Supabase setup is working correctly
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.supabase_client import get_db

async def test_connection():
    """Test Supabase database connection"""
    print("=" * 60)
    print("ASPERA Supabase Connection Test")
    print("=" * 60)
    print()
    
    # Check environment variables
    print("[1/6] Checking environment variables...")
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing environment variables")
        print("   Please set SUPABASE_URL and SUPABASE_KEY in your .env file")
        return False
    
    print(f"✓ SUPABASE_URL: {supabase_url[:30]}...")
    print(f"✓ SUPABASE_KEY: {'*' * 20}")
    print()
    
    try:
        # Initialize database
        print("[2/6] Initializing Supabase client...")
        db = get_db()
        print("✓ Client initialized")
        print()
        
        # Test connection
        print("[3/6] Testing database connection...")
        is_healthy = await db.health_check()
        if not is_healthy:
            print("❌ ERROR: Health check failed")
            return False
        print("✓ Connection successful")
        print()
        
        # Test document operations
        print("[4/6] Testing document operations...")
        doc = await db.create_document(
            filename="test-document.pdf",
            file_type="pdf",
            file_size=1024000,
            metadata={"test": True}
        )
        doc_id = doc.get('id')
        print(f"✓ Created document: {doc_id}")
        
        retrieved = await db.get_document(doc_id)
        print(f"✓ Retrieved document: {retrieved.get('filename')}")
        
        updated = await db.update_document_status(doc_id, 'completed')
        print(f"✓ Updated status: {updated.get('processing_status')}")
        print()
        
        # Test finding operations
        print("[5/6] Testing finding operations...")
        finding = await db.create_finding(
            document_id=doc_id,
            agent_type="test_agent",
            severity="medium",
            title="Test Finding",
            description="This is a test finding",
            recommendation="Test recommendation",
            confidence_score=0.95
        )
        print(f"✓ Created finding: {finding.get('id')}")
        
        findings = await db.get_findings_by_document(doc_id)
        print(f"✓ Retrieved {len(findings)} finding(s)")
        print()
        
        # Test agent execution tracking
        print("[6/6] Testing agent execution tracking...")
        execution = await db.create_agent_execution(
            document_id=doc_id,
            agent_type="test_agent"
        )
        exec_id = execution.get('id')
        print(f"✓ Created execution: {exec_id}")
        
        completed = await db.complete_agent_execution(
            execution_id=exec_id,
            findings_count=1,
            execution_time_ms=5000
        )
        print(f"✓ Completed execution: {completed.get('status')}")
        print()
        
        # Test analytics
        print("Testing analytics views...")
        stats = await db.get_document_stats()
        print(f"✓ Document stats: {len(stats)} status groups")
        
        performance = await db.get_agent_performance()
        print(f"✓ Agent performance: {len(performance)} agents tracked")
        print()
        
        # Test logging
        print("Testing system logging...")
        await db.log('info', 'Test log message', 'test_component', {'test': True})
        logs = await db.get_logs(limit=1)
        print(f"✓ Created log entry: {logs[0].get('message') if logs else 'None'}")
        print()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print()
        print("Your Supabase database is properly configured and working.")
        print()
        print("Next steps:")
        print("1. Update frontend/.env.local with your Supabase credentials")
        print("2. Run 'cd frontend && npm install' to install Supabase client")
        print("3. Start the application with './start.ps1'")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        print()
        print("Troubleshooting:")
        print("1. Verify your SUPABASE_URL and SUPABASE_KEY are correct")
        print("2. Run the schema.sql in your Supabase SQL Editor")
        print("3. Check that RLS policies allow operations")
        print("4. Ensure supabase-py is installed: pip install supabase")
        print()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    sys.exit(0 if result else 1)
