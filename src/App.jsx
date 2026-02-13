import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { Plus, List, Send, User, Map as MapIcon, X, Image, Camera, Paperclip, Globe, Eye, EyeOff, Edit2, Facebook, Linkedin, Instagram, Youtube, MessageCircle, Phone, MapPin, Share2, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'
import './App.css'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase'
import SplashScreen from './components/SplashScreen'
import AuthOverlay from './components/AuthOverlay'
import CreatePostModal from './components/CreatePostModal'
import Feed from './components/Feed'
import PhotoEditor from './components/PhotoEditor'

const INITIAL_POSITION = null; // No default location, must be detected

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
    const [tourStep, setTourStep] = useState(1);
    const [feedTrigger, setFeedTrigger] = useState(0);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSliderHidden, setIsSliderHidden] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [viewingProfile, setViewingProfile] = useState(null);
    const [isSavingChanges, setIsSavingChanges] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
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
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );
        } else {
            setLocationError("NOT_SUPPORTED");
        }
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBanner(false);
        }
    };

    useEffect(() => {
        console.log("App mounted, checking session...");
        try {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
        } catch (e) { console.error("Leaflet fix failed", e); }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        });

        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            if (s) fetchProfile(s.user.id);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            if (s) fetchProfile(s.user.id);
            else { setProfile({}); setOnboardingStep(0); }
            setAuthLoading(false);
        });

        // Location setup
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
        setIsSavingChanges(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', session.user.id)

            if (error) throw error;

            setProfile({ ...profile, ...updates })
            if (updates.onboarding_completed) setOnboardingStep(0)
            else if (onboardingStep === 1) setOnboardingStep(2)

            // If explicit save from settings, close modal and ensure we are in chat mode (feed)
            if (!updates.onboarding_completed && onboardingStep === 0) {
                setShowSettings(false);
                setIsMapInteracting(false);
            }
        } catch (err) {
            console.error("Profile update failed:", err);
            alert("Failed to save changes: " + err.message);
        } finally {
            setIsSavingChanges(false);
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

    const handleUploadAvatar = (event) => {
        if (!event.target.files || event.target.files.length === 0) return;
        setSelectedFile(event.target.files[0]);
    };

    const handleSaveEditedPhoto = async (blob) => {
        try {
            setUploading(true);
            setSelectedFile(null); // Close editor

            const fileExt = 'jpg';
            const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob);

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

            {!showSplash && !authLoading && !session && (
                <AuthOverlay onInstall={deferredPrompt ? handleInstallClick : null} />
            )}

            {!showSplash && !authLoading && session && (
                <>
                    {/* LOCATING BUFFER */}
                    {!locationAvailable && !locationError && (
                        <div className="locating-overlay">
                            <div className="locating-content">
                                <div className="pulse-circle">
                                    <MapPin size={40} color="var(--accent-red)" />
                                </div>
                                <h2>Identifying your Circle...</h2>
                                <p>We're pinpointing your coordinates to connect you with those nearby.</p>
                                <div className="loading-bar-wrap">
                                    <div className="loading-bar-fill"></div>
                                </div>
                                <button
                                    onClick={() => window.location.reload()}
                                    style={{ marginTop: '20px', background: 'transparent', border: '1px solid #444', color: '#888', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                    Stuck? Tap to Refresh
                                </button>
                            </div>
                        </div>
                    )}

                    {/* LOCATION ERROR */}
                    {locationError && (
                        <div className="locating-overlay">
                            <div className="locating-content error">
                                <Globe size={48} color="var(--accent-red)" />
                                <h2>Location Access Required</h2>
                                <p>
                                    Miles relies on your proximity to function.
                                    Please ensure location permissions are granted and GPS is active.
                                </p>
                                <button className="auth-btn-primary" onClick={() => window.location.reload()}>
                                    Retry Connection
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MAP BACKGROUND */}
                    <div className="map-wrapper" style={{ position: 'absolute', inset: 0, opacity: locationAvailable ? 1 : 0.3, filter: locationAvailable ? 'none' : 'blur(5px)' }}>
                        {locationAvailable && (
                            <MapContainer center={position} zoom={13} zoomControl={false} className="map-view">
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <Marker position={position} />
                                <Circle
                                    center={position}
                                    pathOptions={{ color: '#D2554E', fillColor: '#D2554E', fillOpacity: 0.1, weight: 2, dashArray: '4, 8' }}
                                    radius={radius * 1609.34}
                                />
                                <MapController center={position} radius={radius} isInteracting={isMapInteracting} />
                            </MapContainer>
                        )}
                    </div>

                    {/* FOREGROUND UI - ONLY SHOW IF LOCATION READY */}
                    {locationAvailable && (
                        <div className="chat-interface">
                            <header className="app-header-new">
                                <h1 style={{ color: 'var(--accent-red)', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>MILES</h1>
                                <div className="user-avatar-btn" onClick={() => setShowSettings(true)} style={{ width: '36px', height: '36px' }}>
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Profile" />
                                    ) : getInitial()}
                                </div>
                            </header>

                            <div className="chat-center-container">
                                <div className="chat-messages-scroll">
                                    <Feed
                                        position={position}
                                        radius={radius}
                                        refreshTrigger={feedTrigger}
                                        session={session}
                                        onUserClick={(userId) => {
                                            supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => {
                                                if (data) setViewingProfile(data);
                                            });
                                        }}
                                    />
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
                                    <div className="slider-controls-wrap">
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
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ONBOARDING FLOW */}
                    {onboardingStep === 1 && (
                        <div className="onboarding-overlay" style={{ zIndex: 3000 }}>
                            <div className="onboarding-card-premium">
                                <div className="onboarding-header">
                                    <div className="icon-badge" style={{ background: 'var(--accent-red)', color: 'white', padding: '10px', borderRadius: '12px', marginBottom: '15px' }}><User size={24} /></div>
                                    <h2 className="onboarding-title" style={{ color: 'white', fontSize: '1.5rem', marginBottom: '8px' }}>Welcome to the Circle</h2>
                                    <p className="onboarding-text" style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '25px' }}>Let's craft your digital identity before you explore.</p>
                                </div>
                                <div className="onboarding-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div className="input-group-premium">
                                        <label style={{ display: 'block', color: '#666', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Full Name</label>
                                        <input
                                            type="text"
                                            placeholder="John Doe"
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', color: 'white', outline: 'none' }}
                                            value={profile?.full_name || ''}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group-premium">
                                        <label style={{ display: 'block', color: '#666', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Mobile Number (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="+1 234 567 890"
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', color: 'white', outline: 'none' }}
                                            value={profile?.mobile || ''}
                                            onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        className="btn-onboarding-next"
                                        style={{ background: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', transition: 'all 0.3s' }}
                                        onClick={() => {
                                            if (profile?.full_name?.trim()) {
                                                handleUpdateProfile({ full_name: profile.full_name, mobile: profile.mobile });
                                            }
                                        }}
                                    >
                                        Establish Persona
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {onboardingStep === 2 && (
                        <div className="onboarding-overlay" style={{ zIndex: 3000 }}>
                            <div className="onboarding-card-premium tour-card" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px', width: '90%', maxWidth: '450px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                <div className="tour-steps-indicator" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
                                    {[1, 2, 3, 4].map(s => (
                                        <div key={s} className={`step-dot ${tourStep === s ? 'active' : ''}`} style={{ width: tourStep === s ? '24px' : '8px', height: '8px', borderRadius: '4px', background: tourStep === s ? 'var(--accent-red)' : '#333', transition: 'all 0.3s' }}></div>
                                    ))}
                                </div>

                                {tourStep === 1 && (
                                    <div className="tour-content anim-fade-in">
                                        <div className="tour-icon-wrap" style={{ color: 'var(--accent-red)', marginBottom: '20px' }}><Globe size={48} /></div>
                                        <h3 style={{ color: 'white', marginBottom: '12px' }}>Your Radius, Your World</h3>
                                        <p style={{ color: '#888', lineHeight: '1.6' }}>Miles connects you with people within a specific range. Use the slider on the right to adjust your circle from 0.5 to 50 miles.</p>
                                    </div>
                                )}

                                {tourStep === 2 && (
                                    <div className="tour-content anim-fade-in">
                                        <div className="tour-icon-wrap" style={{ color: 'var(--accent-red)', marginBottom: '20px' }}><MessageCircle size={48} /></div>
                                        <h3 style={{ color: 'white', marginBottom: '12px' }}>The Local Feed</h3>
                                        <p style={{ color: '#888', lineHeight: '1.6' }}>Share updates, photos, and files with everyone in your current radius. Every message is a beacon in your local community.</p>
                                    </div>
                                )}

                                {tourStep === 3 && (
                                    <div className="tour-content anim-fade-in">
                                        <div className="tour-icon-wrap" style={{ color: 'var(--accent-red)', marginBottom: '20px' }}><MapIcon size={48} /></div>
                                        <h3 style={{ color: 'white', marginBottom: '12px' }}>Interactive Proximity</h3>
                                        <p style={{ color: '#888', lineHeight: '1.6' }}>The map behind the chat highlights your active zone. You'll only receive and send messages within that defined area.</p>
                                    </div>
                                )}

                                {tourStep === 4 && (
                                    <div className="tour-content anim-fade-in">
                                        <div className="tour-icon-wrap" style={{ color: 'var(--accent-red)', marginBottom: '20px' }}><Share2 size={48} /></div>
                                        <h3 style={{ color: 'white', marginBottom: '12px' }}>Digital Identity</h3>
                                        <p style={{ color: '#888', lineHeight: '1.6' }}>Enhance your profile with social links. Control exactly what others see with our granular privacy toggles.</p>
                                    </div>
                                )}

                                <div className="tour-footer" style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {tourStep < 4 ? (
                                        <button className="btn-tour-next" style={{ background: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setTourStep(prev => prev + 1)}>
                                            Next Step
                                        </button>
                                    ) : (
                                        <button className="btn-onboarding-next" style={{ background: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleUpdateProfile({ onboarding_completed: true })}>
                                            Enter the Circle
                                        </button>
                                    )}
                                    <button className="tour-skip" style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => handleUpdateProfile({ onboarding_completed: true })}>Skip Tour</button>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* SETTINGS MODAL */}
                    {showSettings && (
                        <div className="modal-overlay">
                            <div className="settings-card-premium">
                                <header className="modal-header-premium">
                                    <div className="header-info">
                                        <User size={24} color="var(--accent-red)" />
                                        <h2>Manage Identity</h2>
                                    </div>
                                    <button className="modal-close-btn" onClick={() => setShowSettings(false)}>
                                        <X size={24} />
                                    </button>
                                </header>

                                <div className="settings-content-scroll">
                                    {/* PHOTO SECTION */}
                                    <section className="settings-section">
                                        <div className="avatar-edit-large">
                                            <div className="avatar-preview-wrap" onClick={() => document.getElementById('avatar-upload').click()}>
                                                {profile?.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="Profile" />
                                                ) : getInitial()}
                                                <div className="edit-overlay"><Camera size={20} /></div>
                                            </div>
                                            <div className="avatar-info">
                                                <h3>{profile?.full_name || 'Your Persona'}</h3>
                                                <p>{session.user.email}</p>
                                            </div>
                                            <input type="file" id="avatar-upload" accept="image/*" onChange={handleUploadAvatar} style={{ display: 'none' }} />
                                        </div>
                                    </section>

                                    {/* BASIC INFO */}
                                    <section className="settings-section">
                                        <h4 className="section-title">Personal Details</h4>
                                        <div className="input-with-privacy">
                                            <div className="field-group">
                                                <label>Full Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter your name"
                                                    value={profile?.full_name || ''}
                                                    onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="input-with-privacy">
                                            <div className="field-group">
                                                <label>Address</label>
                                                <input
                                                    type="text"
                                                    placeholder="Lighthouse Avenue, Circle Bay"
                                                    value={profile?.address || ''}
                                                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                className={`privacy-toggle ${profile?.address_public ? 'public' : 'private'}`}
                                                onClick={() => setProfile({ ...profile, address_public: !profile?.address_public })}
                                                title={profile?.address_public ? "Public" : "Private"}
                                            >
                                                {profile?.address_public ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                        </div>
                                        <div className="input-with-privacy">
                                            <div className="field-group">
                                                <label>Mobile Number</label>
                                                <input
                                                    type="text"
                                                    placeholder="+1 234 567 890"
                                                    value={profile?.mobile || ''}
                                                    onChange={e => setProfile({ ...profile, mobile: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                className={`privacy-toggle ${profile?.mobile_public ? 'public' : 'private'}`}
                                                onClick={() => setProfile({ ...profile, mobile_public: !profile?.mobile_public })}
                                                title={profile?.mobile_public ? "Public" : "Private"}
                                            >
                                                {profile?.mobile_public ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                        </div>
                                    </section>

                                    {/* SOCIAL SECTION */}
                                    <section className="settings-section">
                                        <h4 className="section-title">Digital Presence</h4>
                                        {[
                                            { id: 'facebook', icon: <Facebook size={18} />, label: 'Facebook URL' },
                                            { id: 'linkedin', icon: <Linkedin size={18} />, label: 'LinkedIn URL' },
                                            { id: 'instagram', icon: <Instagram size={18} />, label: 'Instagram URL' },
                                            { id: 'youtube', icon: <Youtube size={18} />, label: 'YouTube URL' },
                                            { id: 'whatsapp', icon: <MessageCircle size={18} />, label: 'WhatsApp Number' }
                                        ].map(social => (
                                            <div className="input-with-privacy" key={social.id}>
                                                <div className="field-group">
                                                    <div className="label-with-icon">{social.icon} <span>{social.label}</span></div>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter account link"
                                                        value={profile?.[`${social.id}_url`] || profile?.[`${social.id}_number`] || ''}
                                                        onChange={e => setProfile({ ...profile, [`${social.id}_${social.id === 'whatsapp' ? 'number' : 'url'}`]: e.target.value })}
                                                    />
                                                </div>
                                                <button
                                                    className={`privacy-toggle ${profile?.[`${social.id}_public`] ? 'public' : 'private'}`}
                                                    onClick={() => setProfile({ ...profile, [`${social.id}_public`]: !profile?.[`${social.id}_public`] })}
                                                    title={profile?.[`${social.id}_public`] ? "Public" : "Private"}
                                                >
                                                    {profile?.[`${social.id}_public`] ? <Eye size={18} /> : <EyeOff size={18} />}
                                                </button>
                                            </div>
                                        ))}
                                    </section>

                                    {/* ACTIONS */}
                                    <div className="settings-footer">
                                        <button className="btn-logout-stylish" onClick={() => setShowLogoutConfirm(true)}>
                                            <div className="btn-glow"></div>
                                            <span>Sign Out</span>
                                        </button>
                                        <button
                                            className="btn-save-premium"
                                            onClick={() => handleUpdateProfile(profile)}
                                            disabled={isSavingChanges}
                                        >
                                            {isSavingChanges ? <div className="spinner-small"></div> : 'Commit Changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* LOGOUT CONFIRM SUB-MODAL */}
                            {showLogoutConfirm && (
                                <div className="confirm-overlay">
                                    <div className="confirm-card">
                                        <h3>End Session?</h3>
                                        <p>You will be disconnected from the circle.</p>
                                        <div className="confirm-actions">
                                            <button className="btn-confirm-yes" onClick={handleLogout}>Disconnect</button>
                                            <button className="btn-confirm-no" onClick={() => setShowLogoutConfirm(false)}>Stay Connected</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PUBLIC PROFILE VIEWER MODAL */}
                    {viewingProfile && (
                        <div className="modal-overlay" onClick={() => setViewingProfile(null)}>
                            <div className="profile-viewer-card" onClick={e => e.stopPropagation()}>
                                <button className="modal-close-simple" onClick={() => setViewingProfile(null)}><X size={20} /></button>

                                <div className="viewer-header">
                                    <div className="viewer-avatar-large">
                                        {viewingProfile.avatar_url ? (
                                            <img src={viewingProfile.avatar_url} alt="" />
                                        ) : (viewingProfile.full_name || '?')[0].toUpperCase()}
                                    </div>
                                    <h2>{viewingProfile.full_name || 'Circle Member'}</h2>
                                </div>

                                <div className="viewer-content">
                                    {viewingProfile.address_public && viewingProfile.address && (
                                        <div className="info-item">
                                            <MapPin size={18} />
                                            <span>{viewingProfile.address}</span>
                                        </div>
                                    )}
                                    {viewingProfile.mobile_public && viewingProfile.mobile && (
                                        <div className="info-item">
                                            <Phone size={18} />
                                            <span>{viewingProfile.mobile}</span>
                                        </div>
                                    )}

                                    <div className="social-grid-viewer">
                                        {[
                                            { id: 'facebook', icon: <Facebook />, url: viewingProfile.facebook_url },
                                            { id: 'linkedin', icon: <Linkedin />, url: viewingProfile.linkedin_url },
                                            { id: 'instagram', icon: <Instagram />, url: viewingProfile.instagram_url },
                                            { id: 'youtube', icon: <Youtube />, url: viewingProfile.youtube_url },
                                            { id: 'whatsapp', icon: <MessageCircle />, url: viewingProfile.whatsapp_number ? `https://wa.me/${viewingProfile.whatsapp_number.replace(/\D/g, '')}` : null }
                                        ].map(social => (
                                            viewingProfile[`${social.id}_public`] && social.url && (
                                                <a
                                                    key={social.id}
                                                    href={social.url.startsWith('http') ? social.url : `https://${social.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`social-link-btn ${social.id}`}
                                                >
                                                    {social.icon}
                                                </a>
                                            )
                                        ))}
                                    </div>
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

                    {selectedFile && (
                        <PhotoEditor
                            file={selectedFile}
                            onSave={handleSaveEditedPhoto}
                            onCancel={() => setSelectedFile(null)}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default App
