# Miles Circle

![Miles Circle Logo](./logo.png)

**Tagline**: Draw your Circle

## Overview
Miles Circle is a location-based social platform where your world is defined by a radius around you. The circle moves with you, and you only see content within your chosen distance.

## Core Concept
- **The Circle**: A dynamic, movable radius centered on your location
- **Visibility Rule**: You ONLY see posts inside your circle
- **Real-time**: Your circle moves as you move
- **Local-first**: Everything is about proximity, not global feeds

## Tech Stack
- **Frontend**: React + Vite
- **Styling**: Vanilla CSS (Design System with CSS Variables)
- **Maps**: Leaflet with CartoDB Voyager tiles
- **Backend**: Supabase (PostgreSQL + PostGIS)
- **Auth**: Supabase Auth (Email Magic Link + Google OAuth)

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables
Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Project Structure
```
src/
├── components/
│   ├── AuthOverlay.jsx      # Login/signup modal
│   ├── CreatePostModal.jsx  # Post creation
│   ├── Feed.jsx             # Posts feed
│   └── PostCard.jsx         # Individual post display
├── lib/
│   └── supabase.js          # Supabase client
├── App.jsx                   # Main app logic
├── App.css                   # Component styles
├── index.css                 # Global styles & design system
└── main.jsx                  # Entry point
```

## Features (Phase 1)
- ✅ Authentication (Email Magic Link)
- ✅ Real-time location tracking
- ✅ Dynamic radius slider (0.5 - 50 miles)
- ✅ "Globe Effect" map zoom
- ✅ Create posts at your location
- ✅ View posts within your radius
- ✅ Distance-based filtering with PostGIS

## Design System
### Brand Colors
- **Vermilion Red**: `#D2554E` (Primary accent)
- **Cream**: `#EDE9E2` (Background)
- **Deep Charcoal**: `#0E0E0E` (Text)
- **Soft White**: `#FAFAFA` (UI elements)
- **UI Gray**: `#8E8E8E` (Secondary text)

### Typography
- Font Family: **Outfit** (Google Fonts)
- Modern, geometric sans-serif

### Visual Style
- Glassmorphism (frosted glass effects)
- Smooth animations
- Premium, minimal aesthetic
- Strong contrast with intentional red accents

## Database Schema
### Posts Table
```sql
posts (
  id: uuid
  user_id: uuid (FK to auth.users)
  content: text
  location: geography(point) -- PostGIS
  created_at: timestamptz
)
```

### Key Function
- `get_posts_within_radius(lat, lng, radius_miles)`: Returns posts filtered by distance using PostGIS ST_DWithin

## Roadmap
### Phase 2 (Next)
- User profiles
- Replies to posts
- Post likes/reactions
- Report/block functionality
- Feed sorting (latest/closest)

### Phase 3
- Business accounts
- Sponsored posts
- Premium subscriptions (larger radius)
- Push notifications

## License
Proprietary - All rights reserved

## Contact
Built with Antigravity AI
