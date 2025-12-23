"""
Compliance Check Agent
Ensures regulatory and legal compliance across multiple frameworks
"""
import json
import re
from typing import Dict, Any, List, Set
from aws_lambda_powertools import Logger, Tracer
from dataclasses import asdict
from .base_agent import BaseAgent, Finding

logger = Logger()
tracer = Tracer()


class ComplianceCheckAgent(BaseAgent):
    """
    Agent that checks compliance with regulatory frameworks
    """
    
    # Compliance frameworks and their required elements
    FRAMEWORKS = {
        'SEC': {
            'name': 'Securities and Exchange Commission',
            'required_disclosures': [
                'risk factors', 'management discussion', 'financial statements',
                'material events', 'related party transactions'
            ]
        },
        'GDPR': {
            'name': 'General Data Protection Regulation',
            'required_elements': [
                'data protection', 'privacy policy', 'consent',
                'data subject rights', 'data processing'
            ]
        },
        'SOX': {
            'name': 'Sarbanes-Oxley Act',
            'required_controls': [
                'internal controls', 'audit', 'financial reporting',
                'corporate governance', 'disclosure controls'
            ]
        },
        'Basel III': {
            'name': 'Basel III Banking Regulations',
            'required_metrics': [
                'capital adequacy', 'leverage ratio', 'liquidity coverage',
                'risk-weighted assets', 'tier 1 capital'
            ]
        },
        'TCFD': {
            'name': 'Task Force on Climate-related Financial Disclosures',
            'required_disclosures': [
                'governance', 'strategy', 'risk management', 'metrics and targets'
            ]
        }
    }
    
    def __init__(self, mcp_hub):
        super().__init__("Compliance Check Agent", mcp_hub)
    
    def has_relevant_content(self, document_data: Dict[str, Any]) -> bool:
        """Check if document has compliance-related content"""
        text_content = self.extract_text_content(document_data).lower()
        
        # Check for any regulatory/compliance indicators
        compliance_indicators = [
            'sec', 'securities', 'compliance', 'regulatory', 'regulation',
            'gdpr', 'data protection', 'privacy', 'sox', 'sarbanes',
            'basel', 'capital adequacy', 'audit', 'financial reporting',
            'tcfd', 'climate disclosure', 'risk factors', 'material events'
        ]
        
        has_compliance_content = any(indicator in text_content for indicator in compliance_indicators)
        
        # Only run if compliance-related content is present
        return has_compliance_content
    
    @tracer.capture_method
    def analyze(self, document_data: Dict[str, Any], 
               context: Dict[str, Any],
               previous_results: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Perform compliance analysis
        """
        logger.info("Starting compliance analysis")
        
        findings = []
        
        # Determine applicable frameworks
        applicable_frameworks = self._determine_applicable_frameworks(document_data, context)
        
        # Check each applicable framework
        for framework in applicable_frameworks:
            framework_findings = self._check_framework_compliance(
                framework, document_data
            )
            findings.extend(framework_findings)
        
        # Check for specific regulatory violations
        findings.extend(self._check_regulatory_violations(document_data))
        
        # Use LLM for nuanced compliance review
        findings.extend(self._llm_compliance_review(document_data, applicable_frameworks))
        
        # Calculate compliance score
        compliance_score = self._calculate_compliance_score(findings, applicable_frameworks)
        
        confidence = 0.85
        reasoning = self._generate_reasoning(findings, applicable_frameworks, compliance_score)
        
        return {
            'agent_type': 'compliance',
            'success': True,
            'findings': [asdict(f) for f in findings],
            'confidence': confidence,
            'reasoning': reasoning,
            'metadata': {
                'applicable_frameworks': [f['name'] for f in applicable_frameworks],
                'compliance_score': compliance_score,
                'critical_violations': len([f for f in findings if f.severity == 'CRITICAL'])
            }
        }
    
    def _determine_applicable_frameworks(self, document_data: Dict[str, Any], 
                                        context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Determine which regulatory frameworks apply"""
        
        applicable = []
        text_content = self.extract_text_content(document_data).lower()
        
        # Check for SEC (public companies, securities)
        if any(term in text_content for term in ['securities', 'public company', 'sec', 'stock']):
            applicable.append({
                'code': 'SEC',
                'name': self.FRAMEWORKS['SEC']['name'],
                'requirements': self.FRAMEWORKS['SEC']['required_disclosures']
            })
        
        # Check for GDPR (data protection, EU operations)
        if any(term in text_content for term in ['personal data', 'gdpr', 'data protection', 'privacy']):
            applicable.append({
                'code': 'GDPR',
                'name': self.FRAMEWORKS['GDPR']['name'],
                'requirements': self.FRAMEWORKS['GDPR']['required_elements']
            })
        
        # Check for SOX (financial reporting)
        if any(term in text_content for term in ['sarbanes', 'sox', 'internal controls', 'audit committee']):
            applicable.append({
                'code': 'SOX',
                'name': self.FRAMEWORKS['SOX']['name'],
                'requirements': self.FRAMEWORKS['SOX']['required_controls']
            })
        
        # Check for Basel III (banking)
        if any(term in text_content for term in ['basel', 'capital adequacy', 'bank', 'tier 1 capital']):
            applicable.append({
                'code': 'Basel III',
                'name': self.FRAMEWORKS['Basel III']['name'],
                'requirements': self.FRAMEWORKS['Basel III']['required_metrics']
            })
        
        # Check for TCFD (climate disclosures)
        if any(term in text_content for term in ['tcfd', 'climate risk', 'climate-related', 'climate disclosure']):
            applicable.append({
                'code': 'TCFD',
                'name': self.FRAMEWORKS['TCFD']['name'],
                'requirements': self.FRAMEWORKS['TCFD']['required_disclosures']
            })
        
        # Default to SEC if public company indicators present
        if not applicable and any(term in text_content for term in ['annual report', '10-k', '10-q']):
            applicable.append({
                'code': 'SEC',
                'name': self.FRAMEWORKS['SEC']['name'],
                'requirements': self.FRAMEWORKS['SEC']['required_disclosures']
            })
        
        return applicable
    
    def _check_framework_compliance(self, framework: Dict[str, Any], 
                                   document_data: Dict[str, Any]) -> List[Finding]:
        """Check compliance with specific framework"""
        
        findings = []
        text_content = self.extract_text_content(document_data).lower()
        
        # Check for required elements
        missing_elements = []
        partial_elements = []
        
        for requirement in framework['requirements']:
            # Check if requirement is addressed
            keywords = requirement.split()
            matches = sum(1 for kw in keywords if kw in text_content)
            coverage = matches / len(keywords) if keywords else 0
            
            if coverage == 0:
                missing_elements.append(requirement)
            elif coverage < 0.7:
                partial_elements.append(requirement)
        
        # Create findings for missing elements
        if missing_elements:
            findings.append(self.create_finding(
                severity='CRITICAL',
                category='compliance',
                title=f'{framework["code"]} - Missing Required Disclosures',
                description=f'Document does not address required {framework["code"]} elements',
                evidence=missing_elements,
                confidence=0.85,
                recommendations=[
                    f'Add section addressing: {", ".join(missing_elements[:3])}',
                    f'Ensure compliance with {framework["name"]} requirements'
                ]
            ))
        
        # Create findings for partial elements
        if partial_elements:
            findings.append(self.create_finding(
                severity='HIGH',
                category='compliance',
                title=f'{framework["code"]} - Incomplete Disclosures',
                description=f'Some {framework["code"]} requirements only partially addressed',
                evidence=partial_elements,
                confidence=0.80,
                recommendations=[
                    f'Expand coverage of: {", ".join(partial_elements[:3])}',
                    'Provide more detailed disclosures'
                ]
            ))
        
        return findings
    
    def _check_regulatory_violations(self, document_data: Dict[str, Any]) -> List[Finding]:
        """Check for specific regulatory violations"""
        
        findings = []
        text_content = self.extract_text_content(document_data).lower()
        
        # Check for problematic language
        red_flags = {
            'guaranteed returns': 'HIGH',
            'no risk': 'CRITICAL',
            'risk-free': 'CRITICAL',
            'guaranteed profit': 'CRITICAL',
            'insider information': 'CRITICAL',
            'tax evasion': 'CRITICAL',
            'offshore account': 'HIGH',
            'shell company': 'HIGH'
        }
        
        for phrase, severity in red_flags.items():
            if phrase in text_content:
                findings.append(self.create_finding(
                    severity=severity,
                    category='compliance',
                    title=f'Regulatory Red Flag: "{phrase}"',
                    description=f'Document contains potentially problematic language: "{phrase}"',
                    evidence=[f'Text contains: "{phrase}"'],
                    confidence=0.95,
                    recommendations=[
                        'Review and remove or clarify this language',
                        'Ensure compliance with securities regulations',
                        'Consult legal counsel'
                    ]
                ))
        
        # Check for adequate risk disclosures
        if 'risk' not in text_content or text_content.count('risk') < 3:
            findings.append(self.create_finding(
                severity='HIGH',
                category='compliance',
                title='Insufficient Risk Disclosures',
                description='Document lacks adequate risk factor disclosures',
                evidence=['Minimal or no risk factor discussion found'],
                confidence=0.80,
                recommendations=[
                    'Add comprehensive risk factors section',
                    'Disclose material risks to investors',
                    'Include both business and market risks'
                ]
            ))
        
        return findings
    
    def _llm_compliance_review(self, document_data: Dict[str, Any], 
                              frameworks: List[Dict[str, Any]]) -> List[Finding]:
        """Use LLM for nuanced compliance review"""
        
        findings = []
        text_content = self.extract_text_content(document_data)
        
        if not frameworks:
            return findings
        
        framework_names = ", ".join([f['code'] for f in frameworks])
        
        prompt = f"""You are a regulatory compliance expert. Review this document excerpt for compliance issues related to {framework_names}.

Document excerpt:
{text_content[:3000]}

Identify any compliance concerns, paying attention to:
1. Missing required disclosures
2. Misleading statements
3. Conflicts of interest
4. Inadequate risk disclosures
5. Regulatory violations

Respond in JSON format:
{{
  "compliance_issues": [
    {{
      "framework": "...",
      "issue": "...",
      "severity": "CRITICAL|HIGH|MEDIUM",
      "recommendation": "..."
    }}
  ]
}}
"""
        
        try:
            response = self.invoke_llm(prompt)
            
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                data = json.loads(json_str)
                
                for issue in data.get('compliance_issues', []):
                    findings.append(self.create_finding(
                        severity=issue.get('severity', 'MEDIUM'),
                        category='compliance',
                        title=f'{issue.get("framework", "General")} Compliance Issue',
                        description=issue.get('issue', ''),
                        evidence=['Identified through regulatory review'],
                        confidence=0.75,
                        recommendations=[issue.get('recommendation', 'Address compliance concern')]
                    ))
        
        except Exception as e:
            logger.error(f"Error in LLM compliance review: {e}")
        
        return findings
    
    def _calculate_compliance_score(self, findings: List[Finding], 
                                   frameworks: List[Dict[str, Any]]) -> float:
        """Calculate overall compliance score (0-100)"""
        
        if not frameworks:
            return 100.0
        
        # Start at 100 and deduct points for findings
        score = 100.0
        
        for finding in findings:
            if finding.severity == 'CRITICAL':
                score -= 25
            elif finding.severity == 'HIGH':
                score -= 15
            elif finding.severity == 'MEDIUM':
                score -= 5
        
        return max(0.0, score)
    
    def _generate_reasoning(self, findings: List[Finding], 
                           frameworks: List[Dict[str, Any]],
                           compliance_score: float) -> str:
        """Generate reasoning summary"""
        
        if not frameworks:
            return "No specific regulatory frameworks detected. General compliance review performed."
        
        framework_names = ", ".join([f['code'] for f in frameworks])
        
        if not findings:
            return f"Document appears compliant with {framework_names} requirements. Compliance score: {compliance_score:.1f}/100"
        
        critical = len([f for f in findings if f.severity == 'CRITICAL'])
        high = len([f for f in findings if f.severity == 'HIGH'])
        
        return (f"Reviewed against {framework_names}. "
                f"Found {len(findings)} compliance issue(s): "
                f"{critical} critical, {high} high priority. "
                f"Compliance score: {compliance_score:.1f}/100")
