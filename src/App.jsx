import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { Plus, List, Send, User, Map as MapIcon, X, Image, Camera, Paperclip, Globe, Eye, EyeOff } from 'lucide-react'
import './App.css'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase'
import SplashScreen from './components/SplashScreen'
import AuthOverlay from './components/AuthOverlay'
import CreatePostModal from './components/CreatePostModal'
import Feed from './components/Feed'

const INITIAL_POSITION = [40.7128, -74.0060];

function MapController({ center, radius, isInteracting }) {
    const map = useMap();
    useEffect(() => {
        if (!map || !center || isNaN(center[0]) || isNaN(center[1])) return;

        // Use a safe calculation for bounds to avoid 'layerPointToLatLng' crash
        const metersPerDegree = 111320;
        const latDelta = (radius * 1609.34) / metersPerDegree;
        // Lon delta depends on latitude
        const lngDelta = (radius * 1609.34) / (metersPerDegree * Math.cos(center[0] * Math.PI / 180));

        const bounds = [
            [center[0] - latDelta, center[1] - lngDelta],
            [center[0] + latDelta, center[1] + lngDelta]
        ];

        try {
            map.fitBounds(bounds, {
                padding: [50, 50],
                animate: true,
                duration: isInteracting ? 0.5 : 1.2
            });
        } catch (e) {
            console.warn("Map fitBounds failed gently:", e);
        }
    }, [center, radius, map, isInteracting]);
    return null;
}

