import { useState, useRef, useEffect } from 'react'
import { X, Send, MapPin, Calendar, Image, Loader, Crosshair, Check } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { supabase } from '../lib/supabase'

function MapUpdater({ center }) {
    const map = useMap()
    useEffect(() => {
        if (center) {
            map.setView(center, 16, { animate: true, duration: 0.8 })
        }
    }, [center, map])
    return null
}

export default function CreateEventModal({ position, session, onClose, onEventCreated }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [eventDate, setEventDate] = useState('')
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [eventLocation, setEventLocation] = useState(null)
    const [isLocating, setIsLocating] = useState(false)
    const fileInputRef = useRef(null)

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5MB')
            return
        }
        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(file)
    }

    const handleSelectLocation = () => {
        setIsLocating(true)
        setError(null)

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser')
            setIsLocating(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                const accuracy = pos.coords.accuracy
                setEventLocation({ lat, lng, accuracy })
                setIsLocating(false)
            },
            (err) => {
                console.error('GPS Error:', err)
                if (err.code === 1) {
                    setError('Location permission denied. Please allow location access.')
                } else if (err.code === 2) {
                    setError('Location unavailable. Please try again.')
                } else {
                    setError('Location request timed out. Please try again.')
                }
                setIsLocating(false)
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
    }

    const handleRemoveLocation = () => {
        setEventLocation(null)
    }

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (!title.trim()) return
        if (!eventLocation) {
            setError('Please select your GPS location')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('You must be logged in')

            let imageUrl = null

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('event-images')
                    .upload(fileName, imageFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('event-images')
                    .getPublicUrl(fileName)

                imageUrl = publicUrl
            }

            const locationWKT = `POINT(${eventLocation.lng} ${eventLocation.lat})`

            const { error: insertError } = await supabase
                .from('events')
                .insert([{
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    image_url: imageUrl,
                    event_date: eventDate || null,
                    location: locationWKT,
                    location_name: `${eventLocation.lat.toFixed(6)}, ${eventLocation.lng.toFixed(6)}`
                }])

            if (insertError) throw insertError

            onEventCreated?.()
            onClose()
        } catch (err) {
            console.error('Event creation error:', err)
            setError(err.message || 'Failed to create event')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="create-event-modal anim-fade-in" onClick={e => e.stopPropagation()}>
                <header className="create-event-header">
                    <div>
                        <h2>Create Event</h2>
                        <p>Share something happening around you</p>
                    </div>
                    <button className="modal-close-x" onClick={onClose}>
                        <X size={24} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="create-event-form">
                    {/* Image Upload */}
                    <div className="event-image-upload" onClick={() => fileInputRef.current?.click()}>
                        {imagePreview ? (
                            <div className="image-preview-wrap">
                                <img src={imagePreview} alt="Preview" />
                                <button
                                    type="button"
                                    className="remove-image-btn"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setImageFile(null)
                                        setImagePreview(null)
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="upload-placeholder">
                                <Image size={32} />
                                <span>Add Event Photo</span>
                                <span className="upload-hint">Tap to upload (max 5MB)</span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleImageSelect}
                        />
                    </div>

                    {/* Title */}
                    <div className="event-field">
                        <label>Event Title *</label>
                        <input
                            type="text"
                            placeholder="e.g., Drama Show at Community Hall"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={150}
                            autoFocus
                        />
                        <span className="char-counter">{title.length}/150</span>
                    </div>

                    {/* Description */}
                    <div className="event-field">
                        <label>Description</label>
                        <textarea
                            placeholder="Tell people what this event is about..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            maxLength={1000}
                            rows={3}
                        />
                        <span className="char-counter">{description.length}/1000</span>
                    </div>

                    {/* GPS Location Selector */}
                    <div className="event-field">
                        <label>Event Location *</label>
                        {!eventLocation ? (
                            <button
                                type="button"
                                className="gps-select-btn"
                                onClick={handleSelectLocation}
                                disabled={isLocating}
                            >
                                {isLocating ? (
                                    <>
                                        <Loader size={20} className="spin-icon" />
                                        <span>Detecting your position...</span>
                                    </>
                                ) : (
                                    <>
                                        <Crosshair size={20} />
                                        <span>Use My Current GPS Location</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="gps-location-selected">
                                {/* Mini Map */}
                                <div className="gps-map-preview">
                                    <MapContainer
                                        center={[eventLocation.lat, eventLocation.lng]}
                                        zoom={16}
                                        zoomControl={false}
                                        dragging={false}
                                        scrollWheelZoom={false}
                                        doubleClickZoom={false}
                                        touchZoom={false}
                                        attributionControl={false}
                                        className="gps-mini-map"
                                    >
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                        <Marker position={[eventLocation.lat, eventLocation.lng]} />
                                        <MapUpdater center={[eventLocation.lat, eventLocation.lng]} />
                                    </MapContainer>
                                </div>

                                {/* Coordinates Display */}
                                <div className="gps-coords-panel">
                                    <div className="gps-status-badge">
                                        <Check size={14} />
                                        <span>Location Locked</span>
                                    </div>
                                    <div className="gps-coords-grid">
                                        <div className="coord-item">
                                            <span className="coord-label">LAT</span>
                                            <span className="coord-value">{eventLocation.lat.toFixed(6)}</span>
                                        </div>
                                        <div className="coord-divider"></div>
                                        <div className="coord-item">
                                            <span className="coord-label">LNG</span>
                                            <span className="coord-value">{eventLocation.lng.toFixed(6)}</span>
                                        </div>
                                    </div>
                                    {eventLocation.accuracy && (
                                        <div className="gps-accuracy">
                                            <MapPin size={12} />
                                            <span>Accuracy: ±{Math.round(eventLocation.accuracy)}m</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="gps-change-btn"
                                        onClick={handleRemoveLocation}
                                    >
                                        Re-detect Location
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Event Date */}
                    <div className="event-field">
                        <label>Event Date & Time</label>
                        <div className="field-with-icon">
                            <Calendar size={18} className="field-icon" />
                            <input
                                type="datetime-local"
                                value={eventDate}
                                onChange={e => setEventDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="event-error">{error}</div>
                    )}

                    <div className="create-event-actions">
                        <button type="button" className="event-cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="event-submit-btn"
                            disabled={loading || !title.trim() || !eventLocation}
                        >
                            {loading ? (
                                <><Loader size={18} className="spin-icon" /> Posting...</>
                            ) : (
                                <><Send size={18} /> Post Event</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
