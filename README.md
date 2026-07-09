# ⚡ EventFlow Analytics

EventFlow is a lightweight, high-performance web analytics platform that captures event-level user interactions (clicks, scroll depth, element IDs, typing focus, and latency deltas) and visualizes them on a centralized glassmorphic dark-mode dashboard.

It includes a built-in **Interactive E-Commerce Sandbox** with a **Live Tracker Console**, a **User Journey Map**, **Funnel Conversion Indicators**, and a **UX Friction Overlay (Heatmap)** depicting "Red Zones" where users hesitate or slow down.

---

## ✨ Features

### 1. The Tracker Snippet (`/tracker.js`)
An asynchronous event listener injected into target sites:
- **Batched Ingestion**: Queues interactions locally and transmits them in batches (every 2 seconds) to avoid blocking the main thread.
- **Navigator Beacon**: Sends remaining events via `navigator.sendBeacon` when the page unloads/hides.
- **Session Mapping**: Generates and persists a unique `session_id` inside `sessionStorage` to track individual tab user paths.
- **Auto-Host Detection**: Extracts the ingestion API host dynamically from its own `<script src="...">` tag.

### 2. Privacy & PII Filter (Client-Side)
Strict protection of Personally Identifiable Information:
- Ignores keystroke value text entirely; only records the focus/type action.
- Automatically flags inputs with `type="password"`, `type="email"`, `type="tel"`, and autocomplete tags containing `cc-`, `card`, `password`, or `email`.
- Suppresses fields containing `data-private` or `data-sensitive` attributes.
- Displays a `🛡️ PII Masked` notice in journeys and logs to confirm no PII leaves the client.

### 3. Pure JavaScript JSON Database Store (`server/database.json`)
- To bypass compilation issues associated with native database drivers (`sqlite3`/`node-gyp`) on modern macOS environments, the backend implements an in-memory JSON file store with matching asynchronous APIs.
- Features automatic flushing on writes, database initialization, and domain tracking registers.

### 4. Interactive E-Commerce Sandbox
An embedded product details page built into the dashboard:
- Allows clicking product sizes, adding to cart, wishlisting, scrolling specifications, and typing in newsletters.
- Contains a **Live Tracker Console** displaying captured JSON events and millisecond time-deltas instantaneously as they occur.

### 5. UX Friction Overlay & Red Zones Heatmap
A powerful diagnostic tool analyzing the time taken between consecutive interactions (`time_delta_ms`):
- **Glow Highlights**: Renders a read-only visual mockup of the Sandbox page and dynamically overlays glow borders based on average delay times:
  - 🔴 **Red Zones (High Friction > 8s)**: Pulsing red ring with an overlay badge (e.g. `⚠️ 12.4s`).
  - 🟠 **Orange Zones (Medium Friction 3s - 8s)**: Glowing orange ring (e.g. `⏳ 4.8s`).
  - 🟢 **Green Zones (Low Friction < 3s)**: Subtle green ring (e.g. `✅ 1.2s`).
- **UX Diagnostic Report**: Summarizes friction hotspots into automated sentences explaining bottlenecks (such as password inputs or checkout hesitation).
- **Session Filter**: Toggle analysis between the global aggregate average of all sessions or specific individual sessions.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, CORS
- **Frontend**: React, Vite, HTML5, CSS3 Custom Variables (Vanilla CSS)
- **Database**: Memory-backed JSON File Store
- **Orchestration**: Concurrently (dev mode), NPM Workspaces/Prefixes

---

## 📁 Repository Structure

```text
├── package.json          # Root package configuration & run scripts
├── setup.sh              # Automates installation & production build
├── .gitignore            # Git exclusion rules
├── README.md             # Project documentation (this file)
├── server/               # Express backend application
│   ├── index.js          # Main listener, collect endpoint & dashboard API
│   ├── db.js             # JSON file database connection & analytics queries
│   └── tracker.js        # Served client-side tracker snippet
└── dashboard/            # React + Vite dashboard frontend
    ├── index.html        # HTML shell entry point
    ├── vite.config.js    # Vite configuration & backend proxy router
    └── src/
        ├── main.jsx      # React launcher
        ├── App.jsx       # Layout tabs and main dashboard container
        ├── index.css     # Premium dark-mode glassmorphism stylesheet
        └── components/
            ├── Dashboard.jsx        # Total metrics and element charts
            ├── SessionJourney.jsx   # Chronological session timeline explorer
            ├── FunnelMetrics.jsx    # Funnel builders and step averages
            ├── FrictionAnalysis.jsx # Friction Diagnostic report & red zones overlay
            └── DomainManager.jsx    # Domain registar & HTML snippet copying
```

---

## 🚀 Setup & Execution

### 1. Run Setup Script
Run the automated script in the root directory to configure the npm SSL settings, install root & client dependencies, and compile the production build:
```bash
./setup.sh
```

### 2. Run in Production Mode (Single Port)
To serve the static dashboard, ingestion API, and tracker script from the single Express server:
```bash
npm start
```
Open your browser and navigate to:
👉 **[http://localhost:3001](http://localhost:3001)**

### 3. Run in Developer Mode (Concurrent Live Reload)
To run both the Vite developer server (with live-reload) and Express API simultaneously:
```bash
npm run dev
```
Open your browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🧪 Verification Walkthrough

Follow these steps to verify all components of the platform:

1. **Check Tracking Setup**: Click the **⚙️ Snippet Setup** button at the top to view the script snippet generated for `localhost`.
2. **Generate Interactions**: Go to the **🧪 Live Sandbox** tab. Perform size clicks, click **Add to Cart**, scroll the specifications container, and input email details. Try waiting 10-15 seconds before typing in the password field to generate a high delay delta.
3. **Verify Masking**: Look at the sandbox console. Observe the `🛡️ PII PROTECTION ENFORCED` notification next to the password input and private notes field.
4. **Inspect Metrics**: Go to **📊 Stats Overview**. Verify that the click breakdown and top elements statistics update instantly.
5. **Trace Journeys**: Go to **🗺️ User Journeys**. Select your current session ID to see a step-by-step chronological timeline of your actions with millisecond intervals.
6. **Analyze Conversion Funnels**: Go to **⏳ Funnel Conversions** to review the checkout progression.
7. **UX Friction Heatmap**: Go to **🔍 UX Friction Overlay**. Observe the mockup page glowing with colored outlines showing the red zones where actions took longer (such as the password or coupon inputs) accompanied by automated diagnostics.
