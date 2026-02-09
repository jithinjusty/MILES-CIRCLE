export default function PostCard({ post, isMine }) {
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

    const name = post?.full_name || post?.user_email?.split('@')[0] || 'Anonymous';
    const avatar = (post?.full_name || post?.user_email || '?')[0].toUpperCase();

    return (
        <div className={`message-card ${isMine ? 'mine' : ''}`}>
            {!isMine && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div className="user-avatar-btn" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                        {avatar}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-red)' }}>
                        {name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#999' }}>
                        {formatTimeAgo(post?.created_at)}
                    </span>
                </div>
            )}

            <div className="message-text" style={{ color: 'white', fontSize: '0.95rem', lineHeight: '1.4' }}>
                {post?.content || ''}
            </div>

            {isMine && (
                <div style={{ textAlign: 'right', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#999' }}>
                        {formatTimeAgo(post?.created_at)}
                    </span>
                </div>
            )}
        </div>
    )
}
