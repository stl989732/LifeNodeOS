# TraderNode — Build Instructions (LifeNodeOS)

**Apply these features and behaviors to TraderNode.**

---

## 1. The "Whale Watch" Heatmap (Volume Profile)

Professional traders don't just look at price; they look at **Volume at Price**.

### Feature

A vertical histogram (Glassmorphism style) on the right side of your chart that shows where the most trading activity has happened.

### Why

This helps the user see **Value Zones** where big institutions (whales) are buying or selling.

### Implementation

Add a vertical **Volume Profile Visible Range (VPVR)** component to the TradingView widget overlay.

---

## 2. "What-If" Scenario Simulator

Before clicking **"Log a Trade,"** the user needs to know their math is right.

### Feature

A small slider-based widget where the user inputs their **Entry**, **Stop Loss**, and **Take Profit**.

### Visual

It should instantly calculate and display:

- **Reward-to-Risk (R:R) Ratio**
- The exact **Dollar Amount at Risk** based on their account balance

### Lino integration

If the R:R is less than **2:1**, Lino could glow red and say: *"Poor mathematical edge, Ann. Are you sure about this entry?"*

---

## 3. Correlation Matrix (The "Hat" Awareness)

As a business owner, your **Trader Hat** doesn't exist in a vacuum.

### Feature

A small grid showing how the current asset (e.g., NVDA) is correlating with other major indices (**SPY**, **QQQ**) or even Crypto (**BTC**).

### Benefit

If the whole market is dumping but your chart looks like a "buy," this matrix warns you that you might be swimming against the current.

---

## 4. The "Post-Trade Autopsy" (AI Journaling)

Since you already have a Journaling section, make it automatic.

### Feature

A button called **"AI Autopsy"**.

### Logic

When clicked, Lino looks at the trade entry/exit, the market sentiment at that time, and the user's **Emotional Check-in**.

### Result

It writes a paragraph, for example:

> You entered this trade while feeling 'FOMO' during a low-volume period. This led to a stop-out. In the future, wait for the New York Open volume before entering.

---

## Additional implementation notes

### Risk calculator widget

Create a **sidebar component** where the user can input **Entry**, **Stop**, and **Target**. It must calculate **R:R ratio** and **Risk Amount ($)** dynamically.

### Correlation grid

Add a **horizontal marquee** or **grid below the chart** showing the **% change** of **SPY**, **QQQ**, and **BTC** for inter-market context.

### AI journaling enhancement

Update the **Journal** section to include an **"AI Autopsy"** button. It should take the current **Lino Trade Thesis** + **Emotional State** and generate a **"Lessons Learned"** summary for that trade entry.

### Trade lock logic

Ensure the **"Log Trade"** button remains **locked** until **both**:

1. The **Emotional Check-in** is completed, and  
2. The **Risk Calculator** has a valid **R:R ratio above 1.5**

---

## Cross-Node alerts in Cursor

To make Lino proactive without being annoying, use this logic.

### Economic calendar source

Use a free API (e.g. **FinancialModelingPrep** or a **RapidAPI** for **Economic Calendar**) to fetch daily events.

### The "Impact" filter

Only alert for **High Impact** (3-star) events such as **CPI**, **FOMC**, or **NFP**.

### The "Multi-Hat" translation (most important)

Lino should not only say "CPI is coming." Lino should explain **why it matters to the user's current hat**.

**Example — BizNode:**

> Ann, High-Impact CPI data is dropping in 1 hour. This may affect long-term interest rates for your pending commercial renovation project. I'll monitor the volatility for you.

**Example — TraderNode:**

> Warning: FOMC minutes in 30 minutes. The 'Halt' light is now Yellow. I recommend closing open positions or tightening stops before the spike.

---

## Implementation prompt: Central nervous system for alerts

Build the **"Central Nervous System"** for these alerts.

### Global event monitoring & Lino cross-talk

1. **Economic calendar sync**  
   Integrate a service to fetch **High Impact** economic events for the current day.

2. **Global notification system**  
   Create a **`LinoNotification` hook** that can push alerts to the UI **regardless of which Node** the user is currently viewing.

3. **Context-aware messaging**
   - If an event is **financial** and the user is in **BizNode**, have Lino explain the impact on **interest / material costs**.
   - If the user is in **TraderNode**, have Lino trigger the **Halt** light to **Yellow** **30 minutes** before the event.

4. **Quiet hours**  
   Ensure these **Cross-Node** alerts only happen for **High** priority events. **Low / Medium** events should stay in a **Notifications** tray and **not** pop up.
