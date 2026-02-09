import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PostCard from './PostCard'

export default function Feed({ position, radius }) {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [currentUserId, setCurrentUserId] = useState(null)

    const fetchPosts = async () => {
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUserId(user?.id)

            const { data, error: queryError } = await supabase
                .rpc('get_posts_within_radius', {
                    user_lat: position[0],
                    user_lng: position[1],
                    radius_miles: radius
                })

            if (queryError) throw queryError
            setPosts(data || [])
        } catch (err) {
            console.error('Feed fetch error:', err)
            setError(err.message || 'Failed to load posts')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPosts()
    }, [position, radius])

    if (loading && posts.length === 0) {
        return (
            <div className="feed-loading">
                <div className="spinner"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="feed-error">
                <p>{error}</p>
                <button className="auth-link-btn" onClick={fetchPosts}>Try Again</button>
            </div>
        )
    }

    if (posts.length === 0) {
        return (
            <div className="feed-empty">
                <p style={{ color: '#666' }}>No one in this circle has shared anything yet...</p>
            </div>
        )
    }

    return (
        <div className="feed-posts" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    isMine={post.user_id === currentUserId}
                />
            ))}
        </div>
    )
}
