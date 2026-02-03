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

async def load_session(username: str):
    """Loads storage state from MongoDB."""
    session = await sessions_collection.find_one({"username": username})
    if session:
        print(f"📦 Found saved session for {username} in DB.")
        return session.get("sessionData")
    print(f"� No saved session for {username} in DB.")
    return None

async def save_session(username: str, session_data: dict):
    """Saves storage state to MongoDB."""
    await sessions_collection.update_one(
        {"username": username},
        {"$set": {"sessionData": session_data, "updatedAt": asyncio.get_event_loop().time()}},
        upsert=True
    )
    print(f"� Session for {username} saved to DB.")

# 4. Global Browser Profile (Updated: Removed local user_data_dir persistence)
# We still need a profile for basic settings, but cookies/state are handled separately.
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
    # Startup: We skip pre-warming here to prevent timeouts.
    # The browser will be initialized on-demand during the first request.
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
    rules: str = ""
    username: str = ""
    password: str = ""

@app.post("/run-task")
async def run_task(request: TaskRequest):
    global global_browser
    print(f"📥 Received Request: url={request.url}, resume_len={len(request.resume_text)}")
    try:
        # 0. Manual Pause for Window Visibility
        await asyncio.sleep(2.0)

        # 1. Load Session from DB
        print(f"🚦 [Task] Loading session for {request.username}...")
        session_data = await load_session(request.username)
        
        # 2. Determine Mode (AI Task)
        is_direct_job = ("view" in request.url or "currentJobId" in request.url) and "login" not in request.url.lower()
        is_url = request.url.lower().startswith("http")
        
        target_url = request.url if is_url else "https://www.linkedin.com/jobs/"
        if "login" in target_url.lower():
            target_url = "https://www.linkedin.com/jobs/"
        
        search_context = request.url if not is_url else "jobs matching my skills"
        
        logging.info(f"🚀 MODE: {'DIRECT APPLY' if is_direct_job else 'SEARCH & APPLY'}")

        # 3. Prepare AI Prompt with Login Logic
        full_task = f"""
        Goal: Apply for jobs on LinkedIn.
        
        1. Login Check:
           - Go to 'https://www.linkedin.com/login'
           - If you are already logged in (you see your feed or jobs), proceed to step 2.
           - If you see a login form, use these credentials:
             Username: {request.username}
             Password: {request.password}
           - Submit the form and wait for the dashboard to load.

        2. Job Application:
           - Navigate to {target_url}
           - If you see a search bar, search for "{search_context}".
           - Find a job with 'Easy Apply' and apply using this resume context:
           ---
           {request.resume_text[:2000]}
           ---

        3. Form Handling (Crucial):
           - In LinkedIn 'Easy Apply' modals, you will encounter 'Additional Questions'.
           - For radio buttons and checkboxes:
             - They should now be indexed. Look for the 'Yes', 'No', or relevant option index.
             - If you see an index for the input, CLICK it directly.
             - If you don't see an index, you can still try to click the text label.
           - For text inputs (Experience, Notice Period, etc.), enter the value and move on.
           - Always click 'Next' or 'Continue' to proceed until you reach the 'Review' page.
           - On the 'Review' page, click 'Submit application'.

        CRITICAL: Handle any security popups or 'Stay signed in' prompts by dismissing them. Disable the Chrome 'Save password' popup if it appears.
        """

        print(f"📋 TASK CREATED ({len(full_task)} chars) | Mode: Full AI Control")

        # 4. Initialize Agent with DB Session
        # Create a fresh profile for this specific run to handle the session
        run_profile = BrowserProfile(
            headless=False,
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            disable_security=True,
            wait_for_network_idle_page_load_time=3.0,
            wait_between_actions=2.0,
            keep_alive=True,  # ADDED: Prevent agent from killing browser so we can save session
            extra_chromium_args=['--password-store=basic'] # ADDED: Disable 'Save password' popup
        )

        temp_session_file = None
        if session_data:
            print("📝 Creating temporary session file...")
            fd, temp_session_file = tempfile.mkstemp(suffix='.json', prefix='linkedin_session_')
            os.close(fd)
            with open(temp_session_file, 'w') as f:
                json.dump(session_data, f)
            run_profile.storage_state = temp_session_file
            print(f"📝 Storage state profile set to: {temp_session_file}")

        # Initialize a fresh browser session for this task to ensure session isolation
        task_browser = Browser(browser_profile=run_profile)
        await task_browser.start()

        agent = Agent(
            task=full_task,
            llm=llm,
            browser=task_browser,
            use_vision=True,
            max_actions_per_step=4,
            max_failures=5,
            flash_mode=True,
        )

        print(f"🚀 HANDOVER SUCCESSFUL: Agent starting run...")

        # 5. Run Agent
        history = await agent.run(max_steps=30)
        
        # 6. Save updated Session back to DB
        try:
            if agent.browser_session:
                print("💾 Extracting updated session state...")
                # browser-use's BrowserSession has _cdp_get_storage_state
                updated_state = await agent.browser_session._cdp_get_storage_state()
                if updated_state:
                    await save_session(request.username, updated_state)
        except Exception as se:
            print(f"⚠️ Failed to save session: {se}")
        finally:
            # Clean up browser and temp file
            await task_browser.stop()
            if temp_session_file and os.path.exists(temp_session_file):
                try:
                    os.remove(temp_session_file)
                    print(f"🧹 Cleaned up temp session file: {temp_session_file}")
                except:
                    pass

        final_res = history.final_result()
        result = str(final_res) if final_res is not None else "Agent finished with no result."
        
        print(f"✅ DEBUG: Agent completed successfully")
        
        return {"status": "completed", "result": result}

    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logging.error(f"❌ AGENT ERROR:\n{error_msg}")
        print(f"❌ AGENT ERROR:\n{error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8012)
