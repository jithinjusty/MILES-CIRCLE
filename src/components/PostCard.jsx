import { MessageCircle, MapPin } from 'lucide-react'

export default function PostCard({ post, userPosition }) {
    // Calculate distance from user
    const calculateDistance = () => {
        if (!post.location || !userPosition) return null

        const R = 3959 // Earth radius in miles
        const lat1 = userPosition[0] * Math.PI / 180
        const lat2 = post.lat * Math.PI / 180
        const dLat = (post.lat - userPosition[0]) * Math.PI / 180
        const dLon = (post.lng - userPosition[1]) * Math.PI / 180

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        if (distance < 0.1) return 'Nearby'
        if (distance < 1) return `${(distance * 5280).toFixed(0)} ft`
        return `${distance.toFixed(1)} mi`
    }

    const formatTimeAgo = (timestamp) => {
        const now = new Date()
        const posted = new Date(timestamp)
        const diffMs = now - posted
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    return (
        <div className="post-card">
            <div className="post-header">
                <div className="post-avatar">
                    {post.user_email?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="post-meta-info">
                    <span className="post-author">{post.user_email?.split('@')[0] || 'Anonymous'}</span>
                    <div className="post-info-row">
                        <span className="post-time">{formatTimeAgo(post.created_at)}</span>
                        <span className="post-distance">
                            <MapPin size={12} strokeWidth={2.5} />
                            {calculateDistance()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="post-content">
                {post.content}
            </div>

            <div className="post-actions">
                <button className="post-action-btn">
                    <MessageCircle size={18} />
                    <span>Reply</span>
                </button>
            </div>
        </div>
    )
}
