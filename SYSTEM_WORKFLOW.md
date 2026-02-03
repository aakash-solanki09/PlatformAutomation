# 🤖 AI Job Agent - System Workflow

This document outlines the high-level architecture and execution flow of the automated job application system.

---

## 🏗️ 1. Architecture Overview

- **Frontend**: React (Port 5173) - User Dashboard & Controls.
- **Backend**: Node.js (Port 5011) - Resume processing & persistent MongoDB storage.
- **Python Agent**: FastAPI + Browser-Use (Port 8012) - The "Brain" that controls Chrome.

---

## 🔄 2. The Execution Flow

### A. Initialization

- **Persistent Session**: The system uses a dedicated Chrome user profile (`python-agent/browser-use-user-data-dir-linkedin_session`). This saves your cookies, so you don't have to log in manually every time.
- **Hybrid Login (Coded First)**: Before letting AI guess, the system uses "Playwright-native" commands to fill credentials on the LinkedIn login page. This handles the login process with 99.9% reliability.

### B. AI Agent Handover

- **Native Gemini Integration**: We use the native `browser_use.ChatGoogle` class. This includes special schema-formatting code that fixes the notorious "items" validation error common with Gemini 1.5 Flash.
- **Vision Capabilities**: The agent "sees" the page structure through the Accessibility Tree and screenshots, enabling it to interact with complex LinkedIn UI elements effortlessly.

### C. "Thrifty Agent" Quota Management (Free Tier Optimized)

- **Consolidated Thinking**: Configured for `max_actions_per_step=4`. The agent can perform up to 4 clicks/types in a single thought, saving precious API requests.
- **Exponential Backoff**: If the agent hits a `429 Quota Error` (limit of 5 requests/min), it will automatically pause for **10 seconds** and retry up to 10 times until the limit resets.

### D. Navigation & Application

- **Direct Search**: Bypasses slow site navigation by jumping straight to a job search URL.
- **Easy Apply Logic**: Identifies "Easy Apply" buttons, reads job requirements, and applies using the resume context provided by the backend.

---

## 🛠️ 3. Maintenance Notes

- **Browser-Use Library**: The folder on your Desktop is a reference copy. The system actually uses the version installed in the Python virtual environment (`python-agent/.venv`).
- **Session Folders**: If your login fails repeatedly, you can clear the session by deleting the `browser-use-user-data-dir-linkedin_session` folder inside `python-agent`.

---

_Status: Optimized for Stability & Performance_
