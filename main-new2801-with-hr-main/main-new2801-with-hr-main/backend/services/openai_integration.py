"""OpenAI Integration Service - GPT-5.1 + Vision API"""
import os
import base64
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
except ImportError:
    LlmChat = None
    UserMessage = None
    ImageContent = None


class OpenAIService:
    """OpenAI integration using Emergent LLM Key"""
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY", "sk-emergent-2BfB7092316E08a972")
        if not LlmChat:
            raise ImportError("emergentintegrations not installed. Run: pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/")
    
    async def analyze_text(self, prompt: str, context: Optional[str] = None, model: str = "gpt-5.1") -> str:
        """Analyze text using GPT"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"text_analysis_{os.urandom(8).hex()}",
            system_message="You are an AI assistant specialized in restaurant and hospitality operations."
        ).with_model("openai", model)
        
        full_prompt = prompt
        if context:
            full_prompt = f"Context: {context}\n\n{prompt}"
        
        message = UserMessage(text=full_prompt)
        response = await chat.send_message(message)
        return response
    
    async def forecast_demand(self, historical_data: list, item_name: str) -> Dict[str, Any]:
        """AI-powered demand forecasting"""
        prompt = f"""
Analyze the following historical consumption data for {item_name} and provide a demand forecast:

Historical Data:
{historical_data}

Provide:
1. Predicted consumption for the next 7 days
2. Confidence level (0-100)
3. Seasonal patterns detected
4. Recommended order quantity
5. Key insights

Format your response as JSON.
"""
        response = await self.analyze_text(prompt)
        return {"analysis": response, "item_name": item_name}
    
    async def analyze_invoice_image(self, image_base64: str) -> Dict[str, Any]:
        """OCR and analysis of invoice image"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"invoice_ocr_{os.urandom(8).hex()}",
            system_message="You are an OCR specialist. Extract invoice data accurately."
        ).with_model("openai", "gpt-5.1")
        
        image_content = ImageContent(image_base64=image_base64)
        
        prompt = """
Extract the following information from this invoice image:

1. Invoice number
2. Supplier name
3. Invoice date
4. Due date (if present)
5. Line items (description, quantity, unit price, total)
6. Subtotal
7. Tax amount
8. Total amount

Format as JSON with this structure:
{
  "invoice_number": "",
  "supplier_name": "",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "line_items": [{"description": "", "quantity": 0, "unit_price": 0, "total": 0}],
  "subtotal": 0,
  "tax": 0,
  "total": 0
}
"""
        
        message = UserMessage(text=prompt, file_contents=[image_content])
        response = await chat.send_message(message)
        return {"ocr_result": response}
    
    async def analyze_receipt(self, image_base64: str) -> Dict[str, Any]:
        """OCR for expense receipts"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"receipt_ocr_{os.urandom(8).hex()}",
            system_message="You are an OCR specialist for expense receipts."
        ).with_model("openai", "gpt-5.1")
        
        image_content = ImageContent(image_base64=image_base64)
        
        prompt = """
Extract from this receipt:
1. Vendor/merchant name
2. Date (YYYY-MM-DD format)
3. Total amount
4. Currency
5. Receipt/transaction number (if visible)

Return as JSON: {"vendor": "", "date": "", "amount": 0, "currency": "", "receipt_number": ""}
"""
        
        message = UserMessage(text=prompt, file_contents=[image_content])
        response = await chat.send_message(message)
        return {"ocr_result": response}


# Singleton instance
openai_service = OpenAIService()
