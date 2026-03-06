import { useState, useRef } from 'react'
import { X, Send, MapPin, Calendar, Image, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function CreateEventModal({ position, session, onClose, onEventCreated }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [locationName, setLocationName] = useState('')
    const [eventDate, setEventDate] = useState('')
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
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

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (!title.trim()) return

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('You must be logged in')

            let imageUrl = null

            // Upload image if selected
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

            const locationWKT = `POINT(${position[1]} ${position[0]})`

            const { error: insertError } = await supabase
                .from('events')
                .insert([{
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    image_url: imageUrl,
                    event_date: eventDate || null,
                    location: locationWKT,
                    location_name: locationName.trim() || null
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

                    {/* Location Name */}
                    <div className="event-field">
                        <div className="field-with-icon">
                            <MapPin size={18} className="field-icon" />
                            <input
                                type="text"
                                placeholder="Location name (e.g., next to 5th Ave Park)"
                                value={locationName}
                                onChange={e => setLocationName(e.target.value)}
                            />
                        </div>
                        <span className="field-note">
                            📍 Your current GPS coordinates will be attached automatically
                        </span>
                    </div>

                    {/* Event Date */}
                    <div className="event-field">
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
                            disabled={loading || !title.trim()}
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
