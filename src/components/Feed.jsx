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
        
        const ageMs = new Date() - new Date(latestPost.created_at);
        if (ageMs > 120000) return; // already older than 2 minutes

        const timeToWait = 120000 - ageMs;

        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

        aiTimerRef.current = setTimeout(async () => {
            try {
                // Determine rough region logic based on coordinates or generic fallback
                const systemPrompt = `You are a friendly, natural AI assistant on a local feed app based on the user's location (Lat: ${position[0]}, Lng: ${position[1]}). 
Please provide a JSON response with two keys:
1) "name": A common real first name for someone living in this general region. Give JUST the first name.
2) "reply": A helpful, conversational, and human-like response to the user's message. Don't mention you are an AI in the reply, just answer the question natively. 
Respond ONLY with raw JSON without markdown syntax.`;
                
                const userPrompt = `User's message: "${latestPost.content}"`;

                const res = await fetch('https://text.pollinations.ai/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        jsonMode: true
                    })
                });

                if (!res.ok) throw new Error("AI failed");
                const resText = await res.text();
                
                let aiName = "Assistant";
                let aiReply = "Hello! I'm here to help.";
                try {
                    const cleanText = resText.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanText);
                    if (parsed.name) aiName = parsed.name;
                    if (parsed.reply) aiReply = parsed.reply;
                } catch (e) {
                    console.error("Failed to parse AI response JSON", e, resText);
                    aiReply = resText.substring(0, 300); // fallback
                }

                const locationWKT = `POINT(${position[1]} ${position[0]})`;
                await supabase.from('posts').insert([{
                    user_id: session.user.id, // linked to user but flagged as AI
                    content: aiReply,
                    location: locationWKT,
                    is_ai: true,
                    ai_name: aiName + " (AI)"
                }]);

                console.log("AI reply posted successfully.");

            } catch (err) {
                console.error("AI Assistant error:", err);
            }
        }, timeToWait);

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
