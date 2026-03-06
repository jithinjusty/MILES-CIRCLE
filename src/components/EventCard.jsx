import { useState } from 'react'
import { MapPin, Calendar, Navigation, Star, Crosshair, Trash2, Clock, AlertTriangle } from 'lucide-react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { supabase } from '../lib/supabase'

const REACTION_TYPES = [
    { type: 'like', emoji: '👍', label: 'Like' },
    { type: 'fire', emoji: '🔥', label: 'Fire' },
    { type: 'heart', emoji: '❤️', label: 'Love' },
    { type: 'clap', emoji: '👏', label: 'Clap' },
    { type: 'wow', emoji: '🤩', label: 'Wow' },
]

export default function EventCard({ event, session, userReaction, onReactionChange, onUserClick, onDelete }) {
    const [showReactions, setShowReactions] = useState(false)
    const [isReacting, setIsReacting] = useState(false)
    const [localReactionCount, setLocalReactionCount] = useState(event?.reaction_count || 0)
    const [localUserReaction, setLocalUserReaction] = useState(userReaction)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return ''
        const now = new Date()
        const posted = new Date(timestamp)
        const diffMs = now - posted
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return posted.toLocaleDateString()
    }

    const formatEventDate = (dateStr) => {
        if (!dateStr) return null
        const d = new Date(dateStr)
        const now = new Date()
        const isToday = d.toDateString() === now.toDateString()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const isTomorrow = d.toDateString() === tomorrow.toDateString()

        if (isToday) return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        if (isTomorrow) return `Tomorrow at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const formatExpiry = (dateStr) => {
        if (!dateStr) return null
        const d = new Date(dateStr)
        const now = new Date()
        const diffMs = d - now

        if (diffMs <= 0) return 'Expired'

        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 60) return `Expires in ${diffMins}m`
        if (diffHours < 24) return `Expires in ${diffHours}h`
        if (diffDays < 7) return `Expires in ${diffDays}d`
        return `Expires ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
    }

    const handleReaction = async (reactionType) => {
        if (!session?.user || isReacting) return
        setIsReacting(true)
        setShowReactions(false)

        try {
            if (localUserReaction === reactionType) {
                const { error } = await supabase
                    .from('event_reactions')
                    .delete()
                    .eq('event_id', event.id)
                    .eq('user_id', session.user.id)

                if (error) throw error
                setLocalUserReaction(null)
                setLocalReactionCount(prev => Math.max(0, prev - 1))
                onReactionChange?.(event.id, null)
            } else {
                if (localUserReaction) {
                    const { error } = await supabase
                        .from('event_reactions')
                        .update({ reaction_type: reactionType })
                        .eq('event_id', event.id)
                        .eq('user_id', session.user.id)

                    if (error) throw error
                } else {
                    const { error } = await supabase
                        .from('event_reactions')
                        .insert({
                            event_id: event.id,
                            user_id: session.user.id,
                            reaction_type: reactionType
                        })

                    if (error) throw error
                    setLocalReactionCount(prev => prev + 1)
                }
                setLocalUserReaction(reactionType)
                onReactionChange?.(event.id, reactionType)
            }
        } catch (err) {
            console.error('Reaction error:', err)
        } finally {
            setIsReacting(false)
        }
    }

    const handleDirections = () => {
        if (event.location_lat && event.location_lng) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${event.location_lat},${event.location_lng}`
            window.open(url, '_blank')
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id)
                .eq('user_id', session.user.id)

            if (error) throw error
            onDelete?.(event.id)
        } catch (err) {
            console.error('Delete error:', err)
        } finally {
            setIsDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    const isMine = event.user_id === session?.user?.id
    const name = event?.full_name || 'Anonymous'
    const initial = (event?.full_name || '?')[0].toUpperCase()
    const activeReactionEmoji = localUserReaction
        ? REACTION_TYPES.find(r => r.type === localUserReaction)?.emoji
        : null
    const hasCoords = event.location_lat && event.location_lng
    const expiryText = formatExpiry(event.expires_at)

    return (
        <div className="event-card anim-fade-in">
            {/* Event Image */}
            {event.image_url && (
                <div className="event-card-image">
                    <img src={event.image_url} alt={event.title} />
                    {event.event_date && (
                        <div className="event-date-badge">
                            <Calendar size={14} />
                            <span>{formatEventDate(event.event_date)}</span>
                        </div>
                    )}
                    {expiryText && (
                        <div className={`event-expiry-badge ${expiryText === 'Expired' ? 'expired' : ''}`}>
                            <Clock size={12} />
                            <span>{expiryText}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Card Body */}
            <div className="event-card-body">
                {/* Header with user info */}
                <div className="event-card-header">
                    <div
                        className="event-poster-avatar"
                        onClick={(e) => { e.stopPropagation(); onUserClick?.(event.user_id); }}
                    >
                        {event?.avatar_url ? <img src={event.avatar_url} alt="" /> : initial}
                    </div>
                    <div className="event-poster-info">
                        <span
                            className="event-poster-name"
                            onClick={(e) => { e.stopPropagation(); onUserClick?.(event.user_id); }}
                        >
                            {isMine ? 'You' : name}
                        </span>
                        <span className="event-post-time">{formatTimeAgo(event?.created_at)}</span>
                    </div>
                    <div className="event-poster-points">
                        <Star size={14} />
                        <span>{event?.poster_points || 0}</span>
                    </div>
                    {/* Delete button for own events */}
                    {isMine && (
                        <button
                            className="event-delete-btn"
                            onClick={() => setShowDeleteConfirm(true)}
                            title="Delete event"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <div className="event-delete-confirm">
                        <AlertTriangle size={18} />
                        <span>Delete this event?</span>
                        <div className="delete-confirm-actions">
                            <button className="delete-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="delete-yes" onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Title */}
                <h3 className="event-card-title">{event.title}</h3>

                {/* Description */}
                {event.description && (
                    <p className="event-card-desc">{event.description}</p>
                )}

                {/* Expiry (if no image to show badge on) */}
                {!event.image_url && expiryText && (
                    <div className={`event-meta-row expiry-row ${expiryText === 'Expired' ? 'expired' : ''}`}>
                        <Clock size={16} />
                        <span>{expiryText}</span>
                    </div>
                )}

                {/* Date (if no image to pin it on) */}
                {!event.image_url && event.event_date && (
                    <div className="event-meta-row">
                        <Calendar size={16} />
                        <span>{formatEventDate(event.event_date)}</span>
                    </div>
                )}

                {/* GPS Location with Zoomed-Out Mini Map */}
                {hasCoords && (
                    <div className="event-location-block">
                        <div className="event-mini-map-wrap">
                            <MapContainer
                                center={[event.location_lat, event.location_lng]}
                                zoom={13}
                                zoomControl={false}
                                dragging={false}
                                scrollWheelZoom={false}
                                doubleClickZoom={false}
                                touchZoom={false}
                                attributionControl={false}
                                className="event-mini-map"
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <Marker position={[event.location_lat, event.location_lng]} />
                            </MapContainer>
                        </div>
                        <div className="event-coords-info">
                            <div className="coords-row">
                                <Crosshair size={14} />
                                <span className="coords-text">
                                    {parseFloat(event.location_lat).toFixed(6)}, {parseFloat(event.location_lng).toFixed(6)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions Bar */}
                <div className="event-actions-bar">
                    {/* Reactions Button */}
                    <div className="event-reaction-wrapper">
                        <button
                            className={`event-react-btn ${localUserReaction ? 'reacted' : ''}`}
                            onClick={() => localUserReaction ? handleReaction(localUserReaction) : setShowReactions(!showReactions)}
                            onMouseEnter={() => !localUserReaction && setShowReactions(true)}
                            disabled={isReacting}
                        >
                            <span className="react-emoji">
                                {activeReactionEmoji || '👍'}
                            </span>
                            <span className="react-count">{localReactionCount}</span>
                        </button>

                        {/* Reaction Picker */}
                        {showReactions && (
                            <div
                                className="event-reaction-picker"
                                onMouseLeave={() => setShowReactions(false)}
                            >
                                {REACTION_TYPES.map(r => (
                                    <button
                                        key={r.type}
                                        className={`reaction-option ${localUserReaction === r.type ? 'active' : ''}`}
                                        onClick={() => handleReaction(r.type)}
                                        title={r.label}
                                    >
                                        {r.emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Directions Button */}
                    <button className="event-directions-btn" onClick={handleDirections}>
                        <Navigation size={16} />
                        <span>Directions</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
