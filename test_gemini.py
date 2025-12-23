"""
Test Gemini API Integration
Verifies that Gemini AI is working correctly for ASPERA agents
"""
import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

def test_gemini_connection():
    """Test basic Gemini API connection"""
    print("\n[TEST 1] Testing Gemini API Connection...")
    
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        return False
    
    print(f"✓ API Key found: {api_key[:10]}...")
    
    try:
        genai.configure(api_key=api_key)
        print("✓ Gemini API configured successfully")
        return True
    except Exception as e:
        print(f"❌ Error configuring Gemini: {e}")
        return False


def test_model_initialization():
    """Test Gemini model initialization"""
    print("\n[TEST 2] Testing Model Initialization...")
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        print("✓ Model initialized: gemini-2.0-flash-exp")
        return True, model
    except Exception as e:
        print(f"❌ Error initializing model: {e}")
        return False, None


def test_simple_generation(model):
    """Test simple text generation"""
    print("\n[TEST 3] Testing Simple Generation...")
    
    try:
        response = model.generate_content("Say 'Hello ASPERA!' in a professional tone.")
        print(f"✓ Response received:")
        print(f"  {response.text}\n")
        return True
    except Exception as e:
        print(f"❌ Error generating content: {e}")
        return False


def test_agent_prompt():
    """Test agent-style prompt with structured output"""
    print("\n[TEST 4] Testing Agent-Style Analysis...")
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = """
        You are a consistency checking agent for financial documents.
        
        Analyze the following statements for inconsistencies:
        1. "Our company generated $5 million in revenue in Q1 2024."
        2. "Total annual revenue for 2024 was $3 million."
        
        Return your analysis in JSON format:
        {
            "inconsistency_found": true/false,
            "severity": "CRITICAL/HIGH/MEDIUM/LOW",
            "description": "explanation",
            "confidence": 0.0-1.0
        }
        """
        
        config = genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=1024
        )
        
        response = model.generate_content(prompt, generation_config=config)
        print(f"✓ Agent analysis received:")
        print(f"{response.text}\n")
        return True
    except Exception as e:
        print(f"❌ Error in agent analysis: {e}")
        return False


def test_base_agent_integration():
    """Test BaseAgent class with Gemini"""
    print("\n[TEST 5] Testing BaseAgent Integration...")
    
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from src.agents.base_agent import BaseAgent
        
        class TestAgent(BaseAgent):
            def analyze(self, document_data, context, previous_results=None):
                prompt = "Analyze this test document and return 'Analysis complete'"
                return self.invoke_llm(prompt)
        
        # Create test agent (mcp_hub can be None for this test)
        agent = TestAgent("test_agent", None)
        
        # Test invoke_llm
        result = agent.invoke_llm("Say 'BaseAgent integration successful'")
        print(f"✓ BaseAgent.invoke_llm() works:")
        print(f"  {result}\n")
        return True
        
    except Exception as e:
        print(f"❌ Error testing BaseAgent: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_supabase_storage():
    """Test Supabase data storage"""
    print("\n[TEST 6] Testing Supabase Storage...")
    
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from src.utils.supabase_client import get_db
        
        client = get_db()
        print("✓ Supabase client initialized")
        
        # Test connection by listing documents
        result = client.client.table('documents').select('*').limit(5).execute()
        docs = result.data if result.data else []
        print(f"✓ Connected to Supabase - {len(docs)} sample documents retrieved")
        return True
        
    except Exception as e:
        print(f"❌ Error testing Supabase: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("ASPERA - Gemini & Supabase Integration Test")
    print("=" * 60)
    
    results = []
    
    # Test 1: Connection
    results.append(("Gemini Connection", test_gemini_connection()))
    
    # Test 2: Model Init
    success, model = test_model_initialization()
    results.append(("Model Initialization", success))
    
    if model:
        # Test 3: Simple Generation
        results.append(("Simple Generation", test_simple_generation(model)))
    
    # Test 4: Agent Prompt
    results.append(("Agent Analysis", test_agent_prompt()))
    
    # Test 5: BaseAgent Integration
    results.append(("BaseAgent Integration", test_base_agent_integration()))
    
    # Test 6: Supabase Storage
    results.append(("Supabase Storage", test_supabase_storage()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    total_tests = len(results)
    passed_tests = sum(1 for _, passed in results if passed)
    
    print(f"\nResults: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 All tests passed! Gemini & Supabase integration is working!")
        return 0
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. Check configuration.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
