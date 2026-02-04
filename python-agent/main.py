from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
from contextlib import asynccontextmanager
import asyncio
import os
import uvicorn
from dotenv import load_dotenv

# Browser-use imports
from browser_use import Agent, Browser, BrowserProfile, ChatGoogle
import tempfile
from pathlib import Path
from browser_patch import apply_patches

# Apply the "Deep Fix" for radio buttons at runtime
apply_patches()

import logging

# Setup file logging
logging.basicConfig(
    filename='debug_agent.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

load_dotenv()

# --- GLOBAL CONFIGURATION ---

# 1. API Key Check
gemini_key = os.getenv("GEMINI_API_KEY")
if not gemini_key:
    raise ValueError("GEMINI_API_KEY is not set in environment variables.")

# 2. Global LLM Initialization (Native ChatGoogle)
print("✅ Initializing Global LLM (Gemini 1.5 Flash - Thrifty Native)...")
llm = ChatGoogle(
    model="gemini-flash-latest",
    api_key=gemini_key,
    max_retries=10, 
    retry_base_delay=10.0, # Slow down to respect 5 RPM free tier
)

# 3. Database Connection (Motor for Async MongoDB)
from motor.motor_asyncio import AsyncIOMotorClient
import json

mongodb_uri = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(mongodb_uri)
db = client.get_database() # Uses the DB from URI or default
sessions_collection = db.user_sessions

async def load_session(username: str, platform: str):
    """Loads storage state from MongoDB, isolated by platform."""
    session = await sessions_collection.find_one({
        "username": username,
        "platform_name": platform.lower()
    })
    if session:
        print(f"📦 Found saved session for {username} on {platform} in DB.")
        return session.get("sessionData")
    print(f"➖ No saved session for {username} on {platform} in DB.")
    return None

async def save_session(username: str, platform: str, session_data: dict):
    """Saves storage state to MongoDB, isolated by platform."""
    await sessions_collection.update_one(
        {"username": username, "platform_name": platform.lower()},
        {"$set": {
            "sessionData": session_data, 
            "updatedAt": asyncio.get_event_loop().time()
        }},
        upsert=True
    )
    print(f"💾 Session for {username} on {platform} saved to DB.")

# 4. Global Browser Profile
profile = BrowserProfile(
    headless=False,
    executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    disable_security=True,
    wait_for_network_idle_page_load_time=3.0,
    wait_between_actions=2.0,
)

# Global browser instance container
global_browser = None

async def get_browser():
    """Returns a healthy browser instance. Restarts if necessary."""
    global global_browser
    if global_browser is None:
        print("🚀 [Init] Initializing Global Browser instance...")
        global_browser = Browser(browser_profile=profile)
        print("🚀 [Init] Starting browser engine (await global_browser.start())...")
        await global_browser.start()
        print("🚀 [Init] Browser started successfully.")
    return global_browser

# --- FASTAPI SETUP ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 [Lifespan] Server starting up. Browser will initialize on task start.")
    yield
    # Shutdown: Close the browser
    if global_browser:
        print("🛑 [Lifespan] Closing Global Browser...")
        try:
            await global_browser.stop()
            print("🛑 [Lifespan] Browser stopped.")
        except Exception as e:
            print(f"🛑 [Lifespan] Error during browser stop: {e}")

app = FastAPI(lifespan=lifespan)

class TaskRequest(BaseModel):
    url: str
    resume_text: str
    resume_path: str = ""
    rules: str = ""
    username: str = ""
    password: str = ""
    platform_name: str = "LinkedIn"
    login_url: str = ""

def generate_task_prompt(request: TaskRequest):
    """Generates a dynamic prompt based on the requested platform."""
    is_url = request.url.lower().startswith("http")
    target_url = request.url if is_url else ""
    search_context = request.url if not is_url else "jobs matching my skills"
    platform = request.platform_name.strip()
    
    if platform.lower() == "linkedin" and "indeed.com" in request.url.lower():
        platform = "Indeed"
    elif platform.lower() == "linkedin" and "glassdoor.com" in request.url.lower():
        platform = "Glassdoor"
    
    login_url = request.login_url or f"https://www.{platform.lower()}.com/login"
    
    if platform.lower() == "linkedin" and not target_url:
        target_url = "https://www.linkedin.com/jobs/"
    elif platform.lower() == "indeed" and not target_url:
        target_url = "https://www.indeed.com/"

    prompt = f"""
    Goal: Apply for jobs on {platform}.
    
    1. LOGIN CHECK & PERSISTENCE:
       - Go to '{login_url}'
       - **IMPORTANT**: First, check if you are already logged in (look for your profile picture, dashboard, "My Jobs", or "Logout" button).
       - If you ARE already logged in, do NOT log our. Proceed directly to Step 2.
       - If you ARE NOT logged in (you see a login form), use: {request.username} / {request.password}.
 
    2. SMART SEARCH & ADAPTIVE FILTERING:
       - Target: {target_url or 'Search for ' + search_context}
       - User Rules: {request.rules}
       - BLOCKER DETECTION (CRITICAL):
         - If a job redirects you to an external site requiring a **Mandatory OTP (Mobile/Email)** or a **Long Registration Form** (e.g., Jobseager.com), you MUST skip it.
         - Do not waste steps on sites that require registration from scratch.
         - PRIORITIZE "Quick Apply", "Easy Apply", or internal platform applications.
       - If no results are found for a filtered search, BROADEN the search (nearby cities, remote) or lower salary/CTC.
 
    3. MANDATORY RESUME UPLOAD (CRITICAL):
       - FILE PATH: {request.resume_path}
       - You MUST use the 'upload_file' tool for ANY resume or CV upload field you encounter.
       - NEVER skip this. If the 'upload_file' tool returns an error, you MUST fix the path or try a different upload element.
       - DO NOT assume a resume upload succeeded if the tool explicitly failed.
 
    4. FORM HANDLING:
       - Context: {request.resume_text[:2000]}
       - Company Email: Fallback to '{request.username}'.
       - Autocomplete: Type, WAIT, and CLICK a dropdown option.
       - Submit once all fields are complete.
 
    CRITICAL RULES:
    1. STOP AFTER ONE SUCCESSFUL SUBMISSION.
    2. BE DECISIVE: If a site looks like it will take more than 20 steps to navigate, skip it and move to a simpler one.
    3. SESSION PERSISTENCE: Handle cookie banners and popups by dismissing them.
    4. NO OTP/REGISTRATION: Abandon any application that requires an OTP or a brand-new account registration on an external site.
    """
    return prompt

@app.post("/run-task")
async def run_task(request: TaskRequest):
    global global_browser
    print(f"📥 Received Request: platform={request.platform_name}, url={request.url}")
    
    # --- PATH DIAGNOSTICS ---
    authorized_paths = []
    if request.resume_path:
        request.resume_path = os.path.abspath(os.path.normpath(request.resume_path))
        print(f"🔍 [Path Diagnostic] Real Path: {request.resume_path}")
        if os.path.exists(request.resume_path):
            print(f"✅ [Path Diagnostic] Status: EXISTS ({os.path.getsize(request.resume_path)} bytes)")
            authorized_paths.append(request.resume_path)
        else:
            print(f"❌ [Path Diagnostic] Status: MISSING")
    
    try:
        session_data = await load_session(request.username, request.platform_name)
        full_task = generate_task_prompt(request)
        
        run_profile = BrowserProfile(
            headless=False,
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            disable_security=True,
            wait_for_network_idle_page_load_time=3.0,
            wait_between_actions=2.0,
            keep_alive=True,
            extra_chromium_args=['--password-store=basic']
        )

        temp_session_file = None
        if session_data:
            fd, temp_session_file = tempfile.mkstemp(suffix='.json', prefix='linkedin_session_')
            os.close(fd)
            with open(temp_session_file, 'w') as f:
                json.dump(session_data, f)
            run_profile.storage_state = temp_session_file

        task_browser = Browser(browser_profile=run_profile)
        await task_browser.start()

        # FIX: Explicitly authorize the resume path for the agent
        agent = Agent(
            task=full_task,
            llm=llm,
            browser=task_browser,
            use_vision=True,
            max_failures=5,
            flash_mode=False,
            available_file_paths=authorized_paths
        )

        # INCREASED STEP LIMIT TO 100
        history = await agent.run(max_steps=100)
        
        try:
            if agent.browser_session:
                updated_state = await agent.browser_session._cdp_get_storage_state()
                if updated_state:
                    await save_session(request.username, request.platform_name, updated_state)
        except Exception as se:
            print(f"⚠️ Failed to save session: {se}")
        finally:
            await task_browser.stop()
            if temp_session_file and os.path.exists(temp_session_file):
                try:
                    os.remove(temp_session_file)
                except:
                    pass

        final_res = history.final_result()
        result = str(final_res) if final_res is not None else "Agent finished with no result."
        return {"status": "completed", "result": result}

    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"❌ AGENT ERROR:\n{error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8012)
