import json
import re
from typing import Type, TypeVar, Optional, Dict, Any, List
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from pydantic import BaseModel, ValidationError
from backend.config import settings
from backend.utils.logger import LoggerFactory

logger = LoggerFactory.get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

class OpenRouterService:
    """
    Singleton service for OpenRouter API calls with strict JSON validation and fallback mechanisms.
    """
    _instance = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @property
    def client(self) -> OpenAI:
        if self._client is None:
            self._client = OpenAI(
                base_url=settings.OPENROUTER_BASE_URL,
                api_key=settings.OPENROUTER_API_KEY,
                default_headers={
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "Cricket AI Multiplayer"
                }
            )
        return self._client
    
    @staticmethod
    def _extract_json(text: str) -> Optional[str]:
        """Extract JSON object from string using multiple strategies."""
        # Strategy 1: Find JSON between curly braces
        match = re.search(r'\{[^{}]*\{[^{}]*\}[^{}]*\}', text, re.DOTALL)
        if match:
            return match.group(0)
        
        # Strategy 2: Find simple JSON object
        match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
        if match:
            return match.group(0)
        
        # Strategy 3: Try to fix common issues
        fixed = text.strip()
        if not fixed.startswith('{'):
            fixed = '{' + fixed
        if not fixed.endswith('}'):
            fixed = fixed + '}'
        
        try:
            json.loads(fixed)
            return fixed
        except:
            pass
        
        return None
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((json.JSONDecodeError, ValidationError, ValueError)),
        reraise=True
    )
    def chat_with_json(
        self,
        messages: List[Dict[str, str]],
        output_schema: Type[T],
        system_prompt: str = "You are a helpful assistant that always responds in valid JSON.",
        temperature: float = 0.3,
        max_tokens: int = 500
    ) -> T:
        """
        Send a chat completion request and enforce strict JSON output.
        Uses OpenRouter's native json_schema when available.
        """
        # Build the json_schema from the Pydantic model
        schema = output_schema.model_json_schema()
        
        # Prepare the response format for strict JSON
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": output_schema.__name__,
                "strict": True,
                "schema": schema
            }
        }
        
        try:
            logger.debug(f"Requesting JSON for schema: {output_schema.__name__}")
            completion = self.client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=messages,
                response_format=response_format,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            raw_content = completion.choices[0].message.content
            logger.debug(f"Raw API response: {raw_content[:200]}...")
            
            if not raw_content:
                raise ValueError("Empty response content from API")
            
            # Parse and validate
            parsed = json.loads(raw_content)
            validated = output_schema.model_validate(parsed)
            logger.info(f"Successfully validated response for {output_schema.__name__}")
            return validated
            
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            logger.warning(f"Primary JSON parsing failed: {str(e)}. Attempting fallback...")
            
            # Fallback: Standard completion with manual parsing
            fallback_completion = self.client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            raw = fallback_completion.choices[0].message.content or ""
            json_str = self._extract_json(raw)
            
            if not json_str:
                raise ValueError(f"Could not extract valid JSON from response: {raw[:200]}") from e
            
            try:
                parsed = json.loads(json_str)
                return output_schema.model_validate(parsed)
            except Exception as parse_error:
                logger.error(f"Fallback parsing failed: {str(parse_error)}")
                raise ValueError("All JSON parsing strategies failed") from parse_error
    
    async def generate_text(
        self,
        prompt: str,
        system_prompt: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: int = 200
    ) -> str:
        """Generate plain text response."""
        try:
            completion = self.client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Text generation failed: {str(e)}")
            return "Could not generate response at this time."

# Create singleton instance
openrouter_service = OpenRouterService()