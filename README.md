# Minecraft Park Explorer - Envelope Quest ✉️

An isometric/top-down 3D voxel exploration browser game built with JavaScript and Three.js featuring an authentic Minecraft aesthetic.

The player controls a Minecraft character (Steve) exploring an expansive park filled with alleys, tree groves, flowerbeds, benches, and obstacles to search for and collect **5 randomly placed envelopes**.

---

## 🎮 Features

- **Dual Camera Perspectives (3rd-Person & Isometric)**:
  - **3rd-Person View**: Over-the-shoulder 3D perspective camera (`PerspectiveCamera`) looking forward behind Steve. Rotate your view in 360° via mouse click-and-drag or `Q`/`E`.
  - **Isometric View**: Classic top-down voxel projection with smooth player tracking and zoom.
  - Switch camera modes anytime by pressing **`V`** or clicking the **`🎥 View`** toolbar button.

- **Expansive Grand Park Map (56×56 Blocks)**:
  - Over 2,700 connected walkable tiles (2.4× larger exploration territory!).
  - Grand central plaza with a 3×3 water fountain pool and stone monument.
  - Concentric inner and outer gravel ring promenades connecting all sectors.
  - **North-East Grand Lake**: Deep water body with gravel beaches and a wooden pier.
  - **North-West Royal Flower Garden**: Geometric gravel walkways through vibrant tulip/dandelion flowerbeds.
  - **South-West Expanded Hedge Labyrinth**: Winding hedge corridors with benches and hidden paths.
  - **South-East Forest & Grove**: Dense oak and birch woods with secluded clearings.
  - 4 Corner plazas with cobblestone paving, trees, and benches.
  - **Locked Park Entrance Gates**: 4 decorative wrought-iron entrance gates with cobblestone archways, golden locks, and lanterns that block all exits, enclosing the park.

- **Expansive Animated Ocean & Drifting 3D Voxel Clouds**:
  - The park is situated as a grand elevated island surrounded by an expansive 460×460 block animated voxel ocean with rippling waves and a submerged sandy shelf.
  - Cobblestone island cliffs descend vertically into the sea under the boundary fences.
  - Outside each locked entrance gate, scenic wooden piers extend 5 blocks over the ocean with wooden posts and lanterns.
  - 32 chunky 3D Minecraft voxel clouds drift high across the sunny sky ($y \approx 24$) with infinite wrapping, while horizon fog creates a natural distance fade.

- **100% Guaranteed Path Accessibility**:
  - Employs a **Breadth-First Search (BFS)** flood-fill reachability algorithm from the player's spawn point.
  - Selects 5 candidate envelope spawn spots exclusively from verified reachable tiles with expansive spacing (13+ blocks apart).
  - Ensures envelopes are distributed across distinct park sectors so each playthrough offers an engaging exploration adventure.

- **Gameplay & Interaction**:
  - Walk on top of an envelope to collect it.
  - Active envelopes float and rotate with a golden sparkle halo.
  - Celebratory confetti burst and ascending pitch audio chimes upon collecting each envelope (1/5 through 5/5).
  - Collect all 5 envelopes to win the game! A victory fanfare plays and a Minecraft-style victory modal displays your stats with an option to replay with freshly randomized envelope spots.

- **Retro 8-Bit BLACKPINK Soundtrack Queue**:
  - **Procedural 8-Bit Piano BLACKPINK Playlist**: Synthesizes 5 iconic BLACKPINK tracks sequentially:
    1. **Pink Venom** (Initial track): Authentic Geomungo pluck hook & trap bounce ("Straight to your dome like whoa whoa whoa" & "Taste that pink venom").
    2. **Shut Down**: Sparkling Paganini *La Campanella* bell motif in 8-bit piano over heavy trap bass.
    3. **DDU-DU DDU-DU**: Fast, energetic trap anthem with "Hit you with that DDU-DU DDU-DU DU!" hook.
    4. **How You Like That**: Middle Eastern lead and explosive "Badabing badaboom" drop.
    5. **Kill This Love**: Grand brass fanfare and marching drum-line bounce.
  - **Auto-Queue & Jukebox**: Automatically transitions songs after 2 cycles (~35-45s), loops back seamlessly, with a clickable Jukebox HUD pill, `N` keyboard shortcut to skip tracks, toast notifications, and voice commands.
  - **Happy Win Envelope Sound**: Celebratory discovery sound featuring an ascending sparkle arpeggio, a joyful major chord chime with vibrato, and pop bubble impacts.
  - Footsteps, victory fanfare, and zero external audio file dependencies.

- **Full HUD & Accessibility**:
  - Minecraft-style inventory hotbar showing 5 envelope slots.
  - Radar compass pointing directly towards the nearest remaining envelope with real-time distance.
  - Real-time minimap in top corner showing park alleys, trees, player facing direction, and envelope pings.
  - Interactive Jukebox pill & Next Song button (`N` key) to cycle tracks.
  - Stopwatch timer tracking elapsed exploration time.
  - Camera 90° rotation button (`Q` / `E`) to view behind tall obstacles.
  - Controls: Keyboard (WASD / Arrows), on-screen touch D-pad, and optional Web Speech API Voice Control ("up", "down", "left", "right", "next song", "pink venom", "shut down", "stop").

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) and npm installed.

### Installation & Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open the displayed URL (e.g. `http://localhost:5173`) in your web browser.

3. **Run Verification Tests**:
   ```bash
   npm test
   ```

4. **Production Build**:
   ```bash
   npm run build
   ```

---

## 🕹️ Controls

| Action | Controls |
| :--- | :--- |
| **Move** | `W, A, S, D` or `Arrow Keys` (or on-screen D-pad) |
| **Toggle 3rd Person / Iso** | `V` or the "🎥 View" HUD button |
| **Look / Orbit View** | Click & Drag mouse (or swipe on touch) |
| **Rotate Camera (45°/90°)** | `Q` / `E` or the "🔄 Rotate" HUD button |
| **Zoom In / Out** | Mouse Wheel / Trackpad Scroll or `🔍+` / `🔍-` buttons |
| **Collect Envelope** | Walk directly on top of the floating envelope |
| **Toggle Sound** | "🔊 / 🔇" HUD button |
| **Voice Commands** | Click "🎙️ Voice" and speak: *"up", "down", "left", "right", "stop"* |
