# VANode Dashboard — Build Instructions (LifeNodeOS)

** Apply these new changes to VANode.**
----

Task: Global UI Optimization, Component Deep-Link Upgrades, and Whiteboard Integration.

1. Layout Collision Fixes:

Z-Index & Padding: Ensure that when a card is in Focus Mode, it has a marginLeft or paddingLeft of 80px to prevent the Rail 1 sidebar from overlapping the content.

Linos Assistant Clearance: Shift the focus-mode container up by 60px. Add a Minimize (X) button to the top-right of the focus-mode overlay so users can exit easily.

Title Formatting: Automatically transform all Card Titles to Title Case (e.g., "EOD Proof of Work", "AI Task Assistant").

2. Advanced AI Transcription (Live Meeting Card):

Add a "Meeting URL" input field.

Logic: When a URL (Loom, Zoom, YouTube) is pasted, enable the "Transcribe & Summarize" action.

Integrate a "Transcription Engine" mock that accepts external links to generate SOPs directly into the Smart Vault.

3. Professional Invoice Engine 2.0:

User Branding: Add input fields for "Agency/Business Name" and "Owner Name."

Signature Engine: Implement a "Signature" zone. Users can either:

Type their name (using a script/cursive font).

Upload a PNG signature file.

Print Flow Fix: When "Print Preview" is clicked, do not launch the browser print dialog immediately. First, show a Full-Screen Modal of the final generated invoice. Only when the user clicks "Confirm & Print" inside that modal should window.print() be triggered.

4. Global Feature: The Whiteboard (Excalidraw Style):

Add a permanent "Whiteboard" icon to Rail 1 (The Hat Switcher). This feature is global and available across all Nodes.

Workspace: Implement a blank canvas using a library like react-konva or a basic SVG drawing engine.

Toolbar: Include tools for: Freehand Pen, Rectangle, Circle, Arrow, and Text.

Persistence: Save whiteboard data locally so it persists when the user switches "Hats."

5. Refinement:

Maintain all glassmorphism and the activeHats logic. Ensure the "Add Hat" grid remains functional.

Use the @excalidraw/excalidraw package to embed a professional whiteboard inside the Whiteboard Node." It’s open-source and will give you exactly the tools shown in your 9th picture (arrows, shapes, hand-drawn look)

Task: Implement the Global Whiteboard Overlay and Finalize UI Collision Fixes.

1. The Global Whiteboard Overlay
Activation: Add a dedicated "Pen/Canvas" icon to Rail 1 (the permanent far-left sidebar).

Behavior: When clicked, it triggers a Full-Screen Glassmorphic Overlay (z-index: 9999).

The Canvas: Integrate a professional drawing surface (recommendation: @excalidraw/excalidraw for that hand-drawn, high-tech look).

State: The whiteboard must retain its data globally. A user should be able to draw something while in HomeNode, close the overlay, switch to BizNode, and see the same drawing when they re-open it.

Close Logic: Add a "Close & Save" button in the top corner of the overlay.

2. Layout & Collision Refinement (Focus Mode)
Sidebar Offset: When any card is in Focus Mode, apply padding-left: 100px to the container to ensure the Rail 1 icons never overlap the content.

Vertical Positioning: Shift Focus Mode containers up by 80px to ensure the "Linos Assistant" bar at the bottom doesn't cover actionable buttons (like "Save SOP" or "Print").

Title Polish: Use a global helper function to ensure all dashboard headers are Title Case (e.g., Smart Vault, Client ROI - Value Score).

3. Invoice Engine Upgrades
Branding Inputs: Add fields for "Business/Agency Name" and "User Full Name" in the Manual Invoice form.

Signature System: * Add a "Signature" block at the bottom of the Invoice Preview.

Provide a toggle: [Type Signature] (renders name in a cursive/script font) or [Upload Signature] (allows a transparent PNG upload).

Two-Step Print: The "Print Preview" button must open a clean, focused modal showing the final document. Add a "Confirm & Print" button inside this modal to trigger the actual system print dialog.

4. The 2FA "Zero-Knowledge" Logic
Logic: Each Client Profile should have a nested credentials array.

Security UI: In the 2FA & Credential Vault card, use a CSS filter: blur(8px) on the password/code strings.

Interaction: Only "un-blur" the specific row when the user's mouse is directly hovering over it.

Implementation Tip for the Whiteboard Overlay
To keep the app running fast, "Lazy Load" the Whiteboard component. Since it’s a heavy feature, I only want the code to load when the user actually clicks the icon for the first time.

The "SOP Factory" Update: Master Prompt Addendum
Task: Integrate "Screenshot to Vault" logic and refined Whiteboard-to-SOP workflow.

1. The "Screenshot to Vault" Feature
Button Placement: Add a "Capture to Vault" button (using a Camera or Archive icon) to the Global Whiteboard Overlay toolbar.

Functionality: * When clicked, the app should capture the current canvas as a high-resolution PNG/Base64 image.

The "Clip" Effect: Show a brief flash or "shutter" animation to give the user visual feedback that the capture was successful.

The Destination: Automatically create a new entry in the Smart Vault.

Initial Data: Title the note "Whiteboard Export - [Date/Time]".

Content: Attach the captured image to the body of the note.

Success Notification: Show a small toast notification: "Sketch captured! Draft created in Smart Vault."

2. Workflow Integration (VANode Sync)
Client Linking: If a client is currently active in the Active Workspace (e.g., TechFlow Inc.), the "Screenshot to Vault" action should automatically tag the new note with that client’s name.

SOP Template: Ask Cursor to provide a simple Markdown template that wraps around the image in the Smart Vault so it looks professional (e.g., "Visual SOP: [Title]").

3. Overlay UI Polish
Glassmorphism Depth: Ensure the Whiteboard overlay has a higher blur value (backdrop-filter: blur(25px)) than the dashboard cards to create a clear "layer" between the app and the drawing surface.

Title Case Enforcement: Ensure the button labels in the overlay (e.g., "Clear Canvas", "Screenshot to Vault") follow the Title Case formatting rule.

Implementation Advice for your Canvas Capture:
Since I am using Excalidraw, use the exportToBlob or exportToCanvas utility provided by the library. It’s built-in and much cleaner than a standard screen-capture tool because it only grabs the drawing, not the UI buttons around it.

Your Final Flow:
Orchestrate: You're in the VANode working for a construction client.

Sketch: You open the Whiteboard Overlay to map out a new lead-funnel diagram.

Capture: You hit "Screenshot to Vault".

Finalize: You close the overlay, open your Smart Vault (which is now in focus mode), and the diagram is already there, ready to be sent as part of your EOD Proof of Work.
