import { useState } from 'react'
import { X, Send, MapPin, Link as LinkIcon, Paperclip } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function CreatePostModal({ position, onClose, onPostCreated }) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (!content.trim()) return

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError('You must be logged in to post')
                setLoading(false)
                return
            }

            const locationWKT = `POINT(${position[1]} ${position[0]})`

            const { error: insertError } = await supabase
                .from('posts')
                .insert([
                    {
                        user_id: user.id,
                        content: content.trim(),
                        location: locationWKT
                    }
                ])

            if (insertError) throw insertError

            setContent('')
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
            <div className="onboarding-card-premium anim-fade-in" onClick={(e) => e.stopPropagation()} style={{ padding: '3.5rem', maxWidth: '580px' }}>
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
                                color: 'white',
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

                    <div className="post-tools" style={{ display: 'flex', gap: '8px', marginBottom: '2.5rem' }}>
                        <button
                            type="button"
                            className="nav-item"
                            onClick={() => {
                                const mapsUrl = `https://www.google.com/maps?q=${position[0]},${position[1]}`;
                                setContent(prev => prev + (prev ? ' ' : '') + mapsUrl);
                            }}
                            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            <MapPin size={18} color="var(--accent-red)" />
                            <span>My Location</span>
                        </button>
                        <button
                            type="button"
                            className="nav-item"
                            onClick={() => {
                                const url = prompt('Enter a link to share:');
                                if (url) {
                                    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
                                    setContent(prev => prev + (prev ? ' ' : '') + formattedUrl);
                                }
                            }}
                            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            <LinkIcon size={18} />
                            <span>Add Link</span>
                        </button>
                    </div>

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
