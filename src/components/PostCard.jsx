import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function PostCard({ post, isMine, onUserClick, onReply, onAIReply, posts, isHelpful, onHelpfulToggle, session, onTransferPoints }) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [translatedText, setTranslatedText] = useState(null);
    const [translating, setTranslating] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const menuRef = useRef(null);
    const [localVotes, setLocalVotes] = useState(post?.poll_votes || {});
    const [listingStatus, setListingStatus] = useState(post?.listing_status || 'available');
    const [inlineWarning, setInlineWarning] = useState(null);
    const warningTimeoutRef = useRef(null);

    const isBounty = post?.content && (
        post.content.toLowerCase().includes('#bounty') ||
        post.content.toLowerCase().includes('bounty:') ||
        /\b(bounty|reward|karma bounty|karma reward|help bounty)\b/.test(post.content.toLowerCase())
    );

    const getBountyAmount = () => {
        if (!post?.content) return null;
        const matches = post.content.match(/(?:bounty|reward|karma)\s*[:#]?\s*(\d+)/i) || post.content.match(/(\d+)\s*(?:karma|pts|points)/i);
        return matches ? parseInt(matches[1], 10) : null;
    };
    const bountyAmount = getBountyAmount();



    const showWarning = (msg) => {
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        setInlineWarning(msg);
        warningTimeoutRef.current = setTimeout(() => {
            setInlineWarning(null);
        }, 4000);
    };

    useEffect(() => {
        return () => {
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (post?.listing_status) {
            setListingStatus(post.listing_status);
        }
    }, [post?.listing_status]);

    const isAudioNote = post?.content && post.content.startsWith('[Audio Note:');
    
    const getAudioSource = () => {
        if (!post?.content) return null;
        const matches = post.content.match(/\[Audio Note:\s*([^\]]+)\]/);
        return matches ? matches[1] : null;
    };
    const audioSrc = isAudioNote ? getAudioSource() : null;

    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        if (!audioSrc) return;
        audioRef.current = new Audio(audioSrc);
        const audio = audioRef.current;

        const onLoadedMetadata = () => setDuration(audio.duration || 0);
        const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);

        // Preload metadata
        audio.load();

        return () => {
            if (audio) {
                audio.removeEventListener('loadedmetadata', onLoadedMetadata);
                audio.removeEventListener('timeupdate', onTimeUpdate);
                audio.removeEventListener('ended', onEnded);
                audio.pause();
            }
        };
    }, [audioSrc]);

    const togglePlayPause = (e) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(err => console.error("Error playing audio:", err));
            setIsPlaying(true);
        }
    };

    const handleSeek = (e) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        const seekTime = parseFloat(e.target.value);
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const formatAudioTime = (secs) => {
        if (isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleUpdateStatus = async (newStatus) => {
        setListingStatus(newStatus);
        try {
            const { error } = await supabase
                .from('posts')
                .update({ listing_status: newStatus })
                .eq('id', post.id);
            if (error) throw error;
        } catch (err) {
            console.error("Failed to update status:", err);
            setListingStatus(post?.listing_status || 'available');
            showWarning("Failed to update status. Please try again.");
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

    useEffect(() => {
        setLocalVotes(post?.poll_votes || {});
    }, [post?.poll_votes]);

    const handleVote = async (optionIdx) => {
        const currentUserId = session?.user?.id;
        if (!currentUserId) {
            showWarning("Please sign in to vote in polls.");
            return;
        }
        
        // Optimistic Update
        const updatedVotes = { ...localVotes, [currentUserId]: optionIdx };
        setLocalVotes(updatedVotes);
        
        // Call Supabase RPC
        const { error } = await supabase.rpc('cast_poll_vote', {
            p_post_id: post.id,
            p_option_index: optionIdx
        });
        
        if (error) {
            console.error("Failed to cast vote:", error);
            // Rollback on error
            setLocalVotes(post.poll_votes || {});
            showWarning("Failed to record vote. Please try again.");
        }
    };

    const handleSpeak = (e) => {
        e.stopPropagation();
        if ('speechSynthesis' in window) {
            if (isSpeaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
            } else {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(post.content || '');
                utterance.onend = () => setIsSpeaking(false);
                utterance.onerror = () => setIsSpeaking(false);
                setIsSpeaking(true);
                window.speechSynthesis.speak(utterance);
            }
        } else {
            showWarning("Text-to-speech is not supported in this browser.");
        }
    };

    useEffect(() => {
        return () => {
            if (isSpeaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isSpeaking]);

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date()
        const posted = new Date(timestamp)
        const diffMs = now - posted
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m`
        if (diffHours < 24) return `${diffHours}h`
        return new Date(timestamp).toLocaleDateString()
    }

    // Strip legacy " (AI)" suffix that was previously stored in the DB
    const rawAiName = (post?.ai_name || 'Neighbor').replace(/\s*\(AI\)\s*$/i, '').trim();
    const name = post?.is_ai
        ? rawAiName
        : (post?.full_name || post?.user_email?.split('@')[0] || 'Anonymous');
    const displayName = post?.is_ai ? name : (isMine ? 'You' : name);
    const initial = (name || '?')[0].toUpperCase();

    // Find the original post being replied to
    const repliedToPost = post?.reply_to_id && posts ? posts.find(p => p.id === post.reply_to_id) : null;
    const repliedToName = post?.reply_to_author || (repliedToPost?.is_ai ? repliedToPost?.ai_name : (repliedToPost?.full_name || repliedToPost?.user_email?.split('@')[0]));
    const repliedToContent = post?.reply_to_content || repliedToPost?.content;

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    // --- Single Click / Touch to open options menu ---
    const openMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setTranslatedText(null);
        let x = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
        let y = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
        
        // Fallback for accessibility or click events without coordinates
        if (!x && !y && e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }

        // Make sure the menu stays on screen
        const safeX = Math.min(x, window.innerWidth - 200);
        const safeY = Math.min(y, window.innerHeight - 160);
        setMenuPos({ x: safeX, y: safeY });
        setShowMenu(true);
    };

    // --- Translate ---
    const handleTranslate = async () => {
        if (translatedText) { setTranslatedText(null); setShowMenu(false); return; }
        setTranslating(true);
        setShowMenu(false);
        try {
            // Google Translate free endpoint (gtx) — auto-detects language, translates to English
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(post.content || '')}`);
            const data = await res.json();
            if (data && data[0]) {
                const translated = data[0].map(x => x[0]).join('');
                setTranslatedText(translated || '[Translation unavailable]');
            } else {
                setTranslatedText('[Translation unavailable]');
            }
        } catch (e) {
            console.error('Translation error:', e);
            setTranslatedText('[Translation failed — please try again]');
        }
        setTranslating(false);
    };

    // --- AI Generate Reply ---
    const handleAIReply = async () => {
        setShowMenu(false);
        setAiGenerating(true);
        try {
            const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
            const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
            const aiPrompt = `Generate a short, casual, friendly reply to this message as if you were a local neighbor. Only output the reply text, no explanation or formatting:\n"${post.content || ''}"`;

            let suggestion = '';
            if (openRouterKey) {
                try {
                    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                            messages: [{ role: "user", content: aiPrompt }]
                        })
                    });
                    const data = await res.json();
                    const rawText = data.choices?.[0]?.message?.content || '';
                    if (rawText.toLowerCase().includes("user safety:") || 
                        rawText.toLowerCase().includes("response safety:") || 
                        rawText.trim().toLowerCase() === "safe") {
                        throw new Error("OpenRouter safety moderation check triggered");
                    }
                    suggestion = rawText;
                } catch (openErr) {
                    console.error("OpenRouter failed in PostCard, trying fallback:", openErr);
                    suggestion = '';
                }
            }

            if (!suggestion.trim() && geminiKey) {
                try {
                    const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] })
                    });
                    const gData = await gRes.json();
                    suggestion = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } catch (geminiErr) {
                    console.error("Gemini failed in PostCard:", geminiErr);
                }
            }

            if (suggestion.trim()) {
                onAIReply?.(post, suggestion.trim());
            } else {
                showWarning('Could not generate a reply right now. Please try again.');
            }
        } catch (e) {
            console.error('AI reply generation failed', e);
            showWarning('Could not generate reply. Check your API keys.');
        }
        setAiGenerating(false);
    };

    // --- Start a Reply ---
    const handleReply = () => {
        setShowMenu(false);
        onReply?.(post);
    };

    return (
        <>
            {/* Context Menu */}
            {showMenu && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        left: menuPos.x,
                        top: menuPos.y,
                        zIndex: 9999,
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                        minWidth: '180px',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    <button onClick={handleReply} style={menuBtnStyle}>
                        <span>↩️</span> Reply
                    </button>
                    {post.content && post.content.trim() && (
                        <>
                            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 12px' }} />
                            <button onClick={handleTranslate} style={menuBtnStyle}>
                                <span>🌐</span> Translate
                            </button>
                            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 12px' }} />
                            <button onClick={handleAIReply} style={{ ...menuBtnStyle, color: 'var(--accent-red)' }}>
                                <span>✨</span> Generate AI Reply
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* The Message Card */}
            <div
                className={`message-card premium-shadow anim-fade-in ${isMine ? 'mine' : ''}`}
                style={{
                    background: post?.is_alert 
                        ? 'linear-gradient(135deg, rgba(210, 85, 78, 0.15) 0%, rgba(210, 85, 78, 0.05) 100%)'
                        : (isMine ? 'linear-gradient(135deg, var(--accent-red) 0%, #B2443E 100%)' : 'var(--chat-bg)'),
                    color: (isMine && !post?.is_alert) ? 'white' : 'var(--text-primary)',
                    padding: '1rem 1.25rem',
                    borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    border: post?.is_alert ? '2px solid var(--accent-red)' : (isMine ? 'none' : '1px solid var(--glass-border)'),
                    animation: post?.is_alert ? 'alert-glow 1.5s infinite alternate' : 'none',
                    maxWidth: '85%',
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    boxShadow: post?.is_alert ? '0 10px 30px rgba(210, 85, 78, 0.25)' : '0 10px 30px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    position: 'relative',
                    userSelect: 'none'
                }}
                onClick={openMenu}
                onContextMenu={openMenu}
            >
                {/* Alert Header Banner */}
                {post?.is_alert && (
                    <div style={{
                        background: 'var(--accent-red)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '900',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <span>🚨</span> Urgent Broadcast Alert
                    </div>
                )}
                {/* Inline Warning Notification */}
                {inlineWarning && (
                    <div style={{
                        background: 'rgba(210, 85, 78, 0.95)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        marginBottom: '8px',
                        textAlign: 'center',
                        border: '1px solid rgba(210, 85, 78, 0.3)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        animation: 'anim-fade-in 0.2s ease-in-out'
                    }}>
                        ⚠️ {inlineWarning}
                    </div>
                )}
                {isBounty && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(241, 196, 15, 0.2) 0%, rgba(243, 156, 18, 0.05) 100%)',
                        color: '#f1c40f',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(241, 196, 15, 0.3)',
                        boxShadow: '0 4px 12px rgba(241, 196, 15, 0.08)',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💰</span> Active Bounty
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {bountyAmount && (
                                <span style={{ background: '#f1c40f', color: 'black', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
                                    {bountyAmount} Karma
                                </span>
                            )}
                            {isMine && onTransferPoints && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTransferPoints('', bountyAmount || '');
                                    }}
                                    style={{
                                        background: 'white',
                                        color: 'black',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        fontSize: '0.7rem',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    Reward Neighbor
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {/* Header */}
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '0.6rem', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                        <div
                            className="user-avatar-btn mini"
                            style={{
                                width: '30px', height: '30px', borderRadius: '10px', fontSize: '0.75rem', flexShrink: 0,
                                border: isMine ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--glass-border)',
                                background: isMine ? 'rgba(255,255,255,0.1)' : 'var(--panel-bg)'
                            }}
                            onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user_id, post.is_ai, post.ai_name); }}
                        >
                            {post?.is_ai ? (
                                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${post.ai_name || 'AI'}&backgroundColor=b6e3f4`} alt="" />
                            ) : post?.avatar_url ? (
                                <img src={post.avatar_url} alt="" />
                            ) : initial}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                            <span
                                style={{ fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', color: isMine ? 'white' : 'var(--accent-red)' }}
                                onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user_id, post.is_ai, post.ai_name); }}
                            >
                                {displayName}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: isMine ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }}>
                                {formatTimeAgo(post?.created_at)}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {post.content && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleTranslate(); }}
                                title="Translate post"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.6,
                                    transition: 'opacity 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                            >
                                🌐
                            </button>
                        )}
                        {!post.image_url && post.content && (
                            <button 
                                type="button"
                                onClick={handleSpeak}
                                title={isSpeaking ? "Stop listening" : "Listen to post"}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.6,
                                    transition: 'opacity 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                            >
                                {isSpeaking ? '🔇' : '🔊'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Buy/Sell Listing Status */}
                {getPostCategory(post.content) === 'buysell' && (
                    <div style={{ 
                        marginBottom: '10px', 
                        display: 'flex', 
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                        marginTop: '4px'
                    }}>
                        {isMine ? (
                            <select
                                value={listingStatus}
                                onChange={(e) => handleUpdateStatus(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: listingStatus === 'available' ? '#2ecc71' : listingStatus === 'pending' ? '#e67e22' : '#95a5a6',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <option value="available" style={{ background: '#1c1c1e', color: '#2ecc71' }}>🟢 Available</option>
                                <option value="pending" style={{ background: '#1c1c1e', color: '#e67e22' }}>🟡 Pending</option>
                                <option value="sold" style={{ background: '#1c1c1e', color: '#95a5a6' }}>⚫ Sold</option>
                            </select>
                        ) : (
                            <span style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                color: listingStatus === 'available' ? '#2ecc71' : listingStatus === 'pending' ? '#e67e22' : '#95a5a6',
                                border: `1px solid ${listingStatus === 'available' ? 'rgba(46, 204, 113, 0.25)' : listingStatus === 'pending' ? 'rgba(230, 126, 34, 0.25)' : 'rgba(149, 165, 166, 0.25)'}`,
                                borderRadius: '12px',
                                padding: '3px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                            }}>
                                {listingStatus === 'available' ? '🟢 Available' : listingStatus === 'pending' ? '🟡 Pending' : '⚫ Sold'}
                            </span>
                        )}
                    </div>
                )}

                {/* Quoted Reply Preview */}
                {repliedToContent && (
                    <div style={{
                        background: isMine ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.06)',
                        borderLeft: `3px solid ${isMine ? 'rgba(255,255,255,0.6)' : 'var(--accent-red)'}`,
                        borderRadius: '8px',
                        padding: '6px 10px',
                        marginBottom: '8px',
                        fontSize: '0.78rem',
                        opacity: 0.9
                    }}>
                        <div style={{ fontWeight: '700', marginBottom: '2px', color: isMine ? 'rgba(255,255,255,0.85)' : 'var(--accent-red)', fontSize: '0.72rem' }}>
                            ↩ {repliedToName || 'Someone'}
                        </div>
                        <div style={{ color: isMine ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'min(280px, 60vw)' }}>
                            {repliedToContent}
                        </div>
                    </div>
                )}

                {/* Message Content */}
                <div style={{
                    fontSize: '0.97rem', lineHeight: '1.6', fontWeight: '400',
                    wordBreak: 'break-word', color: isMine ? 'rgba(255,255,255,0.95)' : 'var(--text-primary)',
                    width: '100%'
                }}>
                    {isAudioNote && audioSrc ? (
                        <div className="audio-player-container" style={{
                            background: isMine ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '4px',
                            marginBottom: '4px',
                            width: '100%',
                            maxWidth: '300px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                        }} onClick={e => e.stopPropagation()}>
                            {/* Play/Pause Button */}
                            <button
                                type="button"
                                onClick={togglePlayPause}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: isMine ? 'white' : 'var(--accent-red)',
                                    color: isMine ? 'black' : 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {isPlaying ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="4" height="16" /><rect x="16" y="4" width="4" height="16" /></svg>
                                ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}><polygon points="5,3 19,12 5,21" /></svg>
                                )}
                            </button>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                {/* Seek slider */}
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    style={{
                                        width: '100%',
                                        accentColor: isMine ? 'white' : 'var(--accent-red)',
                                        height: '4px',
                                        borderRadius: '2px',
                                        cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.2)',
                                        margin: 0
                                    }}
                                />
                                {/* Time details */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                                    <span>{formatAudioTime(currentTime)}</span>
                                    <span>{formatAudioTime(duration)}</span>
                                </div>
                            </div>

                            {/* Bouncing visualizer bars */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px', width: '20px', flexShrink: 0 }}>
                                {[1, 2, 3, 4].map(bar => (
                                    <div key={bar} style={{
                                        width: '2px',
                                        background: isMine ? 'white' : 'var(--accent-red)',
                                        borderRadius: '1px',
                                        height: isPlaying ? '100%' : '20%',
                                        animation: isPlaying ? `bouncing-bar 0.6s ease-in-out infinite alternate` : 'none',
                                        animationDelay: `${bar * 0.1}s`,
                                        transition: 'height 0.2s'
                                    }} />
                                ))}
                            </div>
                        </div>
                    ) : translating ? (
                        <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Translating...</span>
                    ) : translatedText ? (
                        <>
                            <div style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '4px', fontStyle: 'italic' }}>{post.content}</div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '4px' }}>🌐 {translatedText}</div>
                        </>
                    ) : (
                        post?.content?.split(/(\s+)/).map((part, i) => {
                            if (part.match(/^https?:\/\//)) {
                                return (
                                    <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        style={{ color: isMine ? 'white' : 'var(--accent-red)', textDecoration: 'underline', fontWeight: '600' }}>
                                        {part}
                                    </a>
                                );
                            }
                            return part;
                        })
                    )}
                </div>

                {/* Image Attachment */}
                {post?.image_url && (
                    <div style={{
                        marginTop: '10px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        maxHeight: '240px',
                        border: isMine ? 'none' : '1px solid var(--glass-border)'
                    }}>
                        <img 
                            src={post.image_url} 
                            alt="Attachment" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                        />
                    </div>
                )}

                {/* Neighbor Poll */}
                {Array.isArray(post?.poll_options) && post.poll_options.length > 0 && (() => {
                    const currentUserId = session?.user?.id;
                    const userVote = localVotes && currentUserId ? localVotes[currentUserId] : undefined;
                    const hasVoted = userVote !== undefined;
                    const totalVotes = localVotes ? Object.keys(localVotes).length : 0;

                    return (
                        <div 
                            className="poll-card-container" 
                            style={{
                                marginTop: '12px',
                                padding: '12px 14px',
                                background: 'rgba(0,0,0,0.15)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }} 
                            onClick={(e) => e.stopPropagation()}
                        >
                            {post.poll_options.map((option, idx) => {
                                const optionVoteCount = localVotes ? Object.values(localVotes).filter(v => v === idx).length : 0;
                                const percentage = totalVotes > 0 ? Math.round((optionVoteCount / totalVotes) * 100) : 0;

                                if (hasVoted) {
                                    const isUserChoice = userVote === idx;
                                    return (
                                        <div 
                                            key={idx} 
                                            style={{
                                                position: 'relative',
                                                background: 'var(--glass-bg)',
                                                border: `1px solid ${isUserChoice ? 'var(--accent-red)' : 'var(--glass-border)'}`,
                                                borderRadius: '12px',
                                                padding: '10px 14px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '0.88rem',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            {/* Animated Progress Bar */}
                                            <div style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: `${percentage}%`,
                                                background: isUserChoice ? 'rgba(210, 85, 78, 0.2)' : 'rgba(255,255,255,0.06)',
                                                zIndex: 0,
                                                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }} />
                                            
                                            <span style={{ zIndex: 1, fontWeight: isUserChoice ? '800' : '400', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {option} {isUserChoice && <span style={{ fontSize: '0.8rem', color: 'var(--accent-red)' }}>✓</span>}
                                            </span>
                                            <span style={{ zIndex: 1, fontWeight: '800', opacity: 0.8 }}>
                                                {percentage}% ({optionVoteCount})
                                            </span>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleVote(idx)}
                                            style={{
                                                background: 'var(--glass-bg)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                padding: '10px 14px',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.88rem',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                width: '100%',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                outline: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                                e.currentTarget.style.borderColor = 'var(--text-secondary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'var(--glass-bg)';
                                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                            }}
                                        >
                                            <span>{option}</span>
                                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>◯</span>
                                        </button>
                                    );
                                }
                            })}
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '2px', fontWeight: '700' }}>
                                {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                            </div>
                        </div>
                    );
                })()}

                {/* AI generating indicator */}
                {aiGenerating && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic' }}>
                        ✨ Generating reply...
                    </div>
                )}

                {/* Footer Helpfulness Action */}
                {!post.is_ai && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: (isMine && !post?.is_alert) ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--glass-border)',
                        fontSize: '0.72rem',
                        opacity: 0.8
                    }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isMine) {
                                    showWarning("You cannot upvote your own post.");
                                    return;
                                }
                                onHelpfulToggle?.(post.id, post.user_id);
                            }}
                            style={{
                                background: isHelpful ? 'rgba(210,85,78,0.15)' : 'transparent',
                                border: 'none',
                                color: isMine ? 'rgba(255,255,255,0.5)' : (isHelpful ? 'var(--accent-red)' : 'var(--text-secondary)'),
                                cursor: isMine ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                fontWeight: '700',
                            }}
                        >
                            <span>🙌</span> Helpful
                        </button>
                        <span style={{ color: (isMine && !post?.is_alert) ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', fontWeight: '800' }}>
                            {post.helpful_count || 0} helpful
                        </span>
                    </div>
                )}
            </div>
        </>
    );
}

const menuBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    textAlign: 'left',
    transition: 'background 0.2s',
};
