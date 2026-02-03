from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
from contextlib import asynccontextmanager
import asyncio
import os
import uvicorn
from dotenv import load_dotenv

# Browser-use imports
from browser_use import Agent, Browser, BrowserProfile, ChatGoogle

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

# 3. Global Browser Profile
# We use a specific directory name pattern to prevent browser-use from copying it to a temp dir
current_dir = os.path.dirname(os.path.abspath(__file__))
session_dir = os.path.join(current_dir, "browser-use-user-data-dir-linkedin_session")

if not os.path.exists(session_dir):
    os.makedirs(session_dir)
    print(f"📁 Created session directory: {session_dir}")
else:
    print(f"📁 Using existing session directory: {session_dir}")

print(f"📁 Initializing Browser Profile with session: {session_dir}")
profile = BrowserProfile(
    headless=False,
    executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    disable_security=True,
    wait_for_network_idle_page_load_time=3.0,
    wait_between_actions=2.0,
    user_data_dir=session_dir,
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

        # 1. Prepare Browser & Page for Hybrid Login
        print("🚦 [Task] Requesting browser instance...")
        browser = await get_browser()
        
        try:
            print("🚦 [Task] Getting current page...")
            # Try to get or create a page
            page = await browser.get_current_page()
            if not page:
                print("🚦 [Task] No current page, creating new_page...")
                page = await browser.new_page()
            
            # Pre-warm focus to prevent Watchdog ValueError
            await page.goto("about:blank") # Fast focus
            
            print("🚦 [Task] Testing page connection...")
            # Double check connection with a simple call
            await page.get_url()
            print("🚦 [Task] Connection OK.")
        except Exception as e:
            print(f"🔄 [Task] Browser connection lost or stale, restarting: {e}")
            if global_browser:
                try: await global_browser.stop()
                except: pass
            global_browser = None
            browser = await get_browser()
            page = await browser.new_page()
            print("🚦 [Task] Restarted browser successfully.")
        
        # 2. Perform Hybrid Login (Playwright-first)
        print(f"🔐 Attempting Hybrid Login for: {request.username}")
        await page.goto("https://www.linkedin.com/login")
        await asyncio.sleep(2) # Stabilize

        try:
            # 2a. Filling credentials using high-level methods
            print("📝 Filling credentials...")
            
            username_els = await page.get_elements_by_css_selector('input#username')
            if username_els:
                await username_els[0].fill(request.username)
            
            password_els = await page.get_elements_by_css_selector('input#password')
            if password_els:
                await password_els[0].fill(request.password)
            
            # 2b. Multi-tier Submission
            submit_selectors = [
                'button[type="submit"]', 
                'button#login-submit',
                'button.btn__primary--large'
            ]
            
            # Try to click the first visible button
            submit_clicked = False
            for sel in submit_selectors:
                try:
                    elements = await page.get_elements_by_css_selector(sel)
                    if elements:
                        print(f"🖱️ Clicking {sel}...")
                        await elements[0].click()
                        submit_clicked = True
                        break
                except: continue
            
            if not submit_clicked:
                print("⌨️ Submission via Enter key...")
                await page.press('Enter')
            
            # 2c. Last Resort: JS Form Submit
            await asyncio.sleep(1)
            curr_url = await page.get_url()
            if "login" in curr_url.lower():
                print("💣 Final Login Fallback: JS Form Submit")
                try:
                    await page.evaluate("() => document.querySelector('form').submit()")
                except: pass

            print("🔑 Submission sequence complete. Monitoring navigation...")
            
            # Verification Loop (Faster check for dashboard)
            success = False
            for i in range(5): 
                await asyncio.sleep(1)
                curr_url = await page.get_url()
                print(f"⏳ [{i+1}s] URL: {curr_url}")
                
                if any(x in curr_url.lower() for x in ["/feed", "/jobs", "/search", "/mynetwork", "/manage", "/talent"]):
                    print(f"✅ Login Verified! Success at {curr_url}")
                    success = True
                    break
                    
            if not success:
                print("⚠️ Dashboard not reached yet. Handing over to Agent...")
                
        except Exception as e:
            print(f"⚠️ Hybrid login interaction error: {e}")

        # Final check
        current_url = await page.get_url()
        print(f"📍 Post-Login URL: {current_url}")

        # 3. Prepare Resume Preview
        resume_preview = request.resume_text[:2000]

        # 4. Determine Mode (AI Task)
        is_direct_job = ("view" in request.url or "currentJobId" in request.url) and "login" not in request.url.lower()
        is_url = request.url.lower().startswith("http")
        
        target_url = request.url if is_url else "https://www.linkedin.com/jobs/"
        if "login" in target_url.lower():
            target_url = "https://www.linkedin.com/jobs/"
        
        search_context = request.url if not is_url else "jobs matching my skills"
        
        logging.info(f"🚀 MODE: {'DIRECT APPLY' if is_direct_job else 'SEARCH & APPLY'}")

        # 5. Hybrid AI Prompt
        full_task = f"""
        Objective: Apply for jobs via {target_url}
        Status: Already logged in.
        
        Instructions:
        1. Go to {target_url}
        2. If you see a search bar, search for "{search_context}".
        3. Find a job with 'Easy Apply' and apply using:
        ---
        {resume_preview}
        ---
        
        CRITICAL: Limit your actions to simple navigation and clicking. Always verify you are on the right page.
        """

        print(f"📋 TASK CREATED ({len(full_task)} chars) | Mode: Native Gemini Integration")

        # 6. Initialize Agent with Global Components
        agent = Agent(
            task=full_task,
            llm=llm,
            browser=global_browser,
            use_vision=True, # Re-enabled thanks to Native ChatGoogle
            max_actions_per_step=4, # MAX CONSOLIDATION to respect RPM quota
            max_failures=5,
            flash_mode=True, # Enabled for speed and native efficiency
        )

        print(f"🚀 HANDOVER SUCCESSFUL: Agent starting run...")

        history = await agent.run(max_steps=20)
        
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
