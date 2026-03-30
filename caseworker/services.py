import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.core.cache import cache

logger = logging.getLogger(__name__)


class MCPService:
    """Service for managing MCP server connections and case data retrieval."""

    MCP_TIMEOUT = 10
    CACHE_TIMEOUT = 3600  # 1 hour
    MAX_RETRIES = 3

    def test_connection(self, server):
        try:
            headers = self._get_headers(server)
            response = requests.get(f"{server.url}/health", headers=headers, timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"MCP server {server.name} connection test failed: {e}")
            return False

    def _get_headers(self, server):
        if server.auth_type == "bearer":
            return {"Authorization": f"Bearer {server.auth_token}"}
        elif server.auth_type == "api_key":
            return {"X-API-Key": server.auth_token}
        return {}

    def retrieve_case_data(self, case_number):
        cache_key = f"cw_case_data_{case_number}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        data = self.retrieve_case_data_parallel(case_number)
        if data:
            cache.set(cache_key, data, self.CACHE_TIMEOUT)
        return data

    def retrieve_case_data_parallel(self, case_number):
        from .models import MCPServer

        servers = MCPServer.objects.filter(status="connected")
        if not servers.exists():
            logger.warning("No connected MCP servers found")
            return None

        case_data = {}
        with ThreadPoolExecutor(max_workers=len(servers)) as executor:
            futures = {
                executor.submit(self._retrieve_from_server, server, case_number): server
                for server in servers
            }
            for future in as_completed(futures):
                server = futures[future]
                try:
                    data = future.result()
                    if data:
                        case_data.update(data)
                except Exception as e:
                    logger.error(f"Failed to retrieve from {server.name}: {e}")

        return case_data if case_data else None

    def _retrieve_from_server(self, server, case_number, retry_count=0):
        try:
            headers = self._get_headers(server)
            response = requests.get(
                f"{server.url}/api/cases/{case_number}",
                headers=headers,
                timeout=self.MCP_TIMEOUT,
            )
            if response.status_code == 200:
                return response.json()
            return None
        except requests.Timeout:
            if retry_count < self.MAX_RETRIES:
                return self._retrieve_from_server(server, case_number, retry_count + 1)
            return None
        except Exception as e:
            logger.error(f"Error retrieving from {server.name}: {e}")
            return None


class LLMService:
    """Service for LLM provider connections using the Anthropic SDK or LangChain."""

    def get_llm(self, provider=None):
        if provider is None:
            from .models import LLMProvider

            provider = LLMProvider.objects.filter(is_active=True).first()
            if not provider:
                raise ValueError("No active LLM provider configured")

        if provider.provider_type == "anthropic":
            return AnthropicWrapper(
                api_key=provider.api_key,
                model=provider.model,
                max_tokens=provider.max_tokens,
            )

        # Fall back to LangChain for other providers
        try:
            if provider.provider_type == "openai":
                from langchain_openai import OpenAI

                return OpenAI(
                    api_key=provider.api_key,
                    model=provider.model,
                    temperature=provider.temperature,
                    max_tokens=provider.max_tokens,
                )
            elif provider.provider_type == "google":
                from langchain_google_genai import GoogleGenerativeAI

                return GoogleGenerativeAI(
                    google_api_key=provider.api_key,
                    model=provider.model,
                    temperature=provider.temperature,
                    max_output_tokens=provider.max_tokens,
                )
        except ImportError as e:
            raise ValueError(f"LangChain provider not installed: {e}")

        raise ValueError(f"Unsupported provider type: {provider.provider_type}")

    def test_connection(self, provider):
        try:
            llm = self.get_llm(provider)
            response = self._call_llm(llm, "Hello")
            return bool(response)
        except Exception as e:
            logger.error(
                f"LLM provider {provider.provider_type} connection test failed: {e}"
            )
            return False

    def _call_llm(self, llm, prompt):
        """Call LLM with compatibility for both old (predict) and new (invoke) APIs."""
        if hasattr(llm, "invoke"):
            # New LangChain API (v1.x+)
            response = llm.invoke(prompt)
            # Handle different response types
            if hasattr(response, "content"):
                return response.content
            return str(response)
        elif hasattr(llm, "predict"):
            # Old LangChain API (v0.x)
            return llm.predict(prompt)
        else:
            raise AttributeError("LLM object has neither 'invoke' nor 'predict' method")


class AnthropicWrapper:
    """Thin wrapper around the Anthropic SDK with a predict() interface."""

    def __init__(self, api_key, model="claude-opus-4-6", max_tokens=2000):
        import anthropic

        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model
        self._max_tokens = max_tokens

    def predict(self, prompt: str) -> str:
        response = self._client.messages.create(
            model=self._model,
            max_tokens=self._max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text


class SummaryGenerationService:
    """Service for generating summaries using an LLM and a skill prompt."""

    MAX_RETRIES = 3

    def generate_summary(self, case_data, skill, query):
        try:
            return self._generate_with_retry(case_data, skill, query)
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            return f"Error generating summary: {e}"

    def _generate_with_retry(self, case_data, skill, query, retry_count=0):
        try:
            llm_service = LLMService()
            llm = llm_service.get_llm()
            prompt = self._render_prompt(skill.prompt, case_data, query)
            return llm_service._call_llm(llm, prompt)
        except Exception:
            if retry_count < self.MAX_RETRIES:
                return self._generate_with_retry(
                    case_data, skill, query, retry_count + 1
                )
            raise

    def _render_prompt(self, template, case_data, query):
        try:
            return template.format(
                case_data=str(case_data) if case_data else "",
                query=query or "",
            )
        except KeyError:
            return template

    def validate_skill_prompt(self, skill):
        if not skill.prompt:
            return False, "Prompt is empty"
        return True, "Prompt is valid"
