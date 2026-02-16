# IntelHub v2.0: The Cyberpunk Command Center Vision

This document outlines the visual and strategic roadmap for the next generation of the Election Intelligence Hub. v2.0 is designed to move beyond a "Data Management Tool" into a "Predictive Command Center."

## 1. The Core Vision: "Winning Probability"
The center of the v2.0 dashboard is the **Hero Metric: Winning Probability**. 

### **The Intelligence Logic (Non-Functional)**
Win Probability is no longer just a static number. It is a live calculation based on three weighted streams:
*   **A-Data (Confirmed Support):** Voters marked as 'Confirmed' or 'Strong Lean'.
*   **B-Data (Probability Weighting):** 'Neutral' or 'Likely' voters multiplied by our ground outreach success rate.
*   **C-Data (Turnout Scenarios):** Real-time adjustment based on historical vs. projected turnout per booth.

### **The Cyberpunk Visual**
*   **The Hub:** A large, holographic glowing ring in the center of the screen.
*   **The Pulse:** Minor pulses in the neon cyan border indicate that ground intelligence is being synced in real-time.
*   **The Trend:** A transparent 3D area chart trailing behind the percentage, showing how your win probability has changed over the last 14 days.

## 2. UI/UX Style: Cyberpunk Intelligent
*   **Palette:** Deep Obsidian (#0B0E14) background with Electric Cyan and Vibrant Orange highlights.
*   **Glassmorphism:** All UI elements use translucent, blurred backgrounds (`backdrop-filter: blur(12px)`) to create a sense of depth and modernity.
*   **Holographic Tiles:** Information cards for "Booth Performance" and "Voter Sentiment" have faint laser-line textures and glowing borders.

## 3. High-Value Intelligence Features
*   **Heatmap Commanders:** A top-down view of the constituency where each booth glows based on "Margin of Victory."
*   **Sentiment Outreach:** Automated tracking of "Sentiment Shifts" after specific campaign events or broadcasts.
*   **Scenario Simulator (The "What-If" Engine):** A sidebar allowing managers to slide turnout percentages per booth to see the immediate impact on the overall Winning Probability.

## 4. Implementation Strategy (Risk-Free)
To ensure the safety of v1.0, the modernization follows the **Parallel Sandbox** approach:
1.  **Stage 1:** Mockups and Branding (Zero Code).
2.  **Stage 2:** Development of `src/components/v2/` in a separate directory path.
3.  **Stage 3:** The "Magic Toggle" – a switch in the settings to allow users to opt-in to the new "Command Center" interface without altering the core functional backend.
