import { useState, useRef, useEffect } from 'react';

export default function PostCard({ post, isMine, onUserClick, onReply, onAIReply, posts }) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [translatedText, setTranslatedText] = useState(null);
    const [translating, setTranslating] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const longPressTimer = useRef(null);
    const menuRef = useRef(null);

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

    // --- Long Press / Right-Click to open menu ---
    const openMenu = (e) => {
        e.preventDefault();
        setTranslatedText(null);
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        // Make sure the menu stays on screen
        const safeX = Math.min(x, window.innerWidth - 200);
        const safeY = Math.min(y, window.innerHeight - 160);
        setMenuPos({ x: safeX, y: safeY });
        setShowMenu(true);
    };

    const handleTouchStart = (e) => {
        longPressTimer.current = setTimeout(() => {
            openMenu(e);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    // --- Translate ---
    const handleTranslate = async () => {
        if (translatedText) { setTranslatedText(null); setShowMenu(false); return; }
        setTranslating(true);
        setShowMenu(false);
        try {
            // MyMemory free translation API — no key required, auto-detects language
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(post.content)}&langpair=auto|en`);
            const data = await res.json();
            const translated = data?.responseData?.translatedText;
            setTranslatedText(translated || '[Translation unavailable]');
        } catch (e) {
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
            const aiPrompt = `Generate a short, casual, friendly reply to this message as if you were a local neighbor. Only output the reply text, no explanation or formatting:\n"${post.content}"`;

            let suggestion = '';
            if (openRouterKey) {
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                        "HTTP-Referer": "https://milescircle.app",
                        "X-Title": "Miles Circle",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "openrouter/free",
                        messages: [{ role: "user", content: aiPrompt }]
                    })
                });
                const data = await res.json();
                suggestion = data.choices?.[0]?.message?.content || '';
            } else if (geminiKey) {
                const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] })
                });
                const gData = await gRes.json();
                suggestion = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }

            if (suggestion.trim()) {
                onAIReply?.(post, suggestion.trim());
            } else {
                alert('Could not generate a reply right now. Please try again.');
            }
        } catch (e) {
            console.error('AI reply generation failed', e);
            alert('Could not generate reply. Check your API keys.');
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
                    <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 12px' }} />
                    <button onClick={handleTranslate} style={menuBtnStyle}>
                        <span>🌐</span> Translate
                    </button>
                    <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 12px' }} />
                    <button onClick={handleAIReply} style={{ ...menuBtnStyle, color: 'var(--accent-red)' }}>
                        <span>✨</span> Generate AI Reply
                    </button>
                </div>
            )}

            {/* The Message Card */}
            <div
                className={`message-card premium-shadow anim-fade-in ${isMine ? 'mine' : ''}`}
                style={{
                    background: isMine ? 'linear-gradient(135deg, var(--accent-red) 0%, #B2443E 100%)' : 'var(--chat-bg)',
                    color: isMine ? 'white' : 'var(--text-primary)',
                    padding: '1rem 1.25rem',
                    borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    border: isMine ? 'none' : '1px solid var(--glass-border)',
                    maxWidth: '85%',
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    position: 'relative',
                    userSelect: 'none'
                }}
                onContextMenu={openMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
            >
                {/* Header */}
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.6rem', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                    <div
                        className="user-avatar-btn mini"
                        style={{
                            width: '30px', height: '30px', borderRadius: '10px', fontSize: '0.75rem', flexShrink: 0,
                            border: isMine ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--glass-border)',
                            background: isMine ? 'rgba(255,255,255,0.1)' : 'var(--panel-bg)'
                        }}
                        onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user_id); }}
                    >
                        {post?.avatar_url ? <img src={post.avatar_url} alt="" /> : initial}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                        <span
                            style={{ fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', color: isMine ? 'white' : 'var(--accent-red)' }}
                            onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user_id); }}
                        >
                            {displayName}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: isMine ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }}>
                            {formatTimeAgo(post?.created_at)}
                        </span>
                    </div>
                </div>

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
                        <div style={{ color: isMine ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                            {repliedToContent}
                        </div>
                    </div>
                )}

                {/* Message Content */}
                <div style={{
                    fontSize: '0.97rem', lineHeight: '1.6', fontWeight: '400',
                    wordBreak: 'break-word', color: isMine ? 'rgba(255,255,255,0.95)' : 'var(--text-primary)'
                }}>
                    {translating ? (
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
                                        style={{ color: isMine ? 'white' : 'var(--accent-red)', textDecoration: 'underline', fontWeight: '600' }}>
                                        {part}
                                    </a>
                                );
                            }
                            return part;
                        })
                    )}
                </div>

                {/* AI generating indicator */}
                {aiGenerating && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic' }}>
                        ✨ Generating reply...
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
