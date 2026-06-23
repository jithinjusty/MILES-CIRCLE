import { useState } from 'react'
import { X, Send, MapPin, Link as LinkIcon, Paperclip } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function CreatePostModal({ position, radius, onClose, onPostCreated }) {
    const [content, setContent] = useState('')
    const [isAlert, setIsAlert] = useState(false)
    const [isPoll, setIsPoll] = useState(false)
    const [pollOptions, setPollOptions] = useState(['', ''])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showLinkInput, setShowLinkInput] = useState(false)
    const [linkText, setLinkText] = useState('')



    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        
        if (!content.trim()) {
            setError('Post content cannot be empty')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError('You must be logged in to post')
                setLoading(false)
                return
            }

            let finalPollOptions = null;
            let finalPollVotes = null;
            if (isPoll) {
                const validOptions = pollOptions.map(o => o.trim()).filter(Boolean);
                if (validOptions.length < 2) {
                    setError('Please provide at least 2 poll choices');
                    setLoading(false);
                    return;
                }
                const uniqueOptions = [...new Set(validOptions)];
                if (uniqueOptions.length !== validOptions.length) {
                    setError('Poll choices must be unique');
                    setLoading(false);
                    return;
                }
                finalPollOptions = validOptions;
                finalPollVotes = {};
            }

            const lat = position && position[0] !== undefined ? position[0] : 0;
            const lng = position && position[1] !== undefined ? position[1] : 0;
            const locationWKT = `POINT(${lng} ${lat})`

            const { error: insertError } = await supabase
                .from('posts')
                .insert([
                    {
                        user_id: user.id,
                        content: content.trim(),
                        location: locationWKT,
                        is_alert: isAlert,
                        poll_options: finalPollOptions,
                        poll_votes: finalPollVotes
                    }
                ])

            if (insertError) throw insertError

            setContent('')
            setIsAlert(false)
            setIsPoll(false)
            setPollOptions(['', ''])
            onPostCreated?.()
            onClose()
        } catch (err) {
            console.error('Post creation error:', err)
            setError(err.message || 'Failed to create post')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="onboarding-card-premium anim-fade-in" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem 1.5rem', width: '95%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
                <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="title-wrap">
                        <h2 className="onboarding-title" style={{ fontSize: '1.8rem', margin: 0 }}>New Post</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Share with your {radius}-mile circle</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} style={{ border: 'none', background: 'var(--glass-bg)', color: 'var(--text-secondary)', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="post-form">
                    <div className="input-block" style={{ position: 'relative', marginBottom: '1.5rem' }}>
                        <textarea
                            className="post-textarea"
                            placeholder="What's happening in your neighborhood?"
                            style={{
                                width: '100%',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '20px',
                                padding: '1.5rem',
                                color: 'var(--text-primary)',
                                fontSize: '1.1rem',
                                minHeight: '180px',
                                outline: 'none',
                                resize: 'none',
                                transition: '0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-red)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={500}
                            autoFocus
                        />
                        <div className="char-count" style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontSize: '0.75rem', fontWeight: '800', color: content.length > 450 ? 'var(--accent-red)' : 'var(--text-secondary)', opacity: 0.6 }}>
                            {content.length}/500
                        </div>
                    </div>

                    <div className="post-tools" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="nav-item"
                            onClick={() => {
                                if (position && position[0] !== undefined) {
                                    const mapsUrl = `https://www.google.com/maps?q=${position[0]},${position[1]}`;
                                    setContent(prev => prev + (prev ? ' ' : '') + mapsUrl);
                                } else {
                                    setError('Location is not available.');
                                }
                            }}
                            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            <MapPin size={18} color="var(--accent-red)" />
                            <span>My Location</span>
                        </button>
                        <button
                            type="button"
                            className="nav-item"
                            onClick={() => setShowLinkInput(!showLinkInput)}
                            style={{ background: showLinkInput ? 'rgba(210, 85, 78, 0.2)' : 'var(--glass-bg)', border: `1px solid ${showLinkInput ? 'var(--accent-red)' : 'var(--glass-border)'}`, borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            <LinkIcon size={18} />
                            <span>Add Link</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAlert(!isAlert)}
                            style={{
                                background: isAlert ? 'rgba(210, 85, 78, 0.2)' : 'var(--glass-bg)',
                                border: `1px solid ${isAlert ? 'var(--accent-red)' : 'var(--glass-border)'}`,
                                borderRadius: '12px',
                                padding: '12px 16px',
                                color: isAlert ? 'var(--accent-red)' : 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                                fontWeight: isAlert ? '800' : '400'
                            }}
                        >
                            <span>🚨</span>
                            <span>Broadcast Alert</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPoll(!isPoll)}
                            style={{
                                background: isPoll ? 'rgba(76, 175, 80, 0.2)' : 'var(--glass-bg)',
                                border: `1px solid ${isPoll ? '#4CAF50' : 'var(--glass-border)'}`,
                                borderRadius: '12px',
                                padding: '12px 16px',
                                color: isPoll ? '#4CAF50' : 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                                fontWeight: isPoll ? '800' : '400'
                            }}
                        >
                            <span>📊</span>
                            <span>Create Poll</span>
                        </button>
                    </div>

                    {showLinkInput && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Enter link (e.g. example.com)"
                                value={linkText}
                                onChange={e => setLinkText(e.target.value)}
                                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (linkText.trim()) {
                                            const formattedUrl = linkText.trim().startsWith('http') ? linkText.trim() : `https://${linkText.trim()}`;
                                            setContent(prev => prev + (prev ? ' ' : '') + formattedUrl);
                                            setLinkText('');
                                            setShowLinkInput(false);
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (linkText.trim()) {
                                        const formattedUrl = linkText.trim().startsWith('http') ? linkText.trim() : `https://${linkText.trim()}`;
                                        setContent(prev => prev + (prev ? ' ' : '') + formattedUrl);
                                        setLinkText('');
                                        setShowLinkInput(false);
                                    }
                                }}
                                style={{ background: 'var(--accent-red)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                Add
                            </button>
                        </div>
                    )}

                    {isPoll && (
                        <div className="poll-options-builder" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            background: 'rgba(0,0,0,0.15)',
                            padding: '1.25rem',
                            borderRadius: '16px',
                            border: '1px solid var(--glass-border)',
                            marginBottom: '1.5rem'
                        }}>
                            <h4 style={{ margin: '0 0 5px', fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)' }}>Poll Options</h4>
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder={`Choice ${idx + 1}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const updated = [...pollOptions];
                                            updated[idx] = e.target.value;
                                            setPollOptions(updated);
                                        }}
                                        maxLength={40}
                                        style={{
                                            flex: 1,
                                            background: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '10px',
                                            padding: '10px 14px',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    />
                                    {pollOptions.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--accent-red)',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                padding: '4px'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            {pollOptions.length < 4 && (
                                <button
                                    type="button"
                                    onClick={() => setPollOptions([...pollOptions, ''])}
                                    style={{
                                        alignSelf: 'flex-start',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: '800',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    ＋ Add Option
                                </button>
                            )}
                        </div>
                    )}



                    {error && (
                        <div className="error-message" style={{ background: 'rgba(210, 85, 78, 0.1)', color: 'var(--accent-red)', padding: '12px', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>
                    )}

                    <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            className="nav-item"
                            style={{ flex: 1, justifyContent: 'center', background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-onboarding-next"
                            disabled={loading || !content.trim()}
                            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        >
                            {loading ? 'Posting...' : <><Send size={18} /> Send Post</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
