# VANTYX Demo Video Script

Use this for a 90-120 second portfolio video. Record the screen only. No webcam is needed.

## Open Before Recording

1. Start the local app.
2. Open `http://127.0.0.1:5175/#/demo`.
3. Make sure the app says `Demo data active`.
4. Keep the browser on the VANTYX page and close unrelated tabs/windows.
5. Use the five workflow steps on screen:
   - Step 1: Setup
   - Step 2: Enter Numbers
   - Step 3: Review Results
   - Step 4: Action Plan
   - Step 5: Send Snapshot

## Exact Click Path

1. Start on the demo page.
2. Click `Step 1 Setup`.
3. Click `Step 2 Enter Numbers`.
4. Click `Step 3 Review Results`.
5. Click `Step 4 Action Plan`.
6. Click `Step 5 Send Snapshot`.
7. Click `Create Preview`.
8. Stop recording after the snapshot preview appears.

## Read-Aloud Script

Hi, I'm Evan Wadsworth. This is VANTYX, a local-first operations BI prototype I built for hotel GOP recovery workflows.

The problem I wanted to solve is simple: operators often have revenue, expense, GOP, target, and weekly performance numbers spread across different systems or spreadsheets. VANTYX turns those inputs into a clearer operating read: where the property stands, how big the gap is, and what recovery actions need attention.

This is demo data only, and the public repo does not include client data, private credentials, or production hotel information.

First, the setup step confirms the reporting view, property profile, active operating areas, and local data readiness. The app is designed to work from manual or approved local inputs before any live integration is added.

Next, the numbers step shows the editable month, quarter, and year inputs. The user can adjust revenue, expenses, manual GOP, target GOP, days remaining, and recovery flow-through. The point is that the dashboard stays tied to operator-controlled inputs instead of hiding the logic.

The results step turns those inputs into a decision view. Here VANTYX shows the current GOP gap, forecasted position, recovery revenue needed, actual flow-through, daily GOP recovery, and confidence readout. In this demo, the app identifies that the gap is recoverable with the current action plan.

The action plan step converts the gap into specific recovery items. In this sample, it starts with Food Services because it is the clearest controllable gap, then includes Banquets, Valet, and labor-related actions. These items can be edited, deleted, or adjusted, and the forecast updates from the action-plan impact.

Finally, the send snapshot step creates an operator-ready summary. The user can generate a preview, print or export to PDF, or copy the summary for follow-up.

My role was defining the product requirements, workflow logic, dashboard structure, acceptance criteria, testing expectations, and public-safe documentation. I used AI-assisted development tools to accelerate implementation, but I owned the workflow design and system behavior.

This project reflects how I think about software: start from a real operations workflow, organize the data, expose the bottleneck, and make the next action clearer.

## Shorter 60-Second Version

Hi, I'm Evan Wadsworth. This is VANTYX, a local-first operations BI prototype I built for hotel GOP recovery workflows.

The goal is to turn raw operating numbers into a clear decision workflow: setup, enter numbers, review results, build an action plan, and send a snapshot.

In setup, the user confirms the reporting view, property profile, operating areas, and local data readiness. In enter numbers, the dashboard uses editable month, quarter, and year inputs like revenue, expenses, GOP, target GOP, days remaining, and recovery flow-through.

The results step shows the current gap, forecasted position, recovery revenue needed, daily GOP recovery, and confidence readout. The action plan then turns that gap into specific recovery items, such as Food Services, Banquets, Valet, or labor actions.

Finally, the snapshot step creates an operator-ready summary that can be previewed, printed, exported to PDF, or copied.

I defined the product requirements, workflow logic, dashboard structure, QA expectations, and documentation. I used AI-assisted development to move faster, but the product behavior and workflow decisions were mine.

## What Not To Say

- Do not say it is deployed enterprise software.
- Do not say it connects to live hotel systems today.
- Do not say AI makes financial decisions.
- Do not show private customer, hotel, credential, or production data.
- Do not apologize for the project being a prototype.

## YouTube Upload Notes

Current demo video:

https://youtu.be/jwtubXtU6mY

Uploaded as `Unlisted`. Use this title:

`VANTYX Demo - Operations BI / GOP Recovery Prototype`

Current description:

`Quick walkthrough of VANTYX, a local-first operations BI prototype I built for hotel GOP recovery workflows.

The demo shows the core flow: review operating results, turn the gap into recovery actions, adjust editable inputs, and create a snapshot for follow-up.

Built with React, TypeScript, Tauri, local data workflows, dashboard UI, reporting views, and AI-assisted development.

Public repo: https://github.com/KTB3ski/vantyx-operations-bi`
