"""
Diagram Generator - Mermaid diagrams for observability
"""

from typing import List, Dict, Any

class DiagramGenerator:
    @staticmethod
    def generate_sequence_diagram(steps: List[Dict[str, Any]]) -> str:
        """Generate mermaid sequence diagram from steps"""
        mermaid = "sequenceDiagram\n"
        mermaid += "    participant Client\n"
        mermaid += "    participant API\n"
        
        participants = set()
        for step in steps:
            domain = step.get('domain', 'SYSTEM')
            if domain not in participants:
                participants.add(domain)
                mermaid += f"    participant {domain}\n"
        
        for step in steps:
            domain = step.get('domain', 'SYSTEM')
            title = step.get('title', 'Unknown')
            status = step.get('status', 'PENDING')
            
            if status == 'FAILED':
                mermaid += f"    Client->>+{domain}: {title}\n"
                mermaid += f"    {domain}-->>-Client: ❌ FAILED\n"
            elif status == 'SUCCESS':
                mermaid += f"    Client->>+{domain}: {title}\n"
                mermaid += f"    {domain}-->>-Client: ✓ SUCCESS\n"
            else:
                mermaid += f"    Note over {domain}: {status}\n"
        
        return mermaid
    
    @staticmethod
    def generate_state_diagram(steps: List[Dict[str, Any]]) -> str:
        """Generate mermaid state diagram"""
        mermaid = "stateDiagram-v2\n"
        mermaid += "    [*] --> INITIATED\n"
        
        for i, step in enumerate(steps):
            step_id = step.get('step_id', f'STEP_{i}')
            status = step.get('status', 'PENDING')
            
            if i == 0:
                mermaid += f"    INITIATED --> {step_id}\n"
            else:
                prev_id = steps[i-1].get('step_id', f'STEP_{i-1}')
                mermaid += f"    {prev_id} --> {step_id}\n"
            
            # Add note for failed steps
            if status == 'FAILED':
                mermaid += f"    {step_id} --> [*]: ❌ FAILED\n"
                break
        
        # Complete if all success
        if all(s.get('status') == 'SUCCESS' for s in steps):
            last_step = steps[-1].get('step_id', 'FINAL')
            mermaid += f"    {last_step} --> [*]: ✓ COMPLETE\n"
        
        return mermaid
    
    @staticmethod
    def generate_timeline_html(steps: List[Dict[str, Any]]) -> str:
        """Generate HTML timeline"""
        html = '<div class="timeline">'
        
        for step in steps:
            status = step.get('status', 'PENDING')
            title = step.get('title', 'Unknown')
            domain = step.get('domain', 'SYSTEM')
            
            color = {
                'SUCCESS': 'green',
                'FAILED': 'red',
                'PENDING': 'yellow',
                'PARTIAL': 'orange',
                'SKIPPED': 'gray'
            }.get(status, 'gray')
            
            html += f'<div class="step {status.lower()}" style="border-left: 4px solid {color};">'
            html += f'<h4>{title}</h4>'
            html += f'<p>{domain} - {status}</p>'
            html += '</div>'
        
        html += '</div>'
        return html
