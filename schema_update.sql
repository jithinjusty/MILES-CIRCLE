-- schema_update.sql
-- Run this in your Supabase SQL editor to create the new tables

-- Badges
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_name TEXT NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard Stats
CREATE TABLE leaderboard_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1
);

-- Hotspots (Temporary Map Pins)
CREATE TABLE map_hotspots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '📍',
    location GEOGRAPHY(Point) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quests
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    points_reward INTEGER DEFAULT 10,
    target_location GEOGRAPHY(Point),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quest Completions
CREATE TABLE quest_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, quest_id)
);

-- Micro-Clubs
CREATE TABLE micro_clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Club Members
CREATE TABLE club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES micro_clubs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(club_id, user_id)
);

-- Borrowing Shed (Barter Items)
CREATE TABLE barter_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'available', -- available, borrowed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all new tables (Simplified for now, you can restrict later)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE barter_items ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow authenticated read" ON user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON leaderboard_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON map_hotspots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON quests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON quest_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON micro_clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON club_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON barter_items FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own records (basic rules)
CREATE POLICY "Allow insert own" ON map_hotspots FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Allow insert own" ON quest_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow insert own" ON micro_clubs FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Allow insert own" ON club_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow insert own" ON barter_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
