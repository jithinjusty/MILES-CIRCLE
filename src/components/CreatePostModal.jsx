import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function CreatePostModal({ position, onClose, onPostCreated }) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
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

            // Format location as WKT (Well-Known Text) for PostGIS
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

            // Success!
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
            <div className="modal-card frosted-glass" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Create Post</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="post-form">
                    <textarea
                        className="post-textarea"
                        placeholder="What's happening in your circle? Ask a question, share info..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={500}
                        rows={5}
                        autoFocus
                    />
                    <div className="post-meta">
                        <span className="char-count">{content.length}/500</span>
                    </div>

                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !content.trim()}
                        >
                            {loading ? 'Posting...' : 'Post to Circle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
