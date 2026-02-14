export default function PostCard({ post, isMine, onUserClick }) {
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
    const initial = (post?.full_name || post?.user_email || '?')[0].toUpperCase();

    return (
        <div className={`message-card premium-shadow anim-fade-in ${isMine ? 'mine' : ''}`} style={{
            background: isMine ? 'linear-gradient(135deg, var(--accent-red) 0%, #B2443E 100%)' : 'var(--chat-bg)',
            color: isMine ? 'white' : 'var(--text-primary)',
            padding: '1.5rem',
            borderRadius: isMine ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
            border: isMine ? 'none' : '1px solid var(--glass-border)',
            maxWidth: '85%',
            alignSelf: isMine ? 'flex-end' : 'flex-start',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
        }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                <div
                    className="user-avatar-btn mini"
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        border: isMine ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--glass-border)',
                        background: isMine ? 'rgba(255,255,255,0.1)' : 'var(--panel-bg)'
                    }}
                    onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user_id); }}
                >
                    {post?.avatar_url ? <img src={post.avatar_url} alt="" /> : initial}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    <span
                        className="author-name"
                        style={{
                            fontSize: '0.9rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            color: isMine ? 'white' : 'var(--accent-red)'
                        }}
                        onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user_id); }}
                    >
                        {isMine ? 'You' : name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', opacity: 0.8 }}>
                        {formatTimeAgo(post?.created_at)}
                    </span>
                </div>
            </div>

            <div className="message-content" style={{
                fontSize: '1rem',
                lineHeight: '1.6',
                fontWeight: '400',
                wordBreak: 'break-word',
                color: isMine ? 'rgba(255,255,255,0.95)' : 'var(--text-primary)'
            }}>
                {post?.content ? post.content.split(/(\s+)/).map((part, i) => {
                    if (part.match(/^https?:\/\//)) {
                        return (
                            <a
                                key={i}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: isMine ? 'white' : 'var(--accent-red)',
                                    textDecoration: 'underline',
                                    fontWeight: '600'
                                }}
                            >
                                {part}
                            </a>
                        )
                    }
                    return part;
                }) : ''}
            </div>

        </div>
    )
}
