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
        <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div className="onboarding-card" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem', maxWidth: '600px' }}>
                <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
                    <h2 className="modal-title" style={{ color: 'white' }}>New Message</h2>
                    <button className="icon-btn" onClick={onClose} style={{ color: '#666' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="post-form">
                    <textarea
                        className="post-textarea"
                        placeholder="What's happening in your circle?"
                        style={{ background: '#111', border: '1px solid #333', color: 'white', fontSize: '1.1rem' }}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={500}
                        rows={6}
                        autoFocus
                    />
                    <div className="post-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <div className="post-tools" style={{ display: 'flex', gap: '15px' }}>
                            <button
                                type="button"
                                className="tool-btn"
                                onClick={() => {
                                    const mapsUrl = `https://www.google.com/maps?q=${position[0]},${position[1]}`;
                                    setContent(prev => prev + (prev ? ' ' : '') + mapsUrl);
                                }}
                                title="Share Current Location"
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <MapPin size={20} />
                                <span style={{ fontSize: '0.8rem' }}>Location</span>
                            </button>
                            <button
                                type="button"
                                className="tool-btn"
                                onClick={() => {
                                    const url = prompt('Enter a link to share:');
                                    if (url) {
                                        const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
                                        setContent(prev => prev + (prev ? ' ' : '') + formattedUrl);
                                    }
                                }}
                                title="Share Link"
                                style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <LinkIcon size={20} />
                                <span style={{ fontSize: '0.8rem' }}>Link</span>
                            </button>
                        </div>
                        <span className="char-count" style={{ color: '#444' }}>{content.length}/500</span>
                    </div>

                    {error && (
                        <div className="error-message" style={{ background: '#311', color: '#f55', marginTop: '1rem' }}>{error}</div>
                    )}

                    <div className="modal-actions" style={{ marginTop: '2rem' }}>
                        <button type="button" className="btn-secondary" style={{ background: 'transparent', border: '1px solid #333' }} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="auth-btn-primary"
                            disabled={loading || !content.trim()}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {loading ? 'Sending...' : <><Send size={18} /> Send to Circle</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
