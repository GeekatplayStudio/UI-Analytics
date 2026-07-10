# ⚡ EventFlow Analytics

EventFlow is a high-fidelity, client-side web analytics platform designed to capture, reconstruct, and diagnose user experience (UX) interactions. Operating without the resource overhead of heavy screen-recording frameworks, EventFlow translates raw client telemetry into interactive session replays, qualitative reviews, and friction mapping on a dark-mode dashboard.

---

## 🛠️ Architecture & Core Pillars

### 1. High-Fidelity Session Replay & DOM Simulation
Unlike simple session recorders, EventFlow reconstructs interactions using lightweight client-side event loops:
- **Virtual Cursor Tracking**: Replays pointer coordinates (`viewport_x`, `viewport_y`) with smooth CSS bezier transitions mapping the user's path.
- **Visual Click Ripples**: Highlights mouse clicks using color-coded pulsing rings indicating standard interactions (gray), dead clicks on static text (yellow), and rage clicks (red).
- **Auto-Scroll Bounds**: Coordinates viewport scrolling percentages to scroll mock layouts dynamically during playback.
- **Playback Controls**: Variable rate multipliers (**1x**, **2x**, **4x**), scrubbers, and inactivity timers to fast-forward idle sequences.

### 2. Qualitative Survey & local AI Journey Summaries
- **Injected Feedback Tab**: Serves an inline slide-out review panel in the bottom-right of target pages, capturing satisfaction ratings and written commentary without stylesheet collision.
- **NLP Journey Analyzer**: Runs a simulated AI diagnostics parser on the frontend to compile intent reports, platform environments, friction points, and specific layout refactoring recommendations, typed out using a typewriter effect.
- **Custom Feedback Review**: Collects qualitative reviews and scores in a scrolling dashboard widget.

### 3. Developer Technical Diagnostics
- **JS Exception Telemetry**: Overrides uncaught errors and logs runtime stack traces directly into the chronological journey timeline.
- **AJAX Fetch Latency**: Intercepts `window.fetch` to record request methods, API latency (in ms), and status codes.
- **Stack Trace Viewer**: Provides collapsible debug lists for logs.

### 4. Customizable Grid Dashboard
- **Super Dashboard Layout**: Supports grid swapping, card deletion, and dropdown card restorations.
- **Custom Vector Graphics**: Custom animated SVG widgets including interactive hourly traffic lines, hollow interaction breakdown donuts, and 3D isometric frustration bars.

### 5. Automated Onboarding & On-Disk Code Scanning
- **HTML File Scanner**: Inspects target file structures on disk to find safe placement slots (e.g. `</head>`).
- **Auto-Injection**: Modifies HTML files, creates `.bak` backups, and displays diff comparisons.
- **Guided Telemetry Validator**: Run tests live on target websites while checking off connectivity, clicks, scroll depth, and input masking milestones automatically in the dashboard.

### 6. PII Masking Shield
- Suppresses input field value ingestion, saving only structural change actions.
- Automatically redacts fields matching `password`, `email`, `tel`, autocomplete tags, or custom `data-private` properties.

---

## 📁 Repository Structure

```text
├── package.json          # Root package configuration & workspace scripts
├── server/               # Express backend application
│   ├── index.js          # Express listener & collect API routes
│   ├── db.js             # Pure-JS Memory-backed JSON database store
│   └── tracker.js        # Served client-side tracker snippet & feedback widget
└── dashboard/            # React + Vite dashboard frontend
    ├── index.html        # HTML page shell
    ├── vite.config.js    # Vite configuration & backend proxy router
    └── src/
        ├── App.jsx       # Layout tabs and main dashboard container
        ├── index.css     # Dark-mode glassmorphic styling system
        └── components/
            ├── Dashboard.jsx        # Customizable metrics cards grid
            ├── SessionJourney.jsx   # AI Summaries timeline & Visual Replayer
            ├── FunnelMetrics.jsx    # Checkout conversion metrics
            ├── FrictionAnalysis.jsx # Frustration scorecards & Overlay Heatmap
            ├── DomainManager.jsx    # Domain registar & HTML snippet copying
            ├── Sandbox.jsx          # Interactive mock shop & developer tools
            └── SiteIntegration.jsx # Onboarding scanner & telemetry validator
```

---

## 🚀 Setup & Execution

### 1. Build and Run Server
Install dependencies and run the production server:
```bash
# Install and build dashboard
npm run dashboard:build

# Run Express server
npm run server
```
Navigate to: **[http://localhost:3001](http://localhost:3001)**

### 2. Run Developer Server (Live Reload)
To run Vite developer servers concurrently with the backend API:
```bash
npm run dev
```
Navigate to: **[http://localhost:5173](http://localhost:5173)**

---

## 🧪 Verification Walkthrough

1. **Onboarding Verification**: Go to **Site Integration**, select an HTML path, run **Analyze HTML**, and choose **Auto-Inject**.
2. **Interaction Telemetry**: Go to the **Live Sandbox** tab, select sizes, rage click the buy buttons, scroll panels, and fill the input forms.
3. **Submit Survey**: Click the **Feedback** tab in the bottom-right corner of the sandbox, select score, fill comment, and click **Submit**.
4. **Developer Diagnostics**: Scroll the sandbox sidebar to **Developer Diagnostics Sandbox** and click **Log Console Error** or **Throw JS Exception**.
5. **Inspect Journeys & Replays**: Go to the **User Journeys** tab, choose your session, review the typewriter **AI Session Summary**, click **Show Stack Trace** on the error log, and play the **Visual Session Replay** to watch coordinate paths, clicks, and page transitions.
6. **Customize Stats**: Go to **Stats Overview**, drag/swap widgets, remove unnecessary cards, and restore the **Customer Feedback** card from the dropdown.
