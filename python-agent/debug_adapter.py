
from langchain_openai import ChatOpenAI
import asyncio

class OpenAIAdapter(ChatOpenAI):
    provider: str = "openai"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not hasattr(self, 'provider') or not self.provider:
            self.provider = "openai"

    async def ainvoke(self, *args, **kwargs):
        return await super().ainvoke(*args, **kwargs)

async def main():
    try:
        llm = OpenAIAdapter(api_key="sk-test", model="gpt-4o-mini", temperature=0.1)
        print("Instance created.")
        print(f"Has ainvoke? {hasattr(llm, 'ainvoke')}")
        print(f"Dir: {dir(llm)}")
        try:
            await llm.ainvoke("test")
        except Exception as e:
            print(f"Call failed: {e}")
    except Exception as e:
        print(f"Creation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
