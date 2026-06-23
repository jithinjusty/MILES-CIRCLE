import { useState, useEffect } from 'react'
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
    const [localGoingCount, setLocalGoingCount] = useState(event?.going_count || 0)
    const [localUserReaction, setLocalUserReaction] = useState(userReaction)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [flashTimerText, setFlashTimerText] = useState('')

    useEffect(() => {
        if (!event.is_flash) return;

        const updateTimer = () => {
            const now = new Date();
            const end = new Date(event.expires_at);

            if (now < end) {
                const diffMs = end - now;
                const diffMins = Math.floor(diffMs / 60000);
                const diffSecs = Math.floor((diffMs % 60000) / 1000);
                setFlashTimerText(`Expires in ${diffMins}m ${diffSecs}s`);
            } else {
                setFlashTimerText('Expired');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [event.is_flash, event.event_date, event.expires_at]);

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
                if (reactionType === 'going') {
                    setLocalGoingCount(prev => Math.max(0, prev - 1))
                } else {
                    setLocalReactionCount(prev => Math.max(0, prev - 1))
                }
                onReactionChange?.(event.id, null)
            } else {
                if (localUserReaction) {
                    const { error } = await supabase
                        .from('event_reactions')
                        .update({ reaction_type: reactionType })
                        .eq('event_id', event.id)
                        .eq('user_id', session.user.id)

                    if (error) throw error
                    
                    // Update reaction counts locally based on the transitions
                    if (localUserReaction === 'going') {
                        setLocalGoingCount(prev => Math.max(0, prev - 1))
                        setLocalReactionCount(prev => prev + 1)
                    } else if (reactionType === 'going') {
                        setLocalReactionCount(prev => Math.max(0, prev - 1))
                        setLocalGoingCount(prev => prev + 1)
                    }
                } else {
                    const { error } = await supabase
                        .from('event_reactions')
                        .insert({
                            event_id: event.id,
                            user_id: session.user.id,
                            reaction_type: reactionType
                        })

                    if (error) throw error
                    if (reactionType === 'going') {
                        setLocalGoingCount(prev => prev + 1)
                    } else {
                        setLocalReactionCount(prev => prev + 1)
                    }
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

    const handleExportCalendar = () => {
        const formatICSDate = (d) => {
            return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const eventDate = event.event_date ? new Date(event.event_date) : new Date();
        const endDate = event.expires_at ? new Date(event.expires_at) : new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

        const icsLines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Miles Circle//NONSGML Event//EN',
            'BEGIN:VEVENT',
            `UID:${event.id}@milescircle.com`,
            `DTSTAMP:${formatICSDate(new Date())}`,
            `DTSTART:${formatICSDate(eventDate)}`,
            `DTEND:${formatICSDate(endDate)}`,
            `SUMMARY:${event.title?.replace(/[,;]/g, '\\$&') || 'Event'}`,
            `DESCRIPTION:${event.description?.replace(/[,;]/g, '\\$&') || ''}`,
            `GEO:${parseFloat(event.location_lat).toFixed(6)};${parseFloat(event.location_lng).toFixed(6)}`,
            `LOCATION:${parseFloat(event.location_lat).toFixed(6)}\\, ${parseFloat(event.location_lng).toFixed(6)}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ];

        const icsString = icsLines.join('\r\n');
        const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${event.title?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'event'}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('local_events')
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
    const activeReactionEmoji = localUserReaction && localUserReaction !== 'going'
        ? REACTION_TYPES.find(r => r.type === localUserReaction)?.emoji
        : null
    const hasCoords = event.location_lat && event.location_lng
    const expiryText = formatExpiry(event.expires_at)

    return (
        <div className={`event-card anim-fade-in ${event.is_flash ? 'flash-active' : ''}`} style={event.is_flash ? {
            border: '2px solid rgba(255,159,67,0.5)',
            boxShadow: '0 12px 30px rgba(255,159,67,0.15)',
            background: 'linear-gradient(180deg, rgba(255,159,67,0.04) 0%, var(--panel-bg) 100%)'
        } : {}}>
            {/* Event Image */}
            {event.image_url && (
                <div className="event-card-image" style={{ position: 'relative' }}>
                    <img src={event.image_url} alt={event.title} />
                    {event.is_flash ? (
                        <div className="event-flash-badge" style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            background: 'linear-gradient(135deg, #ff9f43 0%, #ff5252 100%)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(255,159,67,0.4)',
                            animation: flashTimerText !== 'Expired' ? 'pulse-orange 1.5s infinite alternate' : 'none',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <span>⚡</span>
                            <span>{flashTimerText}</span>
                        </div>
                    ) : (
                        <>
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
                        </>
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

                {/* Flash Timer / Expiry (if no image to show badge on) */}
                {event.is_flash ? (
                    <div className="event-meta-row flash-row" style={{
                        background: 'rgba(255,159,67,0.1)',
                        border: '1px solid rgba(255,159,67,0.3)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        color: '#ff9f43',
                        fontWeight: '800',
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '1rem',
                        boxShadow: '0 4px 12px rgba(255,159,67,0.05)',
                        animation: flashTimerText !== 'Expired' ? 'pulse-orange-border 1.5s infinite alternate' : 'none'
                    }}>
                        <Clock size={16} />
                        <span>⚡ {flashTimerText}</span>
                    </div>
                ) : (
                    <>
                        {!event.image_url && expiryText && (
                            <div className={`event-meta-row expiry-row ${expiryText === 'Expired' ? 'expired' : ''}`}>
                                <Clock size={16} />
                                <span>{expiryText}</span>
                            </div>
                        )}
                        {!event.image_url && event.event_date && (
                            <div className="event-meta-row">
                                <Calendar size={16} />
                                <span>{formatEventDate(event.event_date)}</span>
                            </div>
                        )}
                    </>
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
                            className={`event-react-btn ${localUserReaction && localUserReaction !== 'going' ? 'reacted' : ''}`}
                            onClick={() => (localUserReaction && localUserReaction !== 'going') ? handleReaction(localUserReaction) : setShowReactions(!showReactions)}
                            onMouseEnter={() => (localUserReaction === null || localUserReaction === 'going') && setShowReactions(true)}
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

                    {/* RSVP "Going" Button */}
                    <button
                        className={`event-rsvp-btn ${localUserReaction === 'going' ? 'going' : ''}`}
                        onClick={() => handleReaction('going')}
                        disabled={isReacting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            background: localUserReaction === 'going' ? 'linear-gradient(135deg, var(--accent-red) 0%, #B2443E 100%)' : 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--glass-border)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            transition: 'all 0.2s',
                        }}
                    >
                        <span>✨ Going</span>
                        <span className="rsvp-count" style={{
                            background: 'rgba(0,0,0,0.2)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontSize: '0.75rem'
                        }}>{localGoingCount}</span>
                    </button>

                    {/* Directions Button */}
                    <button className="event-directions-btn" onClick={handleDirections}>
                        <Navigation size={16} />
                        <span>Directions</span>
                    </button>

                    {/* Export Calendar Sync Button */}
                    <button className="event-directions-btn" onClick={handleExportCalendar}>
                        <Calendar size={16} />
                        <span>Sync</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
