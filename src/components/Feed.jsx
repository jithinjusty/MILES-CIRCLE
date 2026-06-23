import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PostCard from './PostCard'

export default function Feed({ position, radius, refreshTrigger, session, onUserClick, onReplyChange, activeNeighborsCount = 1 }) {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [replyingTo, setReplyingTo] = useState(null)
    const [unreadCount, setUnreadCount] = useState(0)
    const [showScrollDown, setShowScrollDown] = useState(false)
    const [activeCategory, setActiveCategory] = useState('all')
    const [sortBy, setSortBy] = useState('latest')
    const [helpfulPosts, setHelpfulPosts] = useState({})
    const [swiperMode, setSwiperMode] = useState(false)
    const [swiperIndex, setSwiperIndex] = useState(0)
    const feedEndRef = useRef(null)
    const feedStartRef = useRef(null)
    const aiTimerRef = useRef(null)
    const isInitialLoad = useRef(true);
    const prevPostsLength = useRef(0);
    const scrollContainerRef = useRef(null);

    const [announcements, setAnnouncements] = useState([])
    const [currentAnnounceIdx, setCurrentAnnounceIdx] = useState(0)

    // Offers States
    const [offers, setOffers] = useState([])
    const [loadingOffers, setLoadingOffers] = useState(false)
    const [showCreateOffer, setShowCreateOffer] = useState(false);
    const [offerTitle, setOfferTitle] = useState('');
    const [offerDesc, setOfferDesc] = useState('');
    const [offerPoints, setOfferPoints] = useState('');
    const [offerInrPerPoint, setOfferInrPerPoint] = useState('1.0');
    const [offerFreeAccess, setOfferFreeAccess] = useState('');
    const [postingOffer, setPostingOffer] = useState(false);

    const fetchOffers = async () => {
        setLoadingOffers(true);
        try {
            const { data, error } = await supabase
                .from('shop_offers')
                .select('*, profiles(full_name, avatar_url, points)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOffers(data || []);
        } catch (err) {
            console.error("Error fetching offers:", err);
        } finally {
            setLoadingOffers(false);
        }
    };

    const handleCreateOffer = async (e) => {
        if (e) e.preventDefault();
        if (!session?.user?.id) return;

        setPostingOffer(true);
        try {
            const { error } = await supabase
                .from('shop_offers')
                .insert([{
                    user_id: session.user.id,
                    title: offerTitle.trim(),
                    description: offerDesc.trim(),
                    points_required: parseInt(offerPoints) || 0,
                    inr_value_per_point: parseFloat(offerInrPerPoint) || 1.0,
                    free_access_desc: offerFreeAccess.trim() || null
                }]);

            if (error) throw error;
            
            setOfferTitle('');
            setOfferDesc('');
            setOfferPoints('');
            setOfferInrPerPoint('1.0');
            setOfferFreeAccess('');
            setShowCreateOffer(false);
            fetchOffers();
        } catch (err) {
            console.error("Error creating shop offer:", err);
            alert("Failed to create offer: " + err.message);
        } finally {
            setPostingOffer(false);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*, profiles(full_name, avatar_url, points)')
                .order('created_at', { ascending: false });
            if (!error && data) {
                setAnnouncements(data);
            }
        } catch (err) {
            console.error("Error fetching announcements:", err);
        }
    };

    const getPostCategory = (content) => {
        if (!content) return 'general';
        const lower = content.toLowerCase();
        
        if (lower.includes('#buysell') || lower.includes('#buy') || lower.includes('#sell') || lower.includes('#forsale') ||
            (/\b(selling|buying|for sale|price|price:)\b/.test(lower))) {
            return 'buysell';
        }
        if (lower.includes('#lostfound') || lower.includes('#lost') || lower.includes('#found') ||
            (/\b(lost|found|missing|lost my|found a)\b/.test(lower))) {
            return 'lostfound';
        }
        if (lower.includes('#recommend') || lower.includes('#review') || lower.includes('#places') ||
            (/\b(recommend|recommendation|best place|where can i find|good doctor|good cafe)\b/.test(lower))) {
            return 'recommendations';
        }
        return 'general';
    };

    const filteredPosts = posts
        .filter(post => {
            if (activeCategory === 'all') return true;
            return getPostCategory(post.content) === activeCategory;
        })
        .sort((a, b) => {
            if (sortBy === 'closest') {
                return (a.distance_miles || 0) - (b.distance_miles || 0);
            }
            if (sortBy === 'helpful') {
                return (b.helpful_count || 0) - (a.helpful_count || 0);
            }
            // default latest
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });

    const scrollToTop = (behavior = 'smooth') => {
        feedStartRef.current?.scrollIntoView({ behavior });
    }

    const isNearTop = () => {
        const container = scrollContainerRef.current || feedStartRef.current?.closest('.chat-messages-scroll');
        if (!container) return false;
        const threshold = 150; 
        return container.scrollTop < threshold;
    };

    useEffect(() => {
        const container = feedStartRef.current?.closest('.chat-messages-scroll');
        if (container) {
            scrollContainerRef.current = container;
            const handleScroll = () => {
                if (isNearTop()) {
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
            // Find the newest post by created_at timestamp
            let newestPost = posts[0];
            for (let i = 1; i < posts.length; i++) {
                const tNew = newestPost.created_at ? new Date(newestPost.created_at).getTime() : 0;
                const tCurr = posts[i].created_at ? new Date(posts[i].created_at).getTime() : 0;
                if (tCurr > tNew) {
                    newestPost = posts[i];
                }
            }

            const isMyPost = session?.user?.id && newestPost && (newestPost.user_id === session.user.id && !newestPost.is_ai);
            const nearTop = isNearTop();

            if (isInitialLoad.current) {
                // Instantly jump to top on first open
                feedStartRef.current?.scrollIntoView({ behavior: 'auto' });
                isInitialLoad.current = false;
            } else if (isMyPost || nearTop) {
                // Smoothly auto-scroll if it's the user's post or they are at the top
                feedStartRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    useEffect(() => {
        setSwiperIndex(0);
        if (activeCategory !== 'buysell') {
            setSwiperMode(false);
        }
    }, [activeCategory, posts.length]);

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

            const fetchedPosts = (data || []).slice(0, 100);
            setPosts(fetchedPosts)

            if (session?.user?.id && fetchedPosts.length > 0) {
                const postIds = fetchedPosts.map(p => p.id);
                const { data: helpfulData, error: helpfulError } = await supabase
                    .rpc('get_user_helpful_posts', {
                        p_user_id: session.user.id,
                        p_post_ids: postIds
                    });
                if (!helpfulError && helpfulData) {
                    const helpfulMap = {};
                    helpfulData.forEach(item => {
                        helpfulMap[item.post_id] = true;
                    });
                    setHelpfulPosts(helpfulMap);
                }
            }
        } catch (err) {
            console.error('Feed fetch error:', err)
            setError(err.message || 'Failed to load posts')
        } finally {
            setLoading(false)
        }
    }

    const handleHelpfulToggle = async (postId, authorId) => {
        if (!session?.user?.id) {
            alert("Please sign in to upvote posts!");
            return;
        }

        const currentlyHelpful = !!helpfulPosts[postId];
        
        // Optimistic UI updates
        setHelpfulPosts(prev => ({
            ...prev,
            [postId]: !currentlyHelpful
        }));
        
        setPosts(prevPosts => prevPosts.map(p => {
            if (p.id === postId) {
                const currentCount = p.helpful_count || 0;
                return {
                    ...p,
                    helpful_count: currentlyHelpful ? Math.max(0, currentCount - 1) : currentCount + 1
                };
            }
            return p;
        }));

        try {
            if (currentlyHelpful) {
                const { error } = await supabase
                    .from('post_helpful')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', session.user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('post_helpful')
                    .insert([{
                        post_id: postId,
                        user_id: session.user.id,
                        author_id: authorId
                    }]);
                if (error) throw error;
            }
        } catch (err) {
            console.error("Failed to toggle helpful status:", err);
            // Rollback optimistic update
            setHelpfulPosts(prev => ({
                ...prev,
                [postId]: currentlyHelpful
            }));
            setPosts(prevPosts => prevPosts.map(p => {
                if (p.id === postId) {
                    const currentCount = p.helpful_count || 0;
                    return {
                        ...p,
                        helpful_count: currentlyHelpful ? currentCount + 1 : Math.max(0, currentCount - 1)
                    };
                }
                return p;
            }));
        }
    };

    const handleSwipeRight = (post) => {
        const replyName = post.is_ai ? post.ai_name : (post.full_name || post.user_email?.split('@')[0] || 'Someone');
        const ctx = { id: post.id, content: post.content, author: replyName };
        onReplyChange?.(ctx, `Hi! I saw your post "${post.content.substring(0, 30)}${post.content.length > 30 ? '...' : ''}" in Buy & Sell. Is this still available?`);
        setSwiperIndex(prev => prev + 1);
    };

    useEffect(() => {
        fetchPosts()

        // Subscribe to real-time posts changes (INSERT, UPDATE, DELETE)
        const channel = supabase
            .channel('public:posts')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'posts'
            }, () => {
                console.log("Post change detected, refreshing...");
                fetchPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [position?.[0], position?.[1], radius, refreshTrigger])

    useEffect(() => {
        fetchAnnouncements();

        // Subscribe to real-time announcements changes
        const announceChannel = supabase
            .channel('public:announcements')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'announcements'
            }, () => {
                console.log("Announcement change detected, refreshing...");
                fetchAnnouncements();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(announceChannel);
        };
    }, []);

    useEffect(() => {
        if (activeCategory === 'offers') {
            fetchOffers();
        }

        const offersChannel = supabase
            .channel('public:shop_offers')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'shop_offers'
            }, () => {
                if (activeCategory === 'offers') {
                    fetchOffers();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(offersChannel);
        };
    }, [activeCategory, refreshTrigger]);

    useEffect(() => {
        if (announcements.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentAnnounceIdx(prev => (prev + 1) % announcements.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [announcements.length]);

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
                                models: [
                                    "meta-llama/llama-3-8b-instruct:free",
                                    "google/gemma-2-9b-it:free",
                                    "qwen/qwen-2.5-7b-instruct:free",
                                    "microsoft/phi-3-medium-128k-instruct:free",
                                    "openrouter/free"
                                ],
                                messages: [
                                    { role: "system", content: systemPrompt },
                                    { role: "user", content: userPrompt }
                                ]
                            })
                        });
                        const openData = await openRes.json();
                        if (openData.choices && openData.choices.length > 0) {
                            const rawText = openData.choices[0].message.content || "";
                            if (rawText.toLowerCase().includes("user safety:") || 
                                rawText.toLowerCase().includes("response safety:") || 
                                rawText.trim().toLowerCase() === "safe") {
                                throw new Error("OpenRouter returned content safety moderation message instead of chat reply");
                            }
                            resText = rawText;
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
        scrollToTop('smooth');
    };

    // Handle AI-generated reply text being inserted into composer
    const handleAIReply = (post, suggestion) => {
        const replyName = post.is_ai ? post.ai_name : (post.full_name || post.user_email?.split('@')[0] || 'Someone');
        const ctx = { id: post.id, content: post.content, author: replyName };
        setReplyingTo(ctx);
        onReplyChange?.(ctx, suggestion);
        scrollToTop('smooth');
    };

    const categories = [
        { id: 'all', label: 'All sphere', icon: '🌍' },
        { id: 'general', label: 'General', icon: '💬' },
        { id: 'buysell', label: 'Buy & Sell', icon: '🏷️' },
        { id: 'offers', label: 'Local Offers', icon: '🎁' },
        { id: 'lostfound', label: 'Lost & Found', icon: '🔍' },
        { id: 'recommendations', label: 'Recommendations', icon: '🌟' }
    ];

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
            {/* Category Filter Bar */}
            <div className="feed-category-bar" style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 16px',
                overflowX: 'auto',
                borderBottom: '1px solid var(--glass-border)',
                background: 'rgba(30, 30, 30, 0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setActiveCategory(cat.id)}
                            style={{
                                background: activeCategory === cat.id ? 'var(--accent-red)' : 'var(--glass-bg)',
                                color: activeCategory === cat.id ? 'white' : 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '20px',
                                padding: '8px 16px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                boxShadow: activeCategory === cat.id ? '0 4px 12px rgba(210,85,78,0.3)' : 'none'
                            }}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
                    {activeCategory === 'buysell' && (
                        <button
                            type="button"
                            onClick={() => setSwiperMode(!swiperMode)}
                            style={{
                                background: swiperMode ? '#2ecc71' : 'var(--glass-bg)',
                                color: swiperMode ? 'white' : 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '20px',
                                padding: '8px 16px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                boxShadow: swiperMode ? '0 4px 12px rgba(46,204,113,0.3)' : 'none'
                            }}
                        >
                            <span>🛍️</span>
                            <span>{swiperMode ? 'List View' : 'Swiper'}</span>
                        </button>
                    )}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            background: 'var(--glass-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '20px',
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <option value="latest" style={{ background: '#1c1c1e', color: 'var(--text-primary)' }}>🕒 Latest</option>
                        <option value="closest" style={{ background: '#1c1c1e', color: 'var(--text-primary)' }}>📍 Closest</option>
                        <option value="helpful" style={{ background: '#1c1c1e', color: 'var(--text-primary)' }}>⭐ Helpful</option>
                    </select>
                </div>
            </div>

            {/* Karma Announcement Board */}
            {announcements.length > 0 && (
                <div 
                    className="karma-announcement-ticker" 
                    style={{
                        background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 87, 34, 0.1) 100%)',
                        borderBottom: '1px solid rgba(255, 193, 7, 0.2)',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        zIndex: 5
                    }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #FFC107 0%, #FF5722 100%)',
                        color: 'black',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '0.65rem',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 4px 10px rgba(255, 193, 7, 0.3)',
                        flexShrink: 0
                    }}>
                        <span>👑</span> Karma Broadcast
                    </div>
                    
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '24px' }}>
                        {announcements.map((announce, idx) => {
                            const isCurrent = idx === currentAnnounceIdx;
                            const author = announce.profiles;
                            const authorName = author?.full_name || 'Active Neighbor';
                            const points = author?.points || 0;
                            const avatar = author?.avatar_url;
                            const initials = (authorName || '?')[0].toUpperCase();
                            
                            return (
                                <div
                                    key={announce.id}
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transform: isCurrent ? 'translateY(0)' : 'translateY(30px)',
                                        opacity: isCurrent ? 1 : 0,
                                        transition: 'all 0.5s ease-in-out',
                                        pointerEvents: isCurrent ? 'auto' : 'none'
                                    }}
                                >
                                    {/* Small Avatar */}
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        fontSize: '0.6rem',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        color: '#FFC107',
                                        flexShrink: 0
                                    }}>
                                        {avatar ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initials}
                                    </div>
                                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#FFC107', whiteSpace: 'nowrap' }}>
                                        {authorName} ({points} pts):
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                        {announce.content}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    {announcements.length > 1 && (
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            {announcements.map((_, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: idx === currentAnnounceIdx ? '#FFC107' : 'rgba(255,255,255,0.2)',
                                        transition: 'background 0.3s'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {swiperMode ? (
                <div className="swiper-container" style={{
                    padding: '2rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    minHeight: '450px'
                }}>
                    {swiperIndex < filteredPosts.length ? (
                        <div style={{ width: '100%', maxWidth: '420px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {/* Visual Stack Effect */}
                            {swiperIndex + 2 < filteredPosts.length && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    width: '90%',
                                    height: '320px',
                                    background: 'var(--panel-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '20px',
                                    opacity: 0.2,
                                    transform: 'scale(0.9)',
                                    zIndex: 1,
                                    pointerEvents: 'none'
                                }} />
                            )}
                            {swiperIndex + 1 < filteredPosts.length && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    width: '95%',
                                    height: '320px',
                                    background: 'var(--panel-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '20px',
                                    opacity: 0.5,
                                    transform: 'scale(0.95)',
                                    zIndex: 2,
                                    pointerEvents: 'none'
                                }} />
                            )}
                            {/* Front Card */}
                            <div style={{ width: '100%', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                <PostCard
                                    post={filteredPosts[swiperIndex]}
                                    posts={posts}
                                    isMine={filteredPosts[swiperIndex].user_id === session?.user?.id && !filteredPosts[swiperIndex].is_ai}
                                    onUserClick={onUserClick}
                                    onReply={handleReply}
                                    onAIReply={handleAIReply}
                                    isHelpful={!!helpfulPosts[filteredPosts[swiperIndex].id]}
                                    onHelpfulToggle={handleHelpfulToggle}
                                    session={session}
                                />
                            </div>

                            {/* Tinder Swipe Controls */}
                            <div style={{
                                display: 'flex',
                                gap: '24px',
                                marginTop: '24px',
                                zIndex: 4,
                                justifyContent: 'center',
                                width: '100%'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setSwiperIndex(prev => prev + 1)}
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        border: '1px solid rgba(210,85,78,0.3)',
                                        background: 'var(--panel-bg)',
                                        color: 'var(--accent-red)',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    title="Skip Listing"
                                >
                                    ❌
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSwipeRight(filteredPosts[swiperIndex])}
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        border: '1px solid rgba(46,204,113,0.3)',
                                        background: 'var(--panel-bg)',
                                        color: '#2ecc71',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    title="Interested / Send Inquiry"
                                >
                                    ❤️
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="system-welcome-card anim-fade-in" style={{ textAlign: 'center', padding: '30px', maxWidth: '400px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🛍️</div>
                            <h3>No More Listings</h3>
                            <p style={{ color: 'var(--text-secondary)', margin: '10px 0 20px', fontSize: '0.9rem' }}>
                                You have swiped through all local Buy & Sell posts.
                            </p>
                            <button
                                type="button"
                                className="btn-onboarding-next"
                                style={{ padding: '10px 20px', fontSize: '0.85rem' }}
                                onClick={() => setSwiperIndex(0)}
                            >
                                Start Over
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="app-feed-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', boxSizing: 'border-box' }}>
                    <div ref={feedStartRef} style={{ height: 0, margin: 0, padding: 0 }} />
                    {/* Active Proximity Radar Stats Bar */}
                    <div className="proximity-radar-stats" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        padding: '14px 8px',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        marginBottom: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '1.25rem' }}>👥</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Neighbors</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-primary)' }}>{activeNeighborsCount} online</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px', borderLeft: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>
                            <span style={{ fontSize: '1.25rem' }}>🚨</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alerts</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: posts.filter(p => p.is_alert).length > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                                {posts.filter(p => p.is_alert).length} active
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '1.25rem' }}>⚡</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Flash Meets</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#ff9f43' }}>
                                Live map
                            </span>
                        </div>
                    </div>

                    {activeCategory === 'offers' && (
                        <button
                            onClick={() => setShowCreateOffer(true)}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, var(--accent-red) 0%, #B2443E 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '16px',
                                padding: '14px',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 8px 24px rgba(210, 85, 78, 0.25)',
                                marginBottom: '1rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                        >
                            <span>📢</span> Post a Special Offer / Advertisement
                        </button>
                    )}

                    {activeCategory === 'offers' ? (
                        loadingOffers ? (
                            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                                <div className="pulse-circle">
                                    <div className="spinner"></div>
                                </div>
                            </div>
                        ) : offers.length === 0 ? (
                            <div style={{
                                padding: '3rem 2rem',
                                textAlign: 'center',
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '16px',
                                color: 'var(--text-secondary)',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}>
                                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🛍️</span>
                                No special offers posted in your area yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                                {offers.map(offer => (
                                    <ShopOfferCard
                                        key={offer.id}
                                        offer={offer}
                                        session={session}
                                        onUserClick={onUserClick}
                                        onRedeemSuccess={() => {
                                            fetchOffers();
                                            const event = new CustomEvent('karma-points-updated');
                                            window.dispatchEvent(event);
                                        }}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        filteredPosts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                posts={posts}
                                isMine={post.user_id === session?.user?.id && !post.is_ai}
                                onUserClick={onUserClick}
                                onReply={handleReply}
                                onAIReply={handleAIReply}
                                isHelpful={!!helpfulPosts[post.id]}
                                onHelpfulToggle={handleHelpfulToggle}
                                session={session}
                            />
                        ))
                    )}
                    <div ref={feedEndRef} />
                </div>
            )}

            {/* Floating New Message Notification */}
            {showScrollDown && (
                <button 
                    onClick={() => scrollToTop('smooth')}
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
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 100,
                        transition: 'all 0.3s'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/>
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

            {/* Create Shop Offer Modal */}
            {showCreateOffer && (
                <div className="modal-overlay" style={{ zIndex: 4000, display: 'block', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '20px 10px' }} onClick={() => setShowCreateOffer(false)}>
                    <div className="onboarding-card-premium anim-fade-in" style={{ maxWidth: '480px', width: '90%', margin: '20px auto 40px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="onboarding-title" style={{ fontSize: '1.5rem', margin: 0 }}>Create Special Offer</h2>
                            <button onClick={() => setShowCreateOffer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </header>
                        
                        <form onSubmit={handleCreateOffer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Offer Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 20% off on all bakery items!"
                                    value={offerTitle}
                                    onChange={e => setOfferTitle(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        padding: '12px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Description</label>
                                <textarea
                                    placeholder="Describe the offer, access rules, or requirements..."
                                    value={offerDesc}
                                    onChange={e => setOfferDesc(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        padding: '12px',
                                        outline: 'none',
                                        resize: 'none'
                                    }}
                                />
                            </div>
                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Points Required</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 10"
                                    value={offerPoints}
                                    onChange={e => setOfferPoints(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        padding: '12px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>INR Value per Point (e.g. 1 pt = ? INR discount)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="e.g. 2.5"
                                    value={offerInrPerPoint}
                                    onChange={e => setOfferInrPerPoint(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        padding: '12px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Free Access / Other Benefit (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Free entry for 1 person"
                                    value={offerFreeAccess}
                                    onChange={e => setOfferFreeAccess(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        padding: '12px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={postingOffer}
                                style={{
                                    background: 'var(--accent-red)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    marginTop: '10px',
                                    transition: 'all 0.2s',
                                    opacity: postingOffer ? 0.6 : 1
                                }}
                            >
                                {postingOffer ? 'Creating Advertisement...' : 'Create Advertisement'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function ShopOfferCard({ offer, session, onUserClick, onRedeemSuccess }) {
    const [redeeming, setRedeeming] = useState(false);
    const [redeemedCode, setRedeemedCode] = useState(null);
    const isMine = offer.user_id === session?.user?.id;

    const handleRedeem = async () => {
        if (!session?.user?.id) {
            alert("Please sign in to redeem offers!");
            return;
        }
        if (confirm(`Redeem this offer for ${offer.points_required} points?`)) {
            setRedeeming(true);
            try {
                const { data, error } = await supabase.rpc('redeem_shop_offer', {
                    p_offer_id: offer.id
                });
                if (error) throw error;
                if (data?.success) {
                    setRedeemedCode(data.code);
                    onRedeemSuccess();
                } else {
                    alert(data?.message || "Failed to redeem offer.");
                }
            } catch (err) {
                console.error("Redemption error:", err);
                alert("Redemption failed: " + err.message);
            } finally {
                setRedeeming(false);
            }
        }
    };

    const handleDeleteOffer = async (e) => {
        e.stopPropagation();
        if (confirm("Delete this advertisement?")) {
            const { error } = await supabase.from('shop_offers').delete().eq('id', offer.id);
            if (error) alert("Failed to delete offer: " + error.message);
            else onRedeemSuccess();
        }
    };

    return (
        <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="user-avatar-btn mini" style={{ width: '30px', height: '30px', borderRadius: '10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
                        {offer.profiles?.avatar_url ? (
                            <img src={offer.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            (offer.profiles?.full_name || 'Shop')[0].toUpperCase()
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span 
                            style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-red)', cursor: 'pointer' }}
                            onClick={() => onUserClick?.(offer.user_id)}
                        >
                            {offer.profiles?.full_name || 'Local Shop'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            {new Date(offer.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                {isMine && (
                    <button
                        onClick={handleDeleteOffer}
                        style={{
                            background: 'rgba(210, 85, 78, 0.1)',
                            border: '1px solid rgba(210, 85, 78, 0.3)',
                            borderRadius: '8px',
                            color: 'var(--accent-red)',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        🗑️
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>{offer.title}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{offer.description}</p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                <span style={{
                    background: 'rgba(46, 204, 113, 0.1)',
                    border: '1px solid rgba(46, 204, 113, 0.3)',
                    borderRadius: '12px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    color: '#2ecc71',
                    fontWeight: 'bold'
                }}>
                    🏷️ 1 Point = ₹{offer.inr_value_per_point || '1'} INR
                </span>
                {offer.free_access_desc && (
                    <span style={{
                        background: 'rgba(155, 89, 182, 0.1)',
                        border: '1px solid rgba(155, 89, 182, 0.3)',
                        borderRadius: '12px',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        color: '#9b59b6',
                        fontWeight: 'bold'
                    }}>
                        🎁 Free Access: {offer.free_access_desc}
                    </span>
                )}
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginTop: '8px',
                paddingTop: '12px',
                borderTop: '1px solid var(--glass-border)'
            }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Cost: <strong style={{ color: 'white' }}>{offer.points_required}</strong> Karma Points
                </span>

                {redeemedCode ? (
                    <div style={{
                        background: 'rgba(46, 204, 113, 0.15)',
                        border: '1px solid #2ecc71',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        color: '#2ecc71',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        textAlign: 'center'
                    }}>
                        Coupon: {redeemedCode}
                    </div>
                ) : isMine ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Your Advertisement</span>
                ) : (
                    <button
                        onClick={handleRedeem}
                        disabled={redeeming}
                        style={{
                            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 16px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(46,204,113,0.2)',
                            transition: 'all 0.2s',
                            opacity: redeeming ? 0.6 : 1
                        }}
                    >
                        {redeeming ? 'Redeeming...' : 'Redeem Offer'}
                    </button>
                )}
            </div>
        </div>
    );
}
