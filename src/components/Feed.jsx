import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PostCard from './PostCard'

export default function Feed({ position, radius, onClose }) {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchPosts = async () => {
        setLoading(true)
        setError(null)

        try {
            // PostGIS query to get posts within radius
            const radiusMeters = radius * 1609.34 // Convert miles to meters
            const userPoint = `POINT(${position[1]} ${position[0]})`

            // Use RPC call for complex PostGIS query
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

    return (
        <div className="feed-overlay">
            <div className="feed-container frosted-glass">
                <div className="feed-header">
                    <h2 className="feed-title">
                        Your Circle Feed
                        <span className="feed-subtitle">{radius} mile{radius !== 1 ? 's' : ''}</span>
                    </h2>
                    <div className="feed-actions">
                        <button className="icon-btn" onClick={fetchPosts} title="Refresh">
                            <RefreshCw size={20} />
                        </button>
                        <button className="icon-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="feed-content">
                    {loading && (
                        <div className="feed-loading">
                            <div className="spinner"></div>
                            <p>Loading posts...</p>
                        </div>
                    )}

                    {error && (
                        <div className="feed-error">
                            <p>{error}</p>
                            <button className="btn-secondary" onClick={fetchPosts}>
                                Try Again
                            </button>
                        </div>
                    )}

                    {!loading && !error && posts.length === 0 && (
                        <div className="feed-empty">
                            <p>No posts in your circle yet.</p>
                            <p className="text-muted">Be the first to share something!</p>
                        </div>
                    )}

                    {!loading && !error && posts.length > 0 && (
                        <div className="feed-posts">
                            {posts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    userPosition={position}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
