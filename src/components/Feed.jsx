import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PostCard from './PostCard'

export default function Feed({ position, radius, refreshTrigger, session, onUserClick }) {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const feedEndRef = useRef(null)
    const aiTimerRef = useRef(null)

    const scrollToBottom = () => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (posts.length > 0) {
            scrollToBottom()
        }
    }, [posts])

    const fetchPosts = async () => {
        // Prevent fetching if coordinates are invalid
        if (!position || isNaN(position[0]) || isNaN(position[1])) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            console.log("Fetching posts for:", position, "radius:", radius);
            const { data, error: queryError } = await supabase
                .rpc('get_posts_within_radius', {
                    user_lat: parseFloat(position[0]),
                    user_lng: parseFloat(position[1]),
                    radius_miles: parseFloat(radius) || 1
                })

            if (queryError) {
                console.error("Supabase RPC error:", queryError);
                throw queryError;
            }

            setPosts((data || []).slice(0, 100))
        } catch (err) {
            console.error('Feed fetch error:', err)
            setError(err.message || 'Failed to load posts')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPosts()

        // Subscribe to real-time changes
        const channel = supabase
            .channel('public:posts')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'posts'
            }, () => {
                console.log("New post detected, refreshing...");
                fetchPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [position?.[0], position?.[1], radius, refreshTrigger])

    const aiProcessingRef = useRef({});

    // AI Assistant Timer
    useEffect(() => {
        if (!posts || posts.length === 0) return;

        // Oldest is first, so latest is last
        const latestPost = posts[posts.length - 1];

        // Is it mine? Avoid AI triggering on others' posts or AI's own posts
        if (latestPost.user_id !== session?.user?.id || latestPost.is_ai) {
            if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
            return;
        }

        // Prevent triggering the AI process multiple times for the same post
        if (aiProcessingRef.current[latestPost.id]) {
            return;
        }
        
        const triggerAI = async () => {
            aiProcessingRef.current[latestPost.id] = true;
            let aiName = "Assistant";
            let aiReply = "It's pretty quiet around here. Hopefully someone nearby chimes in soon!";

            try {
                const msgLower = latestPost.content.toLowerCase();
                let contextStr = "";

                // Get Weather Context
                if (msgLower.includes("weather") || msgLower.includes("rain") || msgLower.includes("temperature") || msgLower.includes("hot") || msgLower.includes("cold")) {
                    try {
                        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${position[0]}&longitude=${position[1]}&current_weather=true`);
                        const wData = await wRes.json();
                        if (wData && wData.current_weather) {
                            contextStr += `Current weather: ${wData.current_weather.temperature}°C, wind: ${wData.current_weather.windspeed} km/h. `;
                        }
                    } catch (e) { console.error("Weather fetch failed", e); }
                }

                // Get Places Context (Restaurants/Food)
                if (msgLower.includes("restaurant") || msgLower.includes("food") || msgLower.includes("eat") || msgLower.includes("cafe") || msgLower.includes("coffee")) {
                    try {
                        const viewbox = `${position[1]-0.1},${position[0]+0.1},${position[1]+0.1},${position[0]-0.1}`;
                        const pRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=restaurant&lat=${position[0]}&lon=${position[1]}&bounded=1&viewbox=${viewbox}&limit=3`);
                        const pData = await pRes.json();
                        const placeNames = pData.map(p => p.name).filter(Boolean).join(", ");
                        if (placeNames) contextStr += `Nearby places: ${placeNames}. `;
                    } catch (e) { console.error("Places fetch failed", e); }
                }

                // Construct Prompt
                const prompt = `You are a real persona acting as a helpful local neighbor near Lat: ${position[0]}, Lng: ${position[1]}. 
${contextStr ? 'REAL-TIME CONTEXT DATA AVAILABLE TO YOU: ' + contextStr : ''}
User's message: "${latestPost.content}"
Instructions:
1. Provide a natural, friendly, human-like reply answering the user directly.
2. If real-time context data was provided above, use it to answer their question (e.g. recommend those exact restaurants or give that weather).
3. Do NOT say you are an AI. Act like a real person living nearby.
4. Format your output EXACTLY like this:
FIRST_NAME_OF_NEIGHBOR|THE_REPLY
Example:
Alex|Hey! The weather is great today, and you should check out Joe's Cafe!`;

                // Use simple GET request to avoid POST JSON format/Cloudflare issues
                const url = `https://text.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
                const res = await fetch(url);
                
                if (!res.ok) throw new Error("AI failed with status: " + res.status);
                const resText = await res.text();
                
                // Parse the delimitated response
                const parts = resText.split('|');
                if (parts.length >= 2) {
                    aiName = parts[0].replace(/[^a-zA-Z]/g, '').substring(0, 15).trim() || "Local";
                    aiReply = parts.slice(1).join('|').trim();
                } else {
                    const localNames = ["Alex", "Sam", "Jordan", "Casey", "Taylor"];
                    aiName = localNames[Math.floor(Math.random() * localNames.length)];
                    aiReply = resText.substring(0, 300).trim();
                }

            } catch (err) {
                console.error("AI Assistant API error (falling back to generic response):", err);
                const localNames = ["Alex", "Sam", "Jordan", "Casey", "Taylor", "Morgan", "Avery"];
                aiName = localNames[Math.floor(Math.random() * localNames.length)];
            }

            try {
                const locationWKT = `POINT(${position[1]} ${position[0]})`;
                await supabase.from('posts').insert([{
                    user_id: session.user.id, // linked to user but flagged as AI
                    content: aiReply,
                    location: locationWKT,
                    is_ai: true,
                    ai_name: aiName + " (AI)"
                }]);
                console.log("AI reply posted successfully.");
            } catch (insertErr) {
                console.error("Failed to insert AI reply:", insertErr);
                aiProcessingRef.current[latestPost.id] = false; // Allow retry
            }
        };

        const ageMs = new Date() - new Date(latestPost.created_at);
        if (ageMs > 60000) {
            // Already older than 1 minute, trigger instantly
            triggerAI();
        } else {
            const timeToWait = 60000 - ageMs;
            if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
            aiTimerRef.current = setTimeout(triggerAI, timeToWait);
        }

        return () => {
            if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        }
    }, [posts, position, session?.user?.id]);

    if (loading && posts.length === 0) {
        return (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <div className="pulse-circle">
                    <div className="spinner"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="onboarding-card-premium" style={{ margin: '2rem auto', textAlign: 'center', border: '1px solid rgba(210, 85, 78, 0.3)' }}>
                <div className="icon-badge" style={{ background: 'rgba(210, 85, 78, 0.1)', color: 'var(--accent-red)', margin: '0 auto 1.5rem' }}>
                    <RefreshCw size={32} />
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Something went wrong</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>{error}</p>
                <button className="btn-onboarding-next" style={{ padding: '12px 24px' }} onClick={fetchPosts}>
                    Try Restoring Connection
                </button>
            </div>
        )
    }

    if (posts.length === 0) {
        return (
            <div className="system-welcome-card anim-fade-in" style={{ margin: '4rem 2rem' }}>
                <div className="welcome-tag">Empty Circle</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Silence in the Neighborhood</h3>
                <p className="welcome-text">No one in your {radius}-mile circle has shared anything yet. Be the first to start a conversation!</p>
                <div style={{ marginTop: '2rem', opacity: 0.5, fontSize: '0.8rem' }}>
                    💡 Pro-tip: Try expanding your radius in the map view.
                </div>
            </div>
        )
    }

    return (
        <div className="app-feed-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    isMine={post.user_id === session?.user?.id && !post.is_ai}
                    onUserClick={onUserClick}
                />
            ))}
            <div ref={feedEndRef} />
        </div>
    )
}
