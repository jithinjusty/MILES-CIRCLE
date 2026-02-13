import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PostCard from './PostCard'

export default function Feed({ position, radius, refreshTrigger, session }) {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchPosts = async () => {
        // Prevent fetching if coordinates are invalid
        if (!position || isNaN(position[0]) || isNaN(position[1])) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            console.log("Fetching posts for:", position, "radius:", radius);
            const { data, error: queryError } = await supabase
                .rpc('get_posts_within_radius', {
                    user_lat: parseFloat(position[0]),
                    user_lng: parseFloat(position[1]),
                    radius_miles: parseFloat(radius) || 1
                })

            if (queryError) {
                console.error("Supabase RPC error:", queryError);
                throw queryError;
            }

            setPosts((data || []).slice(0, 100))
        } catch (err) {
            console.error('Feed fetch error:', err)
            setError(err.message || 'Failed to load posts')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPosts()
    }, [position?.[0], position?.[1], radius, refreshTrigger])

    if (loading && posts.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="message-card" style={{ border: '1px solid #311', background: 'rgba(50, 20, 20, 0.4)' }}>
                <p style={{ color: '#f55', marginBottom: '10px' }}>{error}</p>
                <button className="auth-btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={fetchPosts}>
                    Try Again
                </button>
            </div>
        )
    }

    if (posts.length === 0) {
        return (
            <div className="message-card" style={{ textAlign: 'center', opacity: 0.6 }}>
                <p>No one in this circle has shared anything yet...</p>
                <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>Try increasing your radius!</p>
            </div>
        )
    }

    return (
        <div className="feed-posts" style={{ display: 'flex', flexDirection: 'column-reverse', gap: '1.5rem', width: '100%' }}>
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    isMine={post.user_id === session?.user?.id}
                />
            ))}
        </div>
    )
}