function App() {
    const [showSplash, setShowSplash] = useState(true)
    const [authLoading, setAuthLoading] = useState(true);
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState({});
    const [radius, setRadius] = useState(1);
    const [position, setPosition] = useState(INITIAL_POSITION);
    const [runtimeError, setRuntimeError] = useState(null);
    const [locationAvailable, setLocationAvailable] = useState(false);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [showFeed, setShowFeed] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isMapInteracting, setIsMapInteracting] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [feedTrigger, setFeedTrigger] = useState(0);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSliderHidden, setIsSliderHidden] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const sliderTimer = useRef(null);
    const watchId = useRef(null);

    const handleSliderInteract = (isStarting) => {
        setIsMapInteracting(isStarting);
        if (sliderTimer.current) clearTimeout(sliderTimer.current);

        if (!isStarting) {
            sliderTimer.current = setTimeout(() => {
                setIsMapInteracting(false);
            }, 500); // Shorter delay for snappier feedback
        }
    }

    useEffect(() => {
        console.log("App mounted, checking session...");
        // Safe Leaflet fix
        try {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
        } catch (e) { console.error("Leaflet fix failed", e); }

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log("Session fetched:", session?.user?.email);
            setSession(session);
            if (session) fetchProfile(session.user.id);
            setAuthLoading(false);
        }).catch(err => {
            console.error("Auth error:", err);
            setRuntimeError(err.message);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log("Auth state changed:", _event, session?.user?.email);
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else {
                setProfile({});
                setOnboardingStep(0);
            }
            setAuthLoading(false);
        });

        const updateLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (pos?.coords) {
                            setPosition([pos.coords.latitude, pos.coords.longitude]);
                            setLocationAvailable(true);
                            setLocationError(null);
                        }
                    },
                    (err) => {
                        console.error("Location error:", err);
                        if (err.code === 1) setLocationError("PERMISSION_DENIED");
                        else setLocationError("LOCATION_UNAVAILABLE");
                        setLocationAvailable(false);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                setLocationError("NOT_SUPPORTED");
            }
        };

        // Initial location and continuous watch
        updateLocation();

        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    if (pos?.coords) {
                        setPosition([pos.coords.latitude, pos.coords.longitude]);
                        setLocationAvailable(true);
                        setLocationError(null);
                    }
                },
                null,
                { enableHighAccuracy: true }
            );
        }

        // Re-verify every 5 minutes as requested
        const verifyInterval = setInterval(updateLocation, 5 * 60 * 1000);

        return () => {
            if (subscription) subscription.unsubscribe();
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
            clearInterval(verifyInterval);
        }
    }, [])

    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (data) {
            setProfile(data)
            if (!data.onboarding_completed) setOnboardingStep(1)
        }
    }

    const handleUpdateProfile = async (updates) => {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', session.user.id)

        if (!error) {
            setProfile({ ...profile, ...updates })
            if (updates.onboarding_completed) setOnboardingStep(0)
            else if (onboardingStep === 1) setOnboardingStep(2)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
    }

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!messageContent.trim() || isSending) return;

        const originalContent = messageContent;
        setMessageContent(''); // Clear immediately for live feel
        setIsSending(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            const locationWKT = `POINT(${position[1]} ${position[0]})`;
            const { error } = await supabase
                .from('posts')
                .insert([{
                    user_id: user.id,
                    content: originalContent.trim(),
                    location: locationWKT
                }]);

            if (error) throw error;
            setFeedTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Failed to send message:", err);
            setMessageContent(originalContent); // Restore if failed
            alert("Failed to send message: " + err.message);
        } finally {
            setIsSending(false);
        }
    }

    const handleAttachmentAction = (type) => {
        setShowAttachmentMenu(false);
        if (type === 'photo' || type === 'file') {
            alert("This feature is only available for subscribed users.");
            return;
        }
        if (type === 'location') {
            const mapsUrl = `https://www.google.com/maps?q=${position[0]},${position[1]}`;
            setMessageContent(prev => prev + (prev ? ' ' : '') + mapsUrl);
        }
        // Link action just focuses the input which is already the case
    }

    const handleUploadAvatar = async (event) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await handleUpdateProfile({ avatar_url: publicUrl });
            alert('Profile picture updated!');
        } catch (error) {
            console.error('Error uploading avatar:', error.message);
            alert("Avatar upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const getInitial = () => {
        const name = profile?.full_name || session?.user?.email || '';
        return name?.[0]?.toUpperCase() || '?';
    }

    if (locationError === 'PERMISSION_DENIED') {
        return (
            <div style={{ background: 'black', color: 'white', padding: '40px', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div className="onboarding-card">
                    <MapIcon size={64} color="var(--accent-red)" style={{ marginBottom: '20px' }} />
                    <h2 style={{ color: 'var(--accent-red)', marginBottom: '10px' }}>Service Unavailable</h2>
                    <p style={{ color: '#888', marginBottom: '30px' }}>Miles Circle is a location-based platform. Please enable location permissions in your browser settings to continue.</p>
                    <button onClick={() => window.location.reload()} className="auth-btn-primary">Retry Access</button>
                </div>
            </div>
        )
    }

    if (runtimeError) {
        return (
            <div style={{ background: 'black', color: 'red', padding: '20px', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div>
                    <h2>Application Error</h2>
                    <p>{runtimeError}</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: 'white', border: 'none', borderRadius: '5px', marginTop: '20px' }}>Reload</button>
                </div>
            </div>
        )
    }

    if (authLoading && !showSplash) {
        return (
            <div style={{ background: 'black', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div className={`app-container ${isMapInteracting ? 'map-mode' : 'chat-mode'}`}>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

            {!showSplash && !authLoading && !session && <AuthOverlay />}

            {!showSplash && !authLoading && session && (
                <>
                    {/* MAP BACKGROUND */}
                    <div className="map-wrapper" style={{ position: 'absolute', inset: 0 }}>
                        <MapContainer center={position} zoom={13} zoomControl={false} className="map-view">
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                            {locationAvailable && <Marker position={position} />}
                            <Circle
                                center={position}
                                pathOptions={{ color: '#D2554E', fillColor: '#D2554E', fillOpacity: 0.1, weight: 2, dashArray: '4, 8' }}
                                radius={radius * 1609.34}
                            />
                            <MapController center={position} radius={radius} isInteracting={isMapInteracting} />
                        </MapContainer>
                    </div>

                    {/* FOREGROUND UI */}
                    <div className="chat-interface">
                        <header className="app-header-new">
                            <h1 style={{ color: 'var(--accent-red)', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>MILES</h1>
                            <div className="user-avatar-btn" onClick={() => setShowSettings(true)}>
                                {getInitial()}
                            </div>
                        </header>

                        <div className="chat-center-container">
                            <div className="chat-messages-scroll">
                                <Feed position={position} radius={radius} refreshTrigger={feedTrigger} session={session} />
                                <div className="message-card">
                                    <p style={{ color: 'var(--accent-red)', fontWeight: 'bold', marginBottom: '4px' }}>Miles Circle</p>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        Welcome to your circle! You are currently looking at a <strong>{radius} mile</strong> radius around you.
                                    </p>
                                </div>
                            </div>

                            <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
                                {showAttachmentMenu && (
                                    <div className="attachment-menu-popover">
                                        <button type="button" className="menu-item" onClick={() => handleAttachmentAction('photo')}>
                                            <div className="menu-icon-circle"><Image size={20} /></div>
                                            <span>Photos</span>
                                        </button>
                                        <button type="button" className="menu-item" onClick={() => handleAttachmentAction('file')}>
                                            <div className="menu-icon-circle"><Paperclip size={20} /></div>
                                            <span>Files</span>
                                        </button>
                                        <button type="button" className="menu-item" onClick={() => handleAttachmentAction('location')}>
                                            <div className="menu-icon-circle"><MapIcon size={20} /></div>
                                            <span>Location</span>
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className={`chat-action-btn ${showAttachmentMenu ? 'active' : ''}`}
                                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                                >
                                    <Plus size={24} style={{ transform: showAttachmentMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }} />
                                </button>
                                <input
                                    type="text"
                                    className="chat-input-main"
                                    placeholder="Message Circle..."
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    disabled={isSending}
                                />
                                <button
                                    type="submit"
                                    className="chat-send-btn-new"
                                    disabled={!messageContent.trim() || isSending}
                                    style={{ opacity: messageContent.trim() ? 1 : 0.4 }}
                                >
                                    {isSending ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div> : <Send size={18} />}
                                </button>
                            </form>
                        </div>

                        {/* RIGHT SIDE SLIDER */}
                        <div className={`side-slider-container ${isSliderHidden ? 'collapsed' : ''}`}>
                            <button
                                className="slider-toggle-btn"
                                onClick={() => setIsSliderHidden(!isSliderHidden)}
                                title={isSliderHidden ? 'Show Slider' : 'Hide Slider'}
                            >
                                {isSliderHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                            {!isSliderHidden && (
                                <>
                                    <span className="radius-badge">{radius}m</span>
                                    <input
                                        type="range"
                                        className="range-vertical"
                                        min="0.5" max="50" step="0.5"
                                        value={radius}
                                        onChange={(e) => setRadius(parseFloat(e.target.value))}
                                        onMouseDown={() => handleSliderInteract(true)}
                                        onMouseUp={() => handleSliderInteract(false)}
                                        onTouchStart={() => handleSliderInteract(true)}
                                        onTouchEnd={() => handleSliderInteract(false)}
                                    />
                                    <MapIcon size={20} color="#666" />
                                </>
                            )}
                        </div>
                    </div>

                    {/* ONBOARDING FLOW */}
                    {onboardingStep === 1 && (
                        <div className="onboarding-overlay">
                            <div className="onboarding-card">
                                <h2 className="onboarding-title">Welcome!</h2>
                                <p className="onboarding-text">Let's set up your local profile.</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        className="auth-input-classic"
                                        style={{ background: '#222', border: '1px solid #444', color: 'white' }}
                                        value={profile?.full_name || ''}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Mobile Number (Optional)"
                                        className="auth-input-classic"
                                        style={{ background: '#222', border: '1px solid #444', color: 'white' }}
                                        value={profile?.mobile || ''}
                                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                                    />
                                    <button
                                        className="auth-btn-primary"
                                        onClick={() => {
                                            if (profile?.full_name?.trim()) {
                                                handleUpdateProfile({ full_name: profile.full_name, mobile: profile.mobile });
                                            }
                                        }}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {onboardingStep === 2 && (
                        <div className="onboarding-overlay">
                            <div className="onboarding-card">
                                <h2 className="onboarding-title">App Tour</h2>
                                <p className="onboarding-text">
                                    Your world is defined by the radius on the right.
                                    Drag the slider to see further or closer.
                                </p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleUpdateProfile({ onboarding_completed: true })}>Skip</button>
                                    <button className="auth-btn-primary" style={{ flex: 1 }} onClick={() => handleUpdateProfile({ onboarding_completed: true })}>Got it!</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SETTINGS MODAL */}
                    {showSettings && (
                        <div className="modal-overlay">
                            <div className="onboarding-card" style={{ position: 'relative' }}>
                                <button className="modal-close" style={{ position: 'absolute', top: '20px', right: '20px' }} onClick={() => setShowSettings(false)}>
                                    <X size={24} />
                                </button>
                                <User size={48} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
                                <h2 style={{ marginBottom: '2rem' }}>Account Details</h2>
                                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                        <div className="user-avatar-btn" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                                            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitial()}
                                        </div>
                                        <div>
                                            <label htmlFor="avatar-upload" className="btn-secondary" style={{ cursor: 'pointer', fontSize: '0.9rem', padding: '8px 12px' }}>
                                                {uploading ? 'Uploading...' : 'Change Photo'}
                                            </label>
                                            <input
                                                type="file"
                                                id="avatar-upload"
                                                accept="image/*"
                                                onChange={handleUploadAvatar}
                                                disabled={uploading}
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#666' }}>Email (Stored)</label>
                                        <div style={{ padding: '12px', background: '#222', borderRadius: '8px', color: '#aaa' }}>{session.user.email}</div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#666' }}>Full Name</label>
                                        <input
                                            type="text"
                                            className="auth-input-classic"
                                            style={{ background: '#222', border: '1px solid #444', color: 'white' }}
                                            value={profile?.full_name || ''}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        />
                                    </div>
                                    <button className="auth-btn-primary" onClick={() => handleUpdateProfile({ full_name: profile?.full_name })}>Save Changes</button>

                                    {!showLogoutConfirm ? (
                                        <button
                                            className="btn-secondary"
                                            onClick={() => setShowLogoutConfirm(true)}
                                            style={{ marginTop: '2.5rem', borderColor: '#444', color: '#888' }}
                                        >
                                            Log Out
                                        </button>
                                    ) : (
                                        <div style={{ marginTop: '2.5rem', padding: '15px', background: 'rgba(210, 85, 78, 0.1)', borderRadius: '12px', border: '1px solid var(--accent-red)' }}>
                                            <p style={{ fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>Are you sure you want to log out?</p>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button className="auth-btn-primary" style={{ flex: 1 }} onClick={handleLogout}>Yes, Log Out</button>
                                                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {showCreatePost && (
                        <CreatePostModal
                            position={position}
                            onClose={() => setShowCreatePost(false)}
                            onPostCreated={() => {
                                setShowCreatePost(false);
                                setFeedTrigger(prev => prev + 1);
                            }}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default App
