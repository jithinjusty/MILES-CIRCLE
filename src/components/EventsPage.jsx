import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Calendar, Sparkles, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EventCard from './EventCard'
import CreateEventModal from './CreateEventModal'

export default function EventsPage({ position, radius, session, onBack, onUserClick }) {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [userReactions, setUserReactions] = useState({})

    const fetchEvents = async () => {
        if (!position || isNaN(position[0]) || isNaN(position[1])) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data, error: queryError } = await supabase
                .rpc('get_events_within_radius', {
                    user_lat: parseFloat(position[0]),
                    user_lng: parseFloat(position[1]),
                    radius_miles: parseFloat(radius) || 1
                })

            if (queryError) throw queryError

            const eventsData = data || []
            setEvents(eventsData)

            // Fetch user's reactions for these events
            if (session?.user && eventsData.length > 0) {
                const eventIds = eventsData.map(e => e.id)
                const { data: reactionData } = await supabase
                    .rpc('get_user_event_reactions', {
                        p_user_id: session.user.id,
                        p_event_ids: eventIds
                    })

                if (reactionData) {
                    const reactionsMap = {}
                    reactionData.forEach(r => {
                        reactionsMap[r.event_id] = r.reaction_type
                    })
                    setUserReactions(reactionsMap)
                }
            }
        } catch (err) {
            console.error('Events fetch error:', err)
            setError(err.message || 'Failed to load events')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()

        // Real-time subscription for new events
        const channel = supabase
            .channel('public:events')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'events'
            }, () => {
                fetchEvents()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [position?.[0], position?.[1], radius])

    const handleReactionChange = (eventId, reactionType) => {
        setUserReactions(prev => {
            const updated = { ...prev }
            if (reactionType) {
                updated[eventId] = reactionType
            } else {
                delete updated[eventId]
            }
            return updated
        })
    }

    return (
        <div className="events-page">
            {/* Events Header */}
            <div className="events-header">
                <button className="events-back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <div className="events-header-info">
                    <h2>
                        <Sparkles size={22} className="header-icon" />
                        Local Events
                    </h2>
                    <p>{radius}-mile radius</p>
                </div>
                <button
                    className="events-create-fab"
                    onClick={() => setShowCreate(true)}
                >
                    <Plus size={22} />
                </button>
            </div>

            {/* Events Content */}
            <div className="events-content">
                {loading && events.length === 0 && (
                    <div className="events-loading">
                        <div className="pulse-circle">
                            <div className="spinner"></div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="events-error">
                        <RefreshCw size={32} />
                        <h3>Something went wrong</h3>
                        <p>{error}</p>
                        <button onClick={fetchEvents}>
                            Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && events.length === 0 && (
                    <div className="events-empty">
                        <div className="empty-icon-wrap">
                            <Calendar size={48} />
                        </div>
                        <h3>No Events Nearby</h3>
                        <p>Nothing happening in your {radius}-mile circle yet. Be the first to share an event!</p>
                        <button
                            className="events-empty-cta"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus size={20} />
                            Create First Event
                        </button>
                    </div>
                )}

                {events.length > 0 && (
                    <div className="events-grid">
                        {events.map(event => (
                            <EventCard
                                key={event.id}
                                event={event}
                                session={session}
                                userReaction={userReactions[event.id]}
                                onReactionChange={handleReactionChange}
                                onUserClick={onUserClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Event Modal */}
            {showCreate && (
                <CreateEventModal
                    position={position}
                    session={session}
                    onClose={() => setShowCreate(false)}
                    onEventCreated={fetchEvents}
                />
            )}
        </div>
    )
}
