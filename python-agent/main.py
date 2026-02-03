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
    platform_name: str = "LinkedIn"  # Default to LinkedIn for backward compatibility
    login_url: str = ""              # Optional: specify if different from platform root

def generate_task_prompt(request: TaskRequest):
    """Generates a dynamic prompt based on the requested platform."""
    # Logic for target and search
    is_url = request.url.lower().startswith("http")
    target_url = request.url if is_url else ""
    search_context = request.url if not is_url else "jobs matching my skills"
    
    # Platform specific defaults
    platform = request.platform_name.strip()
    
    # SMART DETECTION: If platform is default (LinkedIn) but URL suggests otherwise
    if platform.lower() == "linkedin" and "indeed.com" in request.url.lower():
        platform = "Indeed"
    elif platform.lower() == "linkedin" and "glassdoor.com" in request.url.lower():
        platform = "Glassdoor"
    
    login_url = request.login_url or f"https://www.{platform.lower()}.com/login"
    
    # Override for LinkedIn specifically if needed
    if platform.lower() == "linkedin" and not target_url:
        target_url = "https://www.linkedin.com/jobs/"
    elif platform.lower() == "indeed" and not target_url:
        target_url = "https://www.indeed.com/"

    prompt = f"""
    Goal: Apply for jobs on {platform}.
    
    1. Login Check:
       - Go to '{login_url}'
       - If you are already logged in (you see your profile, feed, or dashboard), proceed to step 2.
       - If you see a login form, use these credentials:
         Username: {request.username}
         Password: {request.password}
       - Submit the form and wait for the page to load.
       - If you see a 'Verify you are human' or CAPTCHA, ask for help if you cannot solve it.

    2. Job Application:
       - Navigate to {target_url or 'the site homepage'}
       - If you are not already at the job page, search for "{search_context}".
       - Find a job with a 'Quick Apply', 'Easy Apply', or 'Apply Now' button.
       - Start the application process using this resume context:
       ---
       {request.resume_text[:2000]}
       ---

    3. Form Handling (Universal Guide):
       - You will likely encounter multi-step application forms.
       - For radio buttons and checkboxes (e.g., 'Yes/No', 'Work Authorization'):
         - Look for the option index. CLICK it directly.
         - If the actual inputs are hidden, click the corresponding label text.
       - For text inputs (Years of Experience, Notice Period, Salary Expectation):
         - Fill them accurately based on the resume.
       - Always look for 'Next', 'Continue', or 'Save and continue' to proceed.
       - Final Step: Once you reach the 'Review' or 'Submit' page, click 'Submit application'.

    CRITICAL RULES:
    1. STOP AFTER ONE APPLICATION: Once you have successfully submitted ONE application (clicked the final 'Submit' button and seen a confirmation), you MUST STOP and return the result of that one application. DO NOT try to apply for multiple jobs in one run.
    2. SESSION PERSISTENCE: Handle any 'Stay signed in' popups or cookie banners by dismissing them. Disable the Chrome 'Save password' popup if it appears.
    3. RE-TEST: If a platform-specific selector fails, try a generic one.
    """
    return prompt

@app.post("/run-task")
async def run_task(request: TaskRequest):
    global global_browser
    print(f"📥 Received Request: platform={request.platform_name}, url={request.url}")
    try:
        # 1. Load Session from DB (Platform Isolated)
        print(f"🚦 [Task] Loading session for {request.username} on {request.platform_name}...")
        session_data = await load_session(request.username, request.platform_name)
        
        # 2. Prepare dynamic AI Prompt
        full_task = generate_task_prompt(request)
        logging.info(f"🚀 MODE: Multi-Platform Action ({request.platform_name})")

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
        history = await agent.run(max_steps=35)
        
        # 6. Save updated Session back to DB
        try:
            if agent.browser_session:
                print(f"💾 Extracting updated session state for {request.platform_name}...")
                updated_state = await agent.browser_session._cdp_get_storage_state()
                if updated_state:
                    await save_session(request.username, request.platform_name, updated_state)
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
