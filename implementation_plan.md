# Miles Circle - Implementation Plan

## Project Overview
Miles Circle is a location-based social platform where users interact only within a user-controlled geographic radius. 
**Tagline**: "Draw your Circle"
**Core Constraint**: You can only see posts that are inside your circle radius.

## Tech Stack
- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS (Modern, Variables, Flexbox/Grid) for premium aesthetics.
- **Maps**: Leaflet (OpenSource/Free initially) or Mapbox/Google Maps wrapper (we will start with Leaflet for MVP ease unless specified otherwise, but PRD mentions Google/Mapbox). *Self-correction: PRD says Google Maps or Mapbox. I will use a wrapper that can swap, maybe default to Mapbox GL JS if API key provided, or Leaflet/OpenLayers for dev if no key.*
- **Backend**: Supabase (Auth, Database, Realtime) - As per user's openness to "Cloud backend".

## Phase 1: Core Engine (Weeks 1-2)
### Goal: Login, Location, Map, Radius Slider
1.  **Project Setup**
    - [ ] Clean up existing Java files.
    - [ ] Initialize Vite + React project.
    - [ ] Setup base CSS variables (Brand colors: Vermilion Red, Deep Charcoal, Cream).
    - [ ] Install dependencies (leaflet/mapbox-gl, react-router-dom, lucide-react for icons).

2.  **Authentication (Supabase)**
    - [ ] Setup Supabase client.
    - [ ] Create Auth UI (Login/Sign up screen).
    - [ ] Implement Google Sign-in & Magic Link (simulated or real).

3.  **Map Experience & "The Circle"**
    - [ ] Implement Main Map View (Full screen).
    - [ ] Add User Location Marker (Blue dot / Avatar).
    - [ ] Implement Radius Slider (UI component).
    - [ ] **Crucial**: Implement the "Globe Effect" / Circle overlay visualization.
        - As radius changes, map zooms in/out.
        - Circle stays centered.

4.  **Posting & Radius Logic**
    - [ ] Create backend table `posts` (lat, lng, content, radius).
    - [ ] Implement "Create Post" UI.
    - [ ] Implement Feed Logic: `SELECT * FROM posts WHERE distance(user, post) < user_radius`.

## Phase 2: Quality & Trust (Weeks 3-4)
- [ ] User Profiles.
- [ ] Reporting/Blocking.
- [ ] Feed sorting (Latest/Closest).

## Phase 3: Scale & Monetization (Weeks 5+)
- [ ] Business Accounts.
- [ ] Sponsored posts.

---
## Immediate Next Steps
1.  Clean directory.
2.  Initialize Vite React app.
3.  Set up pure CSS design system with brand colors.
