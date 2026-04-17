import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PostCard from './PostCard'

export default function Feed({ position, radius, refreshTrigger, session, onUserClick, onReplyChange }) {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [replyingTo, setReplyingTo] = useState(null)
    const [unreadCount, setUnreadCount] = useState(0)
    const [showScrollDown, setShowScrollDown] = useState(false)
    const feedEndRef = useRef(null)
    const aiTimerRef = useRef(null)
    const isInitialLoad = useRef(true);
    const prevPostsLength = useRef(0);
    const scrollContainerRef = useRef(null);

    const scrollToBottom = (behavior = 'smooth') => {
        feedEndRef.current?.scrollIntoView({ behavior });
    }

    const isNearBottom = () => {
        const container = scrollContainerRef.current || feedEndRef.current?.closest('.chat-messages-scroll');
        if (!container) return false;
        const threshold = 150; 
        const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distance < threshold;
    };

    useEffect(() => {
        const container = feedEndRef.current?.closest('.chat-messages-scroll');
        if (container) {
            scrollContainerRef.current = container;
            const handleScroll = () => {
                if (isNearBottom()) {
                    setUnreadCount(0);
                    setShowScrollDown(false);
                } else {
                    setShowScrollDown(true);
                }
            };
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [posts.length]); // Re-attach if needed when posts change

    useEffect(() => {
        if (posts.length > 0) {
            const lastPost = posts[posts.length - 1];
            const isMyPost = session?.user?.id && (lastPost.user_id === session.user.id && !lastPost.is_ai);
            const nearBottom = isNearBottom();

            if (isInitialLoad.current) {
                // Instantly jump to bottom on first open
                feedEndRef.current?.scrollIntoView({ behavior: 'auto' });
                isInitialLoad.current = false;
            } else if (isMyPost || nearBottom) {
                // Smoothly auto-scroll if it's the user's post or they are at the bottom
                feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                setUnreadCount(0);
            } else {
                // User is reading history, update unread count for new messages
                const diff = posts.length - prevPostsLength.current;
                if (diff > 0 && prevPostsLength.current > 0) {
                    setUnreadCount(prev => prev + diff);
                }
            }
            prevPostsLength.current = posts.length;
        }
    }, [posts, session])

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

            // ── Step 1: Detect country via reverse geocoding → pick a region-appropriate name ──
            const NAMES_BY_COUNTRY = {
                IN: ['Rahul','Priya','Arjun','Meena','Vikram','Ananya','Ravi','Sneha','Kiran','Divya'],
                PK: ['Ali','Fatima','Ahmed','Zara','Hassan','Ayesha','Usman','Sana','Bilal','Hina'],
                BD: ['Rahim','Nusrat','Karim','Riya','Tariq','Mitu','Sabbir','Lima','Arif','Mim'],
                LK: ['Ashan','Dilini','Roshan','Nirmala','Kasun','Harsha','Chamara','Thilini'],
                AE: ['Omar','Fatima','Khalid','Mariam','Hamdan','Noura','Saif','Hessa'],
                SA: ['Abdullah','Maryam','Tariq','Lina','Faisal','Sara','Khalid','Noor'],
                GB: ['James','Emily','Oliver','Sophia','Harry','Amelia','Jack','Isla'],
                US: ['Michael','Ashley','James','Jessica','David','Sarah','Chris','Amanda'],
                AU: ['Liam','Charlotte','Noah','Olivia','Jack','Ava','William','Mia'],
                FR: ['Pierre','Sophie','Louis','Emma','Lucas','Léa','Théo','Camille'],
                DE: ['Lukas','Anna','Felix','Laura','Jonas','Lena','Maximilian','Julia'],
                JP: ['Yuto','Hana','Sota','Yui','Haruto','Mio','Ren','Sakura'],
                CN: ['Wei','Fang','Yang','Li','Jun','Xiu','Ming','Ying'],
                BR: ['Lucas','Ana','Gabriel','Julia','Pedro','Maria','Rafael','Larissa'],
                MX: ['Carlos','Maria','José','Sofía','Luis','Valentina','Jorge','Camila'],
                NG: ['Emeka','Ngozi','Chidi','Adaeze','Tunde','Funke','Seun','Amaka'],
                ZA: ['Sipho','Nomsa','Thabo','Zanele','Lebo','Ayanda','Bongani','Palesa'],
                KE: ['David','Grace','Brian','Faith','Kevin','Joyce','John','Mary'],
                EG: ['Mohamed','Nour','Ahmed','Dina','Omar','Rana','Youssef','Laila'],
                default: ['Alex','Sam','Jordan','Casey','Taylor','Morgan','Avery','Jamie']
            };

            let aiName = 'Alex'; // will be overridden
            try {
                const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&zoom=3&email=hello@milescircle.com`);
                const revData = await revRes.json();
                const cc = (revData?.address?.country_code || '').toUpperCase();
                const state = (revData?.address?.state || '').toLowerCase();
                let pool = NAMES_BY_COUNTRY[cc] || NAMES_BY_COUNTRY.default;
                
                // Specific names for Kerala
                if (cc === 'IN' && (state.includes('kerala') || state.includes('kl'))) {
                    pool = ['Rahul','Anjali','Jithin','Meera','Arun','Sruthi','Vishnu','Aswathy'];
                }
                
                const latSeed = Math.floor(position[0] * 10);
                const lngSeed = Math.floor(position[1] * 10);
                const hashIndex = Math.abs((latSeed * 31) + lngSeed) % pool.length;
                aiName = pool[hashIndex];
            } catch(e) {
                const pool = NAMES_BY_COUNTRY.default;
                aiName = pool[0]; // Constant fallback
            }

            let aiReply = "It's pretty quiet around here. Hopefully someone nearby chimes in soon!";

            const msgLower = latestPost.content.toLowerCase();
            let contextStr = "";

            try {
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
                        // Added email to prevent 403 Forbidden
                        const pRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=restaurant&lat=${position[0]}&lon=${position[1]}&bounded=1&viewbox=${viewbox}&limit=3&email=hello@milescircle.com`);
                        const pData = await pRes.json();
                        const placeNames = pData.map(p => p.name).filter(Boolean).join(" and ");
                        if (placeNames) contextStr += `Nearby places: ${placeNames}. `;
                    } catch (e) { console.error("Places fetch failed", e); }
                }

                // ── Step 2: Prompt AI for message text ONLY (no name parsing needed) ──
                const systemPrompt = `You are ${aiName}, a local resident near Lat:${position[0]}, Lng:${position[1]}.
CRITICAL: Reply using the SAME LANGUAGE used by the neighbor. 
(If they speak Malayalam, you MUST reply in Malayalam. If they speak Hindi, reply in Hindi. If English, reply in English).
Reply casually to your neighbor like a short text message. Be warm and brief (1-2 sentences max).
Never say you are an AI. Output ONLY the reply message text with no name prefix, no formatting.`;
                const userPrompt = `${contextStr ? 'Local context: ' + contextStr + '\n' : ''}Neighbor said: "${latestPost.content}"`;
                const prompt = `${systemPrompt}\n${userPrompt}`;

                let resText = "";
                const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
                const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

                const fetchPollinations = async () => {
                    const url = `https://text.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=openai`;
                    const res = await fetch(url);
                    if (!res.ok) throw new Error("Pollinations failed with status: " + res.status);
                    return await res.text();
                };

                const fetchGemini = async () => {
                    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [
                                { role: "user", parts: [{ text: systemPrompt }] },
                                { role: "model", parts: [{ text: "Understood. I am a local resident. I will format as Name|Message." }] },
                                { role: "user", parts: [{ text: userPrompt }] }
                            ],
                            generationConfig: { temperature: 0.8, maxOutputTokens: 250 }
                        })
                    });
                    const geminiData = await geminiRes.json();
                    if (geminiData.candidates && geminiData.candidates.length > 0) {
                        return geminiData.candidates[0].content.parts[0].text;
                    }
                    throw new Error("Gemini invalid response");
                };

                if (openRouterKey) {
                    try {
                        const openRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${openRouterKey}`,
                                "HTTP-Referer": "https://milescircle.app",
                                "X-Title": "Miles Circle",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                model: "openrouter/free",
                                messages: [
                                    { role: "system", content: systemPrompt },
                                    { role: "user", content: userPrompt }
                                ]
                            })
                        });
                        const openData = await openRes.json();
                        if (openData.choices && openData.choices.length > 0) {
                            resText = openData.choices[0].message.content;
                        } else {
                            throw new Error("OpenRouter invalid response");
                        }
                    } catch (oErr) {
                        console.error("OpenRouter failed, falling back...", oErr);
                        if (geminiKey) {
                            try { resText = await fetchGemini(); }
                            catch (gErr) { resText = await fetchPollinations(); }
                        } else {
                            resText = await fetchPollinations();
                        }
                    }
                } else if (geminiKey) {
                    try {
                        resText = await fetchGemini();
                    } catch (gErr) {
                        console.error("Gemini failed, falling back to Pollinations:", gErr);
                        resText = await fetchPollinations();
                    }
                } else {
                    resText = await fetchPollinations();
                }
                
                // ── Step 3: Use AI response directly as the reply text ──
                if (resText.startsWith('"') && resText.endsWith('"')) {
                    resText = resText.substring(1, resText.length - 1);
                }
                // Strip any accidental name prefix (NAME: or NAME|) the model might add
                resText = resText.replace(/^[A-Za-z]{1,20}[:|]\s*/,'');
                resText = resText.replace(/As an AI|I am an AI|artificial intelligence|language model|how can I assist/gi, '');
                aiReply = resText.substring(0, 300).trim() || aiReply;

            } catch (err) {
                console.error("AI Assistant API error (falling back to context-aware response):", err);
                const localNames = ["Alex", "Sam", "Jordan", "Casey", "Taylor", "Morgan", "Avery", "Jamie"];
                aiName = localNames[Math.floor(Math.random() * localNames.length)];
                
                // Extremely intelligent fallback checking local context string
                if (contextStr.includes("Nearby places")) {
                    const placesList = contextStr.split("Nearby places: ")[1]?.split(".")[0];
                    if (msgLower.includes("best") || msgLower.includes("rating") || msgLower.includes("google")) {
                        aiReply = `I'm not exactly sure about Google ratings, but some really popular spots right near us are ${placesList}. You can't go wrong with those!`;
                    } else if (msgLower.includes("coffee") || msgLower.includes("cafe")) {
                        aiReply = `If you're looking for a good cafe or spot around here, you should definitely check out ${placesList.split(" and ")[0] || "center town"}.`;
                    } else {
                        aiReply = `If you are looking for food nearby, a few great options are ${placesList}. Let me know if you decide to try one out!`;
                    }
                } else if (contextStr.includes("Current weather")) {
                    const weatherDetails = contextStr.split("Current weather: ")[1]?.split(".")[0];
                    const tempMatch = weatherDetails?.match(/[-0-9.]+/);
                    const tempInt = tempMatch ? parseFloat(tempMatch[0]) : 20;

                    if (msgLower.includes("raining") || msgLower.includes("rain") || msgLower.includes("umbrella")) {
                        aiReply = `I just checked and it's about ${tempInt}°C here. Always good to bring an umbrella just in case though!`;
                    } else if (msgLower.includes("hot") || msgLower.includes("cold")) {
                        if (tempInt > 24) aiReply = `Yeah, it's pretty warm today! Sitting at around ${tempInt}°C. Best to wear something light!`;
                        else if (tempInt < 12) aiReply = `It's definitely quite chilly today, roughly ${tempInt}°C out. Make sure you bring a jacket!`;
                        else aiReply = `It's actually pretty mild out right now, around ${tempInt}°C. Perfect weather.`;
                    } else {
                        aiReply = `Hey! I just checked the local radar and it's currently ${weatherDetails} right around here. Perfect for a quick walk outside!`;
                    }
                } else if (msgLower.includes("traffic")) {
                    aiReply = "Traffic isn't looking too bad from where I am, but definitely pull up your maps router just to be safe!";
                } else if (msgLower.includes("hi") || msgLower.includes("hello") || msgLower.includes("hey") || msgLower.includes("hola") || msgLower.includes("bonjour")) {
                    const greetings = ["Hey there!", "Hello!", "Hi! Welcome to the neighborhood feed.", "Hey! How's it going?", "Hola! Bienvenidos.", "Bonjour!"];
                    aiReply = greetings[Math.floor(Math.random() * greetings.length)] + " Let me know if you need any local recommendations.";
                } else if (msgLower.includes("how are you") || msgLower.includes("what's up")) {
                    aiReply = "I'm doing great, thanks for asking! Just hanging out nearby. How about you?";
                } else {
                    const genericResponses = [
                        "I'm not totally sure about that, but it sounds interesting! Hopefully someone else nearby knows.",
                        "That's a great point! I'd love to hear what other locals think.",
                        "Hmm, I haven't really thought about that before. You might be right!",
                        "I'm out and about, but I'll definitely check into that later!"
                    ];
                    aiReply = genericResponses[Math.floor(Math.random() * genericResponses.length)];
                }
            }

            try {
                const locationWKT = `POINT(${position[1]} ${position[0]})`;
                const aiInsert = {
                    user_id: session.user.id,
                    content: aiReply,
                    location: locationWKT,
                    is_ai: true,
                    ai_name: aiName,
                    // Link the AI reply to the original post so quoted preview shows
                    reply_to_id: latestPost.id,
                    reply_to_content: latestPost.content?.substring(0, 200),
                    reply_to_author: latestPost.full_name || latestPost.user_email?.split('@')[0] || 'You'
                };
                await supabase.from('posts').insert([aiInsert]);
                console.log("AI reply posted successfully.");
            } catch (insertErr) {
                console.error("Failed to insert AI reply:", insertErr);
                aiProcessingRef.current[latestPost.id] = false;
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

    // Handle reply selection from PostCard
    const handleReply = (post) => {
        const replyName = post.is_ai ? post.ai_name : (post.full_name || post.user_email?.split('@')[0] || 'Someone');
        const ctx = { id: post.id, content: post.content, author: replyName };
        setReplyingTo(ctx);
        onReplyChange?.(ctx);
        scrollToBottom('smooth');
    };

    // Handle AI-generated reply text being inserted into composer
    const handleAIReply = (post, suggestion) => {
        const replyName = post.is_ai ? post.ai_name : (post.full_name || post.user_email?.split('@')[0] || 'Someone');
        const ctx = { id: post.id, content: post.content, author: replyName };
        setReplyingTo(ctx);
        onReplyChange?.(ctx, suggestion);
        scrollToBottom('smooth');
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
            <div className="app-feed-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '0.5rem' }}>
                {posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        posts={posts}
                        isMine={post.user_id === session?.user?.id && !post.is_ai}
                        onUserClick={onUserClick}
                        onReply={handleReply}
                        onAIReply={handleAIReply}
                    />
                ))}
                <div ref={feedEndRef} />
            </div>

            {/* Floating New Message Notification */}
            {showScrollDown && (
                <button 
                    onClick={() => scrollToBottom('smooth')}
                    className="scroll-down-btn anim-fade-in"
                    style={{
                        position: 'fixed',
                        bottom: '90px', // Above the taskbar/input
                        right: '25px',
                        width: '45px',
                        height: '45px',
                        borderRadius: '50%',
                        background: 'var(--accent-red)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(var(--accent-red-rgb), 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justify-content: 'center',
                        cursor: 'pointer',
                        zIndex: 100,
                        transition: 'all 0.3s'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
                    </svg>
                    {unreadCount > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#ffefef',
                            color: 'var(--accent-red)',
                            fontSize: '0.75rem',
                            fontWeight: '900',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            border: '2px solid var(--accent-red)',
                            minWidth: '24px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}>
                            {unreadCount}
                        </div>
                    )}
                </button>
            )}
        </div>
    )
}
