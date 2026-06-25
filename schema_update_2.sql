-- schema_update_2.sql

-- 1. Create club_messages table
CREATE TABLE IF NOT EXISTS club_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES micro_clubs(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users (can restrict to members later)
CREATE POLICY "Allow authenticated read" ON club_messages FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own messages
CREATE POLICY "Allow insert own" ON club_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- 2. Update send_proximity_wave to prevent duplicates
CREATE OR REPLACE FUNCTION public.send_proximity_wave(p_recipient_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_sender_id uuid;
    v_sender_name text;
    v_waves jsonb;
    v_new_wave jsonb;
BEGIN
    v_sender_id := auth.uid();
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get sender's name
    SELECT COALESCE(full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles
    WHERE id = v_sender_id;

    -- Fetch recipient's current waves
    SELECT COALESCE(received_waves, '[]'::jsonb)
    INTO v_waves
    FROM public.profiles
    WHERE id = p_recipient_id;

    -- Prevent Duplicate Waves: Check if sender already waved
    IF (SELECT count(*) FROM jsonb_array_elements(v_waves) AS elem WHERE (elem->>'from_id')::uuid = v_sender_id) > 0 THEN
        -- Sender already waved. Silently ignore to prevent multiple waves.
        RETURN;
    END IF;

    -- Build new wave object
    v_new_wave := jsonb_build_object(
        'from_id', v_sender_id,
        'from_name', v_sender_name,
        'timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );

    -- Insert new wave at the beginning of the array
    v_waves := jsonb_insert(v_waves, '{0}', v_new_wave);

    -- Limit array length to 10 to prevent unbounded growth
    IF jsonb_array_length(v_waves) > 10 THEN
        v_waves := (SELECT jsonb_agg(elem) FROM (SELECT elem FROM jsonb_array_elements(v_waves) WITH ORDINALITY AS t(elem, idx) WHERE idx <= 10) s);
    END IF;

    -- Update recipient profile
    UPDATE public.profiles
    SET received_waves = v_waves
    WHERE id = p_recipient_id;
END;
$function$;
