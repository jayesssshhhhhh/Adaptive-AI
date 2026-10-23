import asyncio
from app.services.ai_service import generate_study_material

async def run():
    res = await generate_study_material("Python", "Decorators", 5)
    print("--- RESPONSE ---")
    print(res)

asyncio.run(run())
