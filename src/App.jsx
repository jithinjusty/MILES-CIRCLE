import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { Plus, List, Send, User, Map as MapIcon, X, Image, Camera, Paperclip, Globe, Eye, EyeOff, Edit2, Facebook, Linkedin, Instagram, Youtube, MessageCircle, Phone, MapPin, Share2, ToggleLeft, ToggleRight, ExternalLink, Lock, ShieldCheck, ChevronRight, Mail, Bug, Info, Database, CreditCard } from 'lucide-react'
import './App.css'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase'
import SplashScreen from './components/SplashScreen'
import AuthOverlay from './components/AuthOverlay'
import CreatePostModal from './components/CreatePostModal'

const WhatsAppIcon = ({ size = 16, color = "currentColor", className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.431 5.63 1.432h.006c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill={color} stroke="none" />
    </svg>
);
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
    const [radius, setRadius] = useState(() => {
        const saved = localStorage.getItem('miles_preferred_radius');
        return saved ? parseFloat(saved) : 1;
    });
    const [position, setPosition] = useState(INITIAL_POSITION);
    const [runtimeError, setRuntimeError] = useState(null);
    const [locationAvailable, setLocationAvailable] = useState(false);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState('main'); // main, profile, appearance, security
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
    const [isRecovering, setIsRecovering] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const sliderTimer = useRef(null);
    const watchId = useRef(null);

    const handleSliderInteract = (isStarting) => {
        setIsMapInteracting(isStarting);
        if (sliderTimer.current) clearTimeout(sliderTimer.current);

        if (!isStarting) {
            sliderTimer.current = setTimeout(() => {
                setIsMapInteracting(false);
            }, 500);

            // Persist to profile if logged in
            if (session?.user) {
                supabase.from('profiles').update({ preferred_radius: radius }).eq('id', session.user.id).then();
            }
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

        // Handle recovery mode
        const params = new URLSearchParams(window.location.search);
        if (params.get('type') === 'recovery') {
            setIsRecovering(true);
        }

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

    useEffect(() => {
        localStorage.setItem('miles_preferred_radius', radius.toString());
    }, [radius]);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (data) {
                setProfile(data)
                if (data.theme_mode === 'light') document.body.classList.add('light-mode');
                else document.body.classList.remove('light-mode');

                if (data.preferred_radius) setRadius(parseFloat(data.preferred_radius));
                if (!data.onboarding_completed) setOnboardingStep(1)
            } else if (error && (error.code === 'PGRST116' || error.message.includes('0 rows'))) {
                // Profile doesn't exist yet, trigger onboarding to collect basic info
                setOnboardingStep(1);
            }
        } catch (err) {
            console.error("Profile fetch error:", err);
            // Fallback to onboarding if we can't get profile but have a session
            setOnboardingStep(1);
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

            if (updates.theme_mode) {
                if (updates.theme_mode === 'light') document.body.classList.add('light-mode');
                else document.body.classList.remove('light-mode');
            }

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

    const handleResetPassword = async (e) => {
        if (e) e.preventDefault();
        if (newPassword !== confirmNewPassword) return alert("Passwords do not match");

        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (newPassword.length < 8 || !hasUpper || !hasLower || !hasNumber) {
            return alert("Password must be 8+ chars and include upper, lower, and number.");
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) alert(error.message);
        else {
            alert("Password updated successfully!");
            setIsRecovering(false);
            setNewPassword('');
            setConfirmNewPassword('');
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

    const resetSettings = () => {
        setShowSettings(false);
        setActiveSettingsTab('main');
    }

    const handleRate = async (value) => {
        if (!session || !viewingProfile) return;
        try {
            const { error } = await supabase.from('ratings').insert({
                rater_id: session.user.id,
                rated_id: viewingProfile.id,
                value
            });
            if (error) {
                if (error.code === '23505') alert("You have already rated this user.");
                else throw error;
            } else {
                alert(`You gave ${viewingProfile.full_name} a ${value > 0 ? '+1' : '-1'}!`);
                setViewingProfile(prev => ({ ...prev, points: (prev.points || 0) + value }));
            }
        } catch (err) {
            alert(err.message);
        }
    }

    const handleReport = async () => {
        if (!session || !viewingProfile) return;
        if (!confirm("Are you sure you want to report this profile for inappropriate content?")) return;
        try {
            const { error } = await supabase.from('reports').insert({
                reporter_id: session.user.id,
                reported_id: viewingProfile.id
            });
            if (error) {
                if (error.code === '23505') alert("You have already reported this user.");
                else throw error;
            } else {
                alert("Report submitted. Thank you for keeping Miles Circle safe.");
                setViewingProfile(null);
            }
        } catch (err) {
            alert(err.message);
        }
    }

    return (
        <div className={`app-container ${isMapInteracting ? 'map-mode' : 'chat-mode'} ${profile?.theme_mode === 'light' ? 'light-mode' : ''}`}>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

            {/* Fallback Loader if Splash is gone but Auth is still checking */}
            {!showSplash && authLoading && (
                <div className="locating-overlay" style={{ background: 'var(--panel-bg)' }}>
                    <div className="pulse-circle">
                        <div className="spinner"></div>
                    </div>
                </div>
            )}

            {!showSplash && !authLoading && (
                <>
                    {/* AUTHENTICATION STATE */}
                    {!session && !isRecovering && (
                        <AuthOverlay onInstall={deferredPrompt ? handleInstallClick : null} />
                    )}

                    {/* PASSWORD RECOVERY STATE */}
                    {!session && isRecovering && (
                        <div className="auth-overlay-new">
                            <div className="auth-container anim-fade-in">
                                <div className="brand-header-premium" style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%' }}>
                                    <div className="logo-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                                        <div className="pulse-circle" style={{ width: '64px', height: '64px' }}>
                                            <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="onboarding-card-premium" style={{ width: '100%', maxWidth: '440px' }}>
                                    <div className="onboarding-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                        <div className="pulse-circle" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem' }}>
                                            <ShieldCheck size={40} color="var(--accent-red)" />
                                        </div>
                                        <h2 className="onboarding-title" style={{ fontSize: '1.8rem' }}>Security Protocol</h2>
                                        <p className="onboarding-text">Regain access to your unique circle identity.</p>
                                    </div>
                                    <form onSubmit={handleResetPassword} className="auth-form-classic" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                        <div className="field-block">
                                            <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>New Secret Password</label>
                                            <input type="password" placeholder="Min 8 characters, Upper, Lower, Number" className="auth-input-classic" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white' }} />
                                        </div>
                                        <div className="field-block">
                                            <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Confirm Password</label>
                                            <input type="password" placeholder="Repeat Secret Password" className="auth-input-classic" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white' }} />
                                        </div>
                                        <button type="submit" className="btn-onboarding-next" style={{ marginTop: '1rem' }}>Establish New Credentials</button>
                                        <button type="button" className="nav-item" onClick={() => { setIsRecovering(false); window.history.replaceState({}, '', '/'); }} style={{ justifyContent: 'center', background: 'transparent' }}>Return to Gateway</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LOGGED IN STATES */}
                    {session && (
                        <>
                            {/* ONBOARDING FLOW */}
                            {onboardingStep > 0 && (
                                <div className="onboarding-overlay" style={{ zIndex: 3000 }}>
                                    <div className="brand-header-premium" style={{ textAlign: 'center', marginBottom: '2rem', width: '100%' }}>
                                        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                                            <div className="pulse-circle" style={{ width: '64px', height: '64px' }}>
                                                <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        </div>
                                    </div>
                                    {onboardingStep === 1 && (
                                        <div className="onboarding-card-premium anim-fade-in">
                                            <div className="onboarding-header" style={{ marginBottom: '2.5rem' }}>
                                                <div className="pulse-circle" style={{ width: '60px', height: '60px', marginBottom: '1.5rem' }}>
                                                    <User size={28} color="var(--accent-red)" />
                                                </div>
                                                <h2 className="onboarding-title">Establish Your Presence</h2>
                                                <p className="onboarding-text">Craft your digital persona before entering the circle.</p>
                                            </div>
                                            <div className="onboarding-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                <div className="field-block">
                                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Full Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Alex Rivera"
                                                        value={profile?.full_name || ''}
                                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                                        style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white', outline: 'none' }}
                                                    />
                                                </div>
                                                <div className="field-block">
                                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Mobile Number (Encrypted)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="+1 (555) 000-0000"
                                                        value={profile?.mobile || ''}
                                                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                                                        style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white', outline: 'none' }}
                                                    />
                                                </div>
                                                <button
                                                    className="btn-onboarding-next"
                                                    style={{ marginTop: '1rem' }}
                                                    onClick={() => profile?.full_name?.trim() && handleUpdateProfile({ full_name: profile.full_name, mobile: profile.mobile })}
                                                >
                                                    Complete Initialization
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {onboardingStep === 2 && (
                                        <div className="onboarding-card-premium tour-card">
                                            <div className="tour-steps-indicator">
                                                {[1, 2, 3, 4].map(s => <div key={s} className={`step-dot ${tourStep === s ? 'active' : ''}`}></div>)}
                                            </div>
                                            <div className="tour-content">
                                                {tourStep === 1 && <><Globe size={48} color="var(--accent-red)" /><h3>Your Radius, Your World</h3><p>Miles connects you with people within a specific range. Use the slider on the right to adjust your circle.</p></>}
                                                {tourStep === 2 && <><MessageCircle size={48} color="var(--accent-red)" /><h3>The Local Feed</h3><p>Share updates, photos, and files with everyone in your current radius.</p></>}
                                                {tourStep === 3 && <><MapIcon size={48} color="var(--accent-red)" /><h3>Interactive Proximity</h3><p>The map behind highlights your active zone. You only see messages within that area.</p></>}
                                                {tourStep === 4 && <><Share2 size={48} color="var(--accent-red)" /><h3>Digital Identity</h3><p>Manage your social presence. You can add your digital handles and choose exactly who sees them with the <strong>Public/Private</strong> toggles.</p></>}
                                            </div>
                                            <div className="tour-footer">
                                                <button className="btn-tour-next" onClick={() => tourStep < 4 ? setTourStep(s => s + 1) : handleUpdateProfile({ onboarding_completed: true })}>
                                                    {tourStep < 4 ? 'Next Step' : 'Enter the Circle'}
                                                </button>
                                                <button className="tour-skip" onClick={() => handleUpdateProfile({ onboarding_completed: true })}>Skip Tour</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MAIN APP CONTENT */}
                            {onboardingStep === 0 && (
                                <>
                                    {/* STATUS OVERLAYS */}
                                    {(!locationAvailable || locationError) && (
                                        <div className="locating-overlay anim-fade-in" style={{ zIndex: 9000 }}>
                                            <div className="locating-card-premium">
                                                <div className="brand-header-premium" style={{ textAlign: 'center', marginBottom: '2rem', width: '100%' }}>
                                                    <div className="logo-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                                                        <div className="pulse-circle" style={{ width: '64px', height: '64px' }}>
                                                            <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="status-icon-wrap" style={{ marginBottom: '2rem' }}>
                                                    {locationError ? (
                                                        <div className="icon-badge error" style={{ background: 'rgba(210, 85, 78, 0.1)', color: 'var(--accent-red)' }}>
                                                            <Globe size={48} />
                                                        </div>
                                                    ) : (
                                                        <div className="pulse-circle">
                                                            <MapPin size={40} color="white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: '950' }}>
                                                    {locationError ? 'Signal Lost' : 'Synchronizing Circle'}
                                                </h2>
                                                <p style={{ color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto 2.5rem', lineHeight: '1.6' }}>
                                                    {locationError
                                                        ? 'We can\'t find your coordinates. Proximity authentication requires location access.'
                                                        : "Pinpointing your digital footprint to connect you with the immediate surroundings."}
                                                </p>

                                                {!locationError && (
                                                    <div className="loading-track" style={{ width: '100%', height: '6px', background: 'var(--glass-bg)', borderRadius: '10px', overflow: 'hidden', marginBottom: '2rem' }}>
                                                        <div className="loading-fill-animated" style={{ height: '100%', background: 'var(--accent-red)', width: '60%' }}></div>
                                                    </div>
                                                )}

                                                <div className="status-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                                    <button className="btn-onboarding-next" onClick={() => window.location.reload()}>
                                                        {locationError ? 'Connect and Retry' : 'Check Permission'}
                                                    </button>
                                                    <button
                                                        className="nav-item"
                                                        style={{ justifyContent: 'center', background: 'transparent' }}
                                                        onClick={() => {
                                                            // Failsafe: Set a default location if user is stuck
                                                            setPosition([0, 0]);
                                                            setLocationAvailable(true);
                                                        }}
                                                    >
                                                        Continue with Offline Map
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* MAP LAYER */}
                                    <div className="map-wrapper" style={{ opacity: locationAvailable ? 1 : 0.3, filter: locationAvailable ? 'none' : 'blur(5px)' }}>
                                        {locationAvailable && (
                                            <MapContainer center={position} zoom={13} zoomControl={false} className="map-view">
                                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                                <Marker position={position} />
                                                <Circle center={position} pathOptions={{ color: 'var(--accent-red)', fillColor: 'var(--accent-red)', fillOpacity: 0.1, weight: 2, dashArray: '4, 8' }} radius={radius * 1609.34} />
                                                <MapController center={position} radius={radius} isInteracting={isMapInteracting} />
                                            </MapContainer>
                                        )}
                                    </div>

                                    {/* CHAT LAYER */}
                                    {locationAvailable && (
                                        <div className="chat-interface">
                                            <header className="app-header-new">
                                                <div className="brand-wrap">
                                                    <div className="pulse-circle-mini" style={{ width: '40px', height: '40px', marginRight: '12px' }}>
                                                        <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                    <h1 className="logo-text">MILES <span className="logo-accent">CIRCLE</span></h1>
                                                </div>
                                                <div className="header-actions">
                                                    <div className="user-avatar-btn" onClick={() => setShowSettings(true)}>
                                                        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : getInitial()}
                                                    </div>
                                                </div>
                                            </header>

                                            <div className="chat-center-container" style={{
                                                opacity: isMapInteracting ? 0.3 : 1,
                                                filter: isMapInteracting ? 'blur(12px)' : 'none',
                                                transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                                                pointerEvents: isMapInteracting ? 'none' : 'auto'
                                            }}>
                                                <div className="chat-messages-scroll">
                                                    <Feed
                                                        position={position}
                                                        radius={radius}
                                                        refreshTrigger={feedTrigger}
                                                        session={session}
                                                        onUserClick={async (userId) => {
                                                            if (!userId) return;
                                                            try {
                                                                const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
                                                                if (error) throw error;
                                                                if (data) setViewingProfile(data);
                                                            } catch (err) {
                                                                console.error("Error viewing profile:", err);
                                                            }
                                                        }}
                                                    />
                                                    <div className="system-welcome-card">
                                                        <p className="welcome-tag">Proximity Active</p>
                                                        <p className="welcome-text">Connected to the <strong>{radius} mile</strong> sphere around your current location.</p>
                                                    </div>
                                                </div>

                                                <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
                                                    {showAttachmentMenu && (
                                                        <div className="attachment-menu-popover">
                                                            <button type="button" className="menu-item" onClick={() => handleAttachmentAction('photo')}><div className="menu-icon-circle"><Image size={20} /></div><span>Photos</span></button>
                                                            <button type="button" className="menu-item" onClick={() => handleAttachmentAction('file')}><div className="menu-icon-circle"><Paperclip size={20} /></div><span>Files</span></button>
                                                            <button type="button" className="menu-item" onClick={() => handleAttachmentAction('location')}><div className="menu-icon-circle"><MapIcon size={20} /></div><span>Location</span></button>
                                                        </div>
                                                    )}
                                                    <button type="button" className={`chat-plus-btn ${showAttachmentMenu ? 'active' : ''}`} onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}>
                                                        <Plus size={24} style={{ transform: showAttachmentMenu ? 'rotate(45deg)' : 'none' }} />
                                                    </button>
                                                    <input type="text" className="chat-input-main" placeholder="Message Circle..." value={messageContent} onChange={e => setMessageContent(e.target.value)} disabled={isSending} />
                                                    <button type="submit" className="chat-send-btn-new" disabled={!messageContent.trim() || isSending}>
                                                        {isSending ? <div className="spinner-tiny"></div> : <Send size={18} />}
                                                    </button>
                                                </form>
                                            </div>

                                            <div className={`side-slider-container ${isSliderHidden ? 'collapsed' : ''}`}>
                                                <button className="slider-toggle-btn" onClick={() => setIsSliderHidden(!isSliderHidden)}>
                                                    {isSliderHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                                                </button>
                                                {!isSliderHidden && (
                                                    <div className="slider-controls-wrap">
                                                        <span className="radius-badge">{radius}m</span>
                                                        <input
                                                            type="range"
                                                            className="range-vertical"
                                                            min="0.5"
                                                            max="50"
                                                            step="0.5"
                                                            value={radius}
                                                            onChange={e => setRadius(parseFloat(e.target.value))}
                                                            onMouseDown={() => handleSliderInteract(true)}
                                                            onMouseUp={() => handleSliderInteract(false)}
                                                            onTouchStart={() => handleSliderInteract(true)}
                                                            onTouchEnd={() => handleSliderInteract(false)}
                                                            style={{ '--range-percent': `${((radius - 0.5) / 49.5) * 100}%` }}
                                                        />
                                                        <span className="slider-label-vertical">Distance</span>
                                                        <MapIcon size={20} color="var(--text-secondary)" style={{ marginTop: '10px', opacity: 0.5 }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* SETTINGS MODAL */}
                                    {showSettings && (
                                        <div className="modal-overlay">
                                            <div className="settings-card-premium">
                                                <aside className="settings-sidebar">
                                                    <div className="sidebar-header">
                                                        <div className="pulse-circle-mini" style={{ width: '24px', height: '24px', marginBottom: '8px' }}>
                                                            <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                        </div>
                                                        <span className="logo-badge" style={{ fontSize: '0.5rem' }}>CIRCLE</span>
                                                    </div>
                                                    <nav className="settings-nav">
                                                        <button className={`nav-item ${activeSettingsTab === 'main' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('main')}><User size={20} /> <span>Profile Identity</span></button>
                                                        <button className={`nav-item ${activeSettingsTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('appearance')}><Globe size={20} /> <span>Appearance</span></button>
                                                        <button className={`nav-item ${activeSettingsTab === 'security' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('security')}><ShieldCheck size={20} /> <span>Security</span></button>
                                                        <button className={`nav-item ${activeSettingsTab === 'data' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('data')}><Database size={20} /> <span>Data Control</span></button>
                                                        <button className={`nav-item ${activeSettingsTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('subscription')}><CreditCard size={20} /> <span>Subscription</span></button>
                                                        <button className={`nav-item ${activeSettingsTab === 'about' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('about')}><Info size={20} /> <span>About Us</span></button>
                                                        <button className={`nav-item ${activeSettingsTab === 'bug' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('bug')}><Bug size={20} /> <span>Report Bug</span></button>
                                                        <button className="nav-item signout" onClick={() => setShowLogoutConfirm(true)}><ExternalLink size={20} /> <span>Sign Out</span></button>
                                                    </nav>
                                                    <button className="settings-close-sidebar" onClick={resetSettings}>Close Settings</button>
                                                </aside>

                                                <main className="settings-main-content">
                                                    <button className="btn-close-settings-top" onClick={() => setShowSettings(false)}><X size={24} /></button>
                                                    {activeSettingsTab === 'main' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Profile Identity</h2><p>Manage how you appear in the circle.</p></div>
                                                            <div className="avatar-section-hero">
                                                                <div className="avatar-large-preview" onClick={() => document.getElementById('avatar-upload').click()}>
                                                                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : getInitial()}
                                                                    <div className="avatar-edit-icon"><Camera size={20} /></div>
                                                                </div>
                                                                <input type="file" id="avatar-upload" hidden accept="image/*" onChange={handleUploadAvatar} />
                                                                <div className="avatar-hero-info"><h3>{profile?.full_name || 'Anonymous User'}</h3><p>{session.user.email}</p></div>
                                                            </div>
                                                            <div className="settings-form-grid">
                                                                <div className="field-block"><label>Full Name</label><input type="text" value={profile?.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} /></div>
                                                                <div className="field-block full-width">
                                                                    <label>Bio / Status</label>
                                                                    <textarea
                                                                        placeholder="Tell the circle about yourself..."
                                                                        value={profile?.bio || ''}
                                                                        onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                                                        style={{ width: '100%', height: '100px', background: '#000', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white', padding: '14px', outline: 'none', resize: 'none' }}
                                                                    />
                                                                </div>
                                                                <div className="field-block privacy">
                                                                    <label>Location Display</label>
                                                                    <div className="input-wrap">
                                                                        <input type="text" placeholder="Lighthouse Ave" value={profile?.address || ''} onChange={e => setProfile({ ...profile, address: e.target.value })} />
                                                                        <button className={`privacy-toggle-text ${profile?.address_public ? 'on' : 'off'}`} onClick={() => setProfile({ ...profile, address_public: !profile?.address_public })}>{profile.address_public ? 'PUBLIC' : 'PRIVATE'}</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="social-links-manager">
                                                                <h4>Digital Presence</h4>
                                                                {['facebook', 'linkedin', 'instagram', 'youtube', 'whatsapp'].map(key => (
                                                                    <div key={key} className="social-row">
                                                                        <div className="social-input-wrap">
                                                                            <span className={`social-icon-tag color-${key}`}>
                                                                                {key === 'facebook' && <Facebook size={16} />}
                                                                                {key === 'linkedin' && <Linkedin size={16} />}
                                                                                {key === 'instagram' && <Instagram size={16} />}
                                                                                {key === 'youtube' && <Youtube size={16} />}
                                                                                {key === 'whatsapp' && <WhatsAppIcon size={16} color="#25D366" />}
                                                                            </span>
                                                                            <input type="text" placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} ${key === 'whatsapp' ? 'Number' : 'Link'}`} value={profile[`${key}_url`] || profile[`${key}_number`] || ''} onChange={e => setProfile({ ...profile, [`${key}_${key === 'whatsapp' ? 'number' : 'url'}`]: e.target.value })} />
                                                                        </div>
                                                                        <button className={`privacy-toggle-text ${profile[`${key}_public`] ? 'on' : 'off'}`} onClick={() => setProfile({ ...profile, [`${key}_public`]: !profile[`${key}_public`] })}>{profile[`${key}_public`] ? 'PUBLIC' : 'PRIVATE'}</button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="panel-actions"><button className="btn-save-settings" onClick={() => handleUpdateProfile(profile)} disabled={isSavingChanges}>{isSavingChanges ? 'Syncing...' : 'Save Changes'}</button></div>
                                                        </div>
                                                    )}

                                                    {activeSettingsTab === 'appearance' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Visual Experience</h2><p>Tailor the miles interface to your preference.</p></div>
                                                            <div className="appearance-grid">
                                                                <div className="appearance-card">
                                                                    <div className="card-info"><h4>Theme Mode</h4><p>Switch between light and dark aesthetics.</p></div>
                                                                    <div className="theme-toggle-strip">
                                                                        <button className={`theme-tab ${profile?.theme_mode !== 'light' ? 'active' : ''}`} onClick={() => handleUpdateProfile({ theme_mode: 'dark' })}><Lock size={16} /> Dark</button>
                                                                        <button className={`theme-tab ${profile?.theme_mode === 'light' ? 'active' : ''}`} onClick={() => handleUpdateProfile({ theme_mode: 'light' })}><Globe size={16} /> Light</button>
                                                                    </div>
                                                                </div>
                                                                {/* Potential point/color choices can go here */}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeSettingsTab === 'security' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Security & Privacy</h2><p>Manage your credentials and account safety.</p></div>
                                                            <form onSubmit={handleResetPassword} className="security-form">
                                                                <div className="field-block"><label>New Secret Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></div>
                                                                <div className="field-block"><label>Confirm Secret Password</label><input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required /></div>
                                                                <button type="submit" className="btn-security-update">Update Password</button>
                                                            </form>
                                                        </div>
                                                    )}

                                                    {activeSettingsTab === 'data' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Data Control</h2><p>Manage your account data and privacy rights.</p></div>
                                                            <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                                                <div className="appearance-card">
                                                                    <div className="card-info"><h4>Export Personal Data</h4><p>Download a full archive of your posts and profile information.</p></div>
                                                                    <button className="btn-auth-premium" style={{ width: 'auto', padding: '12px 24px' }}>Request Export</button>
                                                                </div>
                                                                <div className="appearance-card" style={{ border: '1px solid rgba(255, 0, 0, 0.2)' }}>
                                                                    <div className="card-info"><h4>Circle Exclusion (Delete Account)</h4><p>Permanently remove your digital footprint from Miles Circle. This cannot be undone.</p></div>
                                                                    <button className="btn-tour-next" style={{ width: 'auto', padding: '12px 24px', background: 'rgba(210, 85, 78, 0.1)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)' }}>Delete My Account</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeSettingsTab === 'subscription' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Subscription</h2><p>Premium features and billing information.</p></div>
                                                            <div className="onboarding-card-premium" style={{ maxWidth: 'none', background: '#000', borderStyle: 'dashed' }}>
                                                                <Lock size={32} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
                                                                <h3>Status: Not for Public</h3>
                                                                <p>Subscription tiered access is currently restricted to early alpha testers.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeSettingsTab === 'about' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>About Miles Circle</h2><p>Version 1.0.4 Alpha - Building real-world proximity.</p></div>
                                                            <div className="policy-content" style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                                                                <p>Miles Circle is a proximity-based social network designed to bridge the gap between digital interaction and real-world presence. We believe the people physically closest to you should be the easiest to connect with.</p>
                                                                <p>Headquartered in the digital sphere, 2026.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeSettingsTab === 'bug' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Report a Bug</h2><p>Help us calibrate the circle for everyone.</p></div>
                                                            <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                                                <div className="field-block">
                                                                    <label>Issue Description</label>
                                                                    <textarea
                                                                        placeholder="What happened? Please describe the steps to reproduce..."
                                                                        style={{ width: '100%', height: '150px', background: '#000', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white', padding: '14px' }}
                                                                    />
                                                                </div>
                                                                <button className="btn-save-settings" onClick={() => alert("Bug report submitted. Our engineers are investigating.")}>Submit Report</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </main>
                                            </div>

                                            {showLogoutConfirm && (
                                                <div className="confirm-overlay"><div className="confirm-card"><h3>End Session?</h3><p>You will be disconnected from the circle.</p><div className="confirm-actions"><button className="btn-confirm-yes" onClick={handleLogout}>Disconnect</button><button className="btn-confirm-no" onClick={() => setShowLogoutConfirm(false)}>Stay Connected</button></div></div></div>
                                            )}
                                        </div>
                                    )}

                                    {/* PROFILE VIEWER MODAL */}
                                    {viewingProfile && (
                                        <div className="modal-overlay" onClick={() => setViewingProfile(null)}>
                                            <div className="profile-viewer-card premium" onClick={e => e.stopPropagation()}>
                                                <header className="viewer-header-new">
                                                    <div className="viewer-avatar-wrap">
                                                        {viewingProfile.avatar_url ? <img src={viewingProfile.avatar_url} alt="" /> : (viewingProfile.full_name || '?')[0].toUpperCase()}
                                                    </div>
                                                    <h2 className="viewer-name">{viewingProfile.full_name || 'Circle Member'}</h2>
                                                    <p className="viewer-joined">Radius Citizen</p>
                                                </header>
                                                <div className="viewer-stats">
                                                    <div className="stat-item"><span className="stat-val">{viewingProfile.points || 0}</span><span className="stat-lbl">Points</span></div>
                                                    <div className="stat-sep" />
                                                    <div className="stat-item"><span className="stat-val">Active</span><span className="stat-lbl">Status</span></div>
                                                </div>
                                                {viewingProfile.bio && (
                                                    <div className="viewer-bio-section" style={{ background: '#000', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--glass-border)', marginBottom: '1.5rem', textAlign: 'left' }}>
                                                        <h4 style={{ fontSize: '0.7rem', color: 'var(--accent-red)', marginBottom: '8px', textTransform: 'uppercase' }}>Biography</h4>
                                                        <p style={{ color: 'white', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>{viewingProfile.bio}</p>
                                                    </div>
                                                )}
                                                <div className="viewer-info-rows">
                                                    {viewingProfile.address_public && viewingProfile.address && <div className="viewer-info-row"><MapPin size={16} color="var(--accent-red)" /> <span>{viewingProfile.address}</span></div>}
                                                    {viewingProfile.mobile_public && viewingProfile.mobile && <div className="viewer-info-row"><Phone size={16} color="var(--accent-red)" /> <span>{viewingProfile.mobile}</span></div>}
                                                </div>
                                                <div className="viewer-social-links">
                                                    {['facebook', 'linkedin', 'instagram', 'youtube', 'whatsapp'].map(key => {
                                                        const url = key === 'whatsapp' ? (viewingProfile.whatsapp_number ? `https://wa.me/${viewingProfile.whatsapp_number.replace(/\D/g, '')}` : null) : viewingProfile[`${key}_url`];
                                                        return viewingProfile[`${key}_public`] && url && (
                                                            <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className={`viewer-social-icon ${key}`}>
                                                                {key === 'facebook' && <Facebook size={18} />}
                                                                {key === 'linkedin' && <Linkedin size={18} />}
                                                                {key === 'instagram' && <Instagram size={18} />}
                                                                {key === 'youtube' && <Youtube size={18} />}
                                                                {key === 'whatsapp' && <WhatsAppIcon size={18} color="#25D366" />}
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                                <div className="viewer-actions-row">
                                                    <button className="btn-rate up" onClick={() => handleRate(1)}><ShieldCheck size={20} /> Like</button>
                                                    <button className="btn-rate down" onClick={() => handleRate(-1)}><X size={20} /> Dislike</button>
                                                    <button className="btn-report" onClick={handleReport}><Lock size={20} /> Report</button>
                                                </div>
                                                <button className="btn-viewer-close" onClick={() => setViewingProfile(null)}>Dismiss</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* PHOTO EDITOR */}
                                    {selectedFile && <PhotoEditor file={selectedFile} onSave={handleSaveEditedPhoto} onCancel={() => setSelectedFile(null)} />}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default App;
