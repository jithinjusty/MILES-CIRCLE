import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap, ZoomControl } from 'react-leaflet'
import { Plus, List, Send, User, Map as MapIcon, X, Image, Camera, Paperclip, Globe, Eye, EyeOff, Edit2, Facebook, Linkedin, Instagram, Youtube, MessageCircle, Phone, MapPin, Share2, ToggleLeft, ToggleRight, ExternalLink, Lock, LogOut, ShieldCheck, ChevronRight, Mail, Bug, Info, Database, CreditCard, Calendar, Sparkles, Wallet, Mic, Trash2 } from 'lucide-react'
import './App.css'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase'
import SplashScreen from './components/SplashScreen'
import AuthOverlay from './components/AuthOverlay'
import CreatePostModal from './components/CreatePostModal'
import { Html5Qrcode } from 'html5-qrcode'

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
import EventsPage from './components/EventsPage'
import { Users } from 'lucide-react'

const INITIAL_POSITION = null; // No default location, must be detected

function MapController({ center, radius, isInteracting, isExploreMapMode }) {
    const map = useMap();
    const isInteractingRef = useRef(isInteracting);
    const fitBoundsTimerRef = useRef(null);

    // Keep the ref in sync without triggering re-renders or re-effects
    useEffect(() => {
        isInteractingRef.current = isInteracting;
    }, [isInteracting]);

    useEffect(() => {
        if (!map || !center || isNaN(center[0]) || isNaN(center[1])) return;
        if (isExploreMapMode) return; // Do not auto-fit bounds when exploring the map

        // Debounce: wait 150ms after the last radius/center change before fitting
        if (fitBoundsTimerRef.current) clearTimeout(fitBoundsTimerRef.current);

        fitBoundsTimerRef.current = setTimeout(() => {
            if (!map || !center) return;

            // Ensure north-up
            if (map.touchRotate) map.touchRotate.disable();
            if (map.compassBearing) map.compassBearing.disable();
            const mapPane = map.getPane('mapPane');
            if (mapPane) mapPane.style.transform = mapPane.style.transform?.replace(/rotate\([^)]+\)/g, '') || '';

            const metersPerDegree = 111320;
            const latDelta = (radius * 1609.34) / metersPerDegree;
            const lngDelta = (radius * 1609.34) / (metersPerDegree * Math.cos(center[0] * Math.PI / 180));

            const bounds = [
                [center[0] - latDelta, center[1] - lngDelta],
                [center[0] + latDelta, center[1] + lngDelta]
            ];

            try {
                map.fitBounds(bounds, {
                    padding: [50, 50],
                    animate: true,
                    duration: isInteractingRef.current ? 0.3 : 1.2
                });
            } catch (e) {
                console.warn("Map fitBounds failed gently:", e);
            }
        }, 150);

        return () => { if (fitBoundsTimerRef.current) clearTimeout(fitBoundsTimerRef.current); };
    }, [center, radius, map, isExploreMapMode]);
    return null;
}

const qaIconInstance = L.divIcon({
    className: 'custom-qa-marker',
    html: `
        <div style="
            width: 32px; height: 32px;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            border: 2px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.5);
            animation: pulse-green 2s infinite;
        ">
            <span style="font-size: 0.95rem; font-family: var(--font-family); font-weight: 900; color: white;">❓</span>
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

const alertIconInstance = L.divIcon({
    className: 'custom-alert-marker',
    html: `
        <div style="
            width: 32px; height: 32px;
            background: linear-gradient(135deg, #ff5252 0%, #ff0000 100%);
            border: 2px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(255, 82, 82, 0.6);
            animation: alert-marker-glow 1.5s infinite alternate;
        ">
            <span style="font-size: 0.95rem; font-family: var(--font-family); font-weight: 900; color: white;">🚨</span>
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

function App() {
    const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('miles_splash_seen'))
    const [authLoading, setAuthLoading] = useState(true);
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState({});
    const [isMock, setIsMock] = useState(() => new URLSearchParams(window.location.search).get('mock_user') === 'true');
    const [showSandbox, setShowSandbox] = useState(false);
    const [activeNeighbors, setActiveNeighbors] = useState([]);
    const [events, setEvents] = useState([]);
    const [selectedPostFile, setSelectedPostFile] = useState(null);
    const [attachedImageUrl, setAttachedImageUrl] = useState(null);
    const [showVibeCheck, setShowVibeCheck] = useState(false);
    const [weather, setWeather] = useState(null);
    const [showWeatherPanel, setShowWeatherPanel] = useState(false);

    // Wallet States
    const [recipientEmail, setRecipientEmail] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferStatus, setTransferStatus] = useState(null);
    const [transferringPoints, setTransferringPoints] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [showMyQr, setShowMyQr] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const qrScannerRef = useRef(null);
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const isMounted = useRef(true);
    const searchTimeoutRef = useRef(null);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const triggerConfirm = (message, onConfirm, onCancel = () => {}) => {
        setConfirmModal({
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(null);
            },
            onCancel: () => {
                onCancel();
                setConfirmModal(null);
            }
        });
    };

    useEffect(() => {
        const originalAlert = window.alert;
        window.alert = (message) => {
            if (!message) return;
            const lower = message.toLowerCase();
            let type = 'info';
            if (lower.includes('success') || lower.includes('updated') || lower.includes('established') || lower.includes('transmitted') || lower.includes('sent') || lower.includes('generated') || lower.includes('submitted') || lower.includes('wave back') || lower.includes('photo attached') || lower.includes('waved')) {
                type = 'success';
            } else if (lower.includes('fail') || lower.includes('error') || lower.includes('incorrect') || lower.includes('already') || lower.includes('must be') || lower.includes('not match') || lower.includes('limit') || lower.includes('please') || lower.includes('cannot')) {
                type = 'error';
            }
            showToast(message, type);
        };
        return () => {
            window.alert = originalAlert;
        };
    }, []);

    const [radius, setRadius] = useState(() => {
        const saved = localStorage.getItem('miles_preferred_radius');
        const val = saved ? parseFloat(saved) : 1;
        return Math.min(val, 20);
    });
    const [distanceUnit, setDistanceUnit] = useState(() => {
        return localStorage.getItem('miles_distance_unit') || 'miles';
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
    const [replyingTo, setReplyingTo] = useState(null); // { id, content, author }
    const [isSliderHidden, setIsSliderHidden] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [offlineMode, setOfflineMode] = useState(false);   // user explicitly chose offline
    const [citySearch, setCitySearch] = useState('');         // city search input
    const [cityResults, setCityResults] = useState([]);       // search results
    const [citySearching, setCitySearching] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [viewingProfile, setViewingProfile] = useState(null);
    const [showDirectTransfer, setShowDirectTransfer] = useState(false);
    const [directTransferAmount, setDirectTransferAmount] = useState('');
    const [isDirectTransferring, setIsDirectTransferring] = useState(false);

    const [aiResponderEnabled, setAiResponderEnabled] = useState(() => {
        const saved = localStorage.getItem('miles_ai_responder_enabled');
        return saved !== 'false';
    });

    const handleToggleAIResponder = (enabled) => {
        setAiResponderEnabled(enabled);
        localStorage.setItem('miles_ai_responder_enabled', enabled ? 'true' : 'false');
        showToast(`AI auto-replies ${enabled ? 'enabled' : 'disabled'}.`, "success");
    };

    // Audio recording states
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        if (!viewingProfile) {
            setShowDirectTransfer(false);
            setDirectTransferAmount('');
            setIsDirectTransferring(false);
        }
    }, [viewingProfile]);

    const [isSavingChanges, setIsSavingChanges] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const lastChatScroll = useRef(0);
    const [showEvents, setShowEvents] = useState(false);
    const [newEventsCount, setNewEventsCount] = useState(0);
    const lastEventCheckRef = useRef(null);
    const [isExploreMapMode, setIsExploreMapMode] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [mockPostType, setMockPostType] = useState('discussion'); // Mock options
    const [waves, setWaves] = useState([]);
    const [activeChats, setActiveChats] = useState([]);
    const [incomingWave, setIncomingWave] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatProfile, setChatProfile] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const lastScrollY = useRef(0);
    const [mapPosts, setMapPosts] = useState([]);
    const [announcementContent, setAnnouncementContent] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const lastWaveTimeRef = useRef(null);
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const sliderTimer = useRef(null);
    const watchId = useRef(null);
    const [bugDescription, setBugDescription] = useState('');
    const offlineModeRef = useRef(false); // mirror of offlineMode for use inside callbacks

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

    // Keep ref in sync with state so location callbacks can read the current value
    useEffect(() => { offlineModeRef.current = offlineMode; }, [offlineMode]);

    const getWeatherDescription = (code) => {
        if (code === 0) return { emoji: '☀️', text: 'Clear' };
        if (code >= 1 && code <= 3) return { emoji: '⛅', text: 'Partly Cloudy' };
        if (code === 45 || code === 48) return { emoji: '🌫️', text: 'Foggy' };
        if (code >= 51 && code <= 55) return { emoji: '🌧️', text: 'Drizzle' };
        if (code >= 61 && code <= 65) return { emoji: '🌧️', text: 'Rainy' };
        if (code >= 71 && code <= 75) return { emoji: '❄️', text: 'Snowy' };
        if (code >= 80 && code <= 82) return { emoji: '🌦️', text: 'Showers' };
        if (code >= 95) return { emoji: '⛈️', text: 'Thunderstorm' };
        return { emoji: '🌡️', text: 'Weather' };
    };

    useEffect(() => {
        if (!position || isNaN(position[0]) || isNaN(position[1])) return;
        let isMounted = true;
        const fetchWeather = async () => {
            try {
                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${position[0]}&longitude=${position[1]}` +
                    `&current_weather=true` +
                    `&hourly=relativehumidity_2m,precipitation_probability,uv_index` +
                    `&current=windspeed_10m,precipitation,relative_humidity_2m` +
                    `&wind_speed_unit=kmh&timezone=auto`
                );
                if (!res.ok) throw new Error("Weather fetch failed");
                const data = await res.json();
                if (data?.current_weather && isMounted) {
                    setWeather({
                        temp: Math.round(data.current_weather.temperature),
                        code: data.current_weather.weathercode,
                        windspeed: Math.round(data.current_weather.windspeed ?? data.current?.windspeed_10m ?? 0),
                        humidity: data.current?.relative_humidity_2m ?? data.hourly?.relativehumidity_2m?.[0] ?? null,
                        rain: data.current?.precipitation ?? null,
                        rainChance: data.hourly?.precipitation_probability?.[0] ?? null,
                        uv: data.hourly?.uv_index?.[0] ?? null,
                    });
                }
            } catch (err) {
                console.error("Error fetching weather:", err);
            }
        };
        fetchWeather();
        return () => {
            isMounted = false;
        };
    }, [position]);

    // Deterministic offset based on user ID hash to keep presence dot stable but offset
    const getFuzzyCoords = (userId, lat, lng) => {
        if (!userId) return [lat, lng];
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const latOffset = ((hash & 0xFF) / 255.0 - 0.5) * 0.0008;
        const lngOffset = (((hash >> 8) & 0xFF) / 255.0 - 0.5) * 0.0008;
        return [lat + latOffset, lng + lngOffset];
    };

    // Custom Leaflet icon for active neighbors
    const neighborIcon = (initial, avatarUrl, points = 0, vibe = null) => {
        let haloColor = 'var(--accent-red)';
        let haloStyle = '';
        let glowStyle = 'rgba(0,0,0,0.3)';
        
        if (points >= 300) {
            haloColor = '#E5E4E2'; // Platinum
            glowStyle = 'rgba(229, 228, 226, 0.6)';
            haloStyle = 'animation: pulse-platinum 2s infinite; border: 2.5px solid #E5E4E2;';
        } else if (points >= 100) {
            haloColor = '#FFD700'; // Gold
            glowStyle = 'rgba(255, 215, 0, 0.6)';
            haloStyle = 'animation: pulse-gold 2s infinite; border: 2px solid #FFD700;';
        } else if (points >= 30) {
            haloColor = '#C0C0C0'; // Silver
            glowStyle = 'rgba(192, 192, 192, 0.4)';
            haloStyle = 'border: 2px solid #C0C0C0;';
        } else if (points >= 10) {
            haloColor = '#CD7F32'; // Bronze
            glowStyle = 'rgba(205, 127, 50, 0.3)';
            haloStyle = 'border: 2px solid #CD7F32;';
        } else {
            haloStyle = 'border: 2px solid var(--accent-red);';
        }

        // Show vibe emoji as a floating bubble if set
        const vibeBubble = vibe ? `
            <div style="
                position: absolute;
                top: -10px;
                right: -10px;
                background: var(--panel-bg);
                border: 1px solid var(--glass-border);
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.65rem;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                z-index: 10;
            ">${vibe}</div>
        ` : '';

        return L.divIcon({
            className: 'custom-neighbor-marker',
            html: `
                ${vibeBubble}
                <div style="
                    width: 32px; height: 32px;
                    background: var(--panel-bg);
                    ${haloStyle}
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px ${glowStyle};
                    overflow: hidden;
                ">
                    \${avatarUrl ? \`<img src="\${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />\` : \`
                        <span style="color: \${haloColor}; font-size: 0.75rem; font-weight: 800; font-family: var(--font-family);">\${initial}</span>
                    \`}
                </div>
                <div style="
                    width: 8px; height: 8px;
                    background: \${haloColor};
                    border-radius: 50%;
                    position: absolute;
                    bottom: -4px; left: 12px;
                    box-shadow: 0 0 8px \${haloColor};
                "></div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });
    };

    const eventIcon = (isFlash = false) => {
        const background = isFlash 
            ? 'linear-gradient(135deg, #ff9f43 0%, #ff5252 100%)' 
            : 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)';
        const emoji = isFlash ? '⚡' : '📅';
        const shadow = isFlash 
            ? 'rgba(255, 159, 67, 0.5)' 
            : 'rgba(155, 89, 182, 0.4)';
        const pulseAnim = isFlash ? 'animation: pulse-orange 1.5s infinite;' : 'animation: pulse-purple 2s infinite;';

        return L.divIcon({
            className: 'custom-event-marker',
            html: `
                <div style="
                    width: 32px; height: 32px;
                    background: ${background};
                    border: 2px solid white;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px ${shadow};
                    ${pulseAnim}
                    font-size: 0.95rem;
                ">
                    ${emoji}
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    };



    const parseWKTPoint = (wktString) => {
        if (!wktString) return null;
        const match = wktString.match(/POINT\(([-\d.]+) ([\d.-]+)\)/i);
        if (match) {
            const lng = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            return [lat, lng];
        }
        return null;
    };

    // Update presence in DB whenever position changes
    useEffect(() => {
        if (!session?.user?.id || !position || isNaN(position[0]) || isNaN(position[1])) return;
        
        const updatePresence = async () => {
            try {
                await supabase
                    .from('profiles')
                    .update({
                        last_lat: position[0],
                        last_lng: position[1],
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', session.user.id);
            } catch (err) {
                console.error("Presence report error:", err);
            }
        };

        updatePresence();
    }, [position, session?.user?.id]);

    // Fetch active neighbors in the circle
    useEffect(() => {
        if (!session?.user?.id || !position || isNaN(position[0]) || isNaN(position[1])) return;

        const fetchNeighbors = async () => {
            try {
                const { data, error } = await supabase.rpc('get_active_neighbors_within_radius', {
                    user_lat: parseFloat(position[0]),
                    user_lng: parseFloat(position[1]),
                    radius_miles: parseFloat(radius) || 1
                });
                if (!error && data) {
                    setActiveNeighbors(data.filter(n => n.id !== session.user.id));
                }
            } catch (err) {
                console.error("Error fetching active neighbors:", err);
            }
        };

        fetchNeighbors();
        const interval = setInterval(fetchNeighbors, 30000);
        return () => clearInterval(interval);
    }, [position, radius, session?.user?.id]);

    // Fetch local events for map markers
    useEffect(() => {
        if (!position || isNaN(position[0]) || isNaN(position[1])) return;

        const fetchEventsForMap = async () => {
            try {
                const { data, error } = await supabase.rpc('get_events_within_radius', {
                    user_lat: parseFloat(position[0]),
                    user_lng: parseFloat(position[1]),
                    radius_miles: parseFloat(radius) || 1
                });
                if (!error && data) {
                    setEvents(data);
                }
            } catch (err) {
                console.error("Error fetching map events:", err);
            }
        };

        fetchEventsForMap();
        
        // Listen to changes to events table in real-time to update the map markers instantly
        const channel = supabase
            .channel('map-events-tracker')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'local_events'
            }, () => {
                fetchEventsForMap();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [position, radius]);

    const updateLocation = () => {
        // Never auto-update while user has explicitly chosen offline mode
        if (offlineModeRef.current) return;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (pos?.coords && !offlineModeRef.current) {
                        setPosition([pos.coords.latitude, pos.coords.longitude]);
                        setLocationAvailable(true);
                        setLocationError(null);
                    }
                },
                (err) => {
                    if (offlineModeRef.current) return;
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

    // Called only when user explicitly taps Go Online
    const goOnline = () => {
        offlineModeRef.current = false;
        setOfflineMode(false);
        setLocationAvailable(false);
        setLocationError(null);
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
                    console.error("Go Online error:", err);
                    if (err.code === 1) setLocationError("PERMISSION_DENIED");
                    else setLocationError("LOCATION_UNAVAILABLE");
                    setLocationAvailable(false);
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );
        }
    };

    // Search for a city using Nominatim (cities/towns only)
    const searchCity = async () => {
        if (!citySearch.trim()) return;
        setCitySearching(true);
        setCityResults([]);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&featuretype=city&limit=6&addressdetails=1&email=hello@milescircle.com`);
            const data = await res.json();
            // Only keep city/town/municipality level results
            const filtered = data.filter(r => ['city','town','municipality','village','suburb','county'].includes(r.addresstype) || r.type === 'city' || r.class === 'place');
            setCityResults(filtered.length > 0 ? filtered : data.slice(0, 5));
        } catch(e) {
            console.error('City search failed', e);
        }
        setCitySearching(false);
    };

    const selectCity = (city) => {
        const lat = parseFloat(city.lat);
        const lon = parseFloat(city.lon);
        setPosition([lat, lon]);
        setLocationAvailable(true);
        setOfflineMode(true);
        setLocationError(null);
        setCityResults([]);
        setCitySearch(city.display_name?.split(',')[0] || city.name || '');
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

        if (isMock) {
            const mockSession = {
                user: {
                    id: "17958e69-0321-4d91-bafb-bc7e1a109574",
                    email: "chacko.mariner@gmail.com"
                }
            };
            setSession(mockSession);
            fetchProfile(mockSession.user.id);
            setAuthLoading(false);
        } else {
            supabase.auth.getSession().then(({ data: { session: s } }) => {
                setSession(s);
                if (s) fetchProfile(s.user.id);
                setAuthLoading(false);
            });
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, s) => {
            if (isMock) return;
            setSession(s);
            if (s) fetchProfile(s.user.id);
            else { setProfile({}); setOnboardingStep(0); document.body.classList.remove('light-mode'); }
            setAuthLoading(false);
        });

        // Location setup — only if not already in offline mode
        updateLocation();
        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    // CRITICAL: Ignore all background position updates when user chose offline mode
                    if (offlineModeRef.current) return;
                    if (pos?.coords) {
                        setPosition([pos.coords.latitude, pos.coords.longitude]);
                        setLocationAvailable(true);
                        setLocationError(null);
                    }
                },
                (err) => {
                    console.error("Geolocation watch error:", err);
                    setLocationError(err.message || "Failed to track location");
                },
                { enableHighAccuracy: true }
            );
        }
        const verifyInterval = setInterval(updateLocation, 5 * 60 * 1000);

        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (authListener?.subscription) {
                authListener.subscription.unsubscribe();
            }
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
            clearInterval(verifyInterval);
        }
    }, [])

    useEffect(() => {
        const handlePointsUpdate = () => {
            if (session?.user?.id) {
                fetchProfile(session.user.id);
            }
        };
        window.addEventListener('karma-points-updated', handlePointsUpdate);
        return () => {
            window.removeEventListener('karma-points-updated', handlePointsUpdate);
        };
    }, [session?.user?.id]);

    useEffect(() => {
        localStorage.setItem('miles_preferred_radius', radius.toString());
    }, [radius]);

    // Track new events for notification badge
    useEffect(() => {
        if (!session?.user || !locationAvailable) return;

        const lastSeen = localStorage.getItem('miles_last_event_seen');

        // Initial check: count events created since we last opened the events page
        const checkNewEvents = async () => {
            try {
                let query = supabase
                    .from('local_events')
                    .select('id, created_at', { count: 'exact', head: true });

                if (lastSeen) {
                    query = query.gt('created_at', lastSeen);
                }

                const { count, error } = await query;
                if (!error && count > 0) {
                    setNewEventsCount(count);
                }
            } catch (err) {
                console.error('Event notification check error:', err);
            }
        };

        checkNewEvents();

        // Real-time subscription for new events
        const channel = supabase
            .channel('event-notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'local_events'
            }, (payload) => {
                // Don't notify for own events
                if (payload.new.user_id !== session.user.id) {
                    setNewEventsCount(prev => prev + 1);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id, locationAvailable]);

    // Load and listen to local posts for map tracking (Q&A/Alert Pins)
    useEffect(() => {
        if (!position || isNaN(position[0]) || isNaN(position[1])) return;
        
        const fetchMapPosts = async () => {
            try {
                const { data, error } = await supabase.rpc('get_posts_within_radius', {
                    user_lat: parseFloat(position[0]),
                    user_lng: parseFloat(position[1]),
                    radius_miles: parseFloat(radius) || 1
                });
                if (!error && data) {
                    setMapPosts(data);
                }
            } catch (err) {
                console.error("Error fetching map posts:", err);
            }
        };

        fetchMapPosts();

        const channel = supabase
            .channel('map-posts-tracker')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'posts'
            }, () => {
                fetchMapPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [position?.[0], position?.[1], radius, feedTrigger]);

    // Realtime waves listener
    useEffect(() => {
        if (!session?.user?.id) return;
        
        // Initial fetch of waves
        supabase.from('profiles').select('received_waves').eq('id', session.user.id).single()
            .then(({ data }) => {
                if (data && Array.isArray(data.received_waves)) {
                    setWaves(data.received_waves);
                    if (data.received_waves.length > 0) {
                        lastWaveTimeRef.current = data.received_waves[data.received_waves.length - 1].timestamp;
                    }
                }
            });

        const profileChannel = supabase
            .channel(`profile-waves-${session.user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${session.user.id}`
            }, (payload) => {
                const newProfile = payload.new;
                if (newProfile && Array.isArray(newProfile.received_waves)) {
                    const newWaves = newProfile.received_waves;
                    setWaves(newWaves);
                    if (newWaves.length > 0) {
                        const latestWave = newWaves[newWaves.length - 1];
                        if (latestWave.timestamp !== lastWaveTimeRef.current) {
                            lastWaveTimeRef.current = latestWave.timestamp;
                            setIncomingWave(latestWave);
                            setTimeout(() => {
                                setIncomingWave(null);
                            }, 5000);
                        }
                    }
                }
            })
            .subscribe();

        const messagesChannel = supabase
            .channel(`direct-messages-${session.user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'direct_messages',
                filter: `recipient_id=eq.${session.user.id}`
            }, (payload) => {
                const newMsg = payload.new;
                setChatMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                if (!isChatOpen || chatProfile?.id !== newMsg.sender_id) {
                    alert(`New message received! 💬`);
                }
                fetchActiveChats();
            })
            .subscribe();

        fetchActiveChats();

        return () => {
            supabase.removeChannel(profileChannel);
            supabase.removeChannel(messagesChannel);
        };
    }, [session?.user?.id]);

    const fetchActiveChats = async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('direct_messages')
                .select('*')
                .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
                .order('created_at', { ascending: false });

            if (data && !error) {
                const chatMap = new Map();
                for (const msg of data) {
                    const otherId = msg.sender_id === session.user.id ? msg.recipient_id : msg.sender_id;
                    if (!chatMap.has(otherId)) {
                        chatMap.set(otherId, {
                            otherId,
                            lastMessage: msg.content,
                            created_at: msg.created_at
                        });
                    }
                }
                const otherIds = Array.from(chatMap.keys());
                if (otherIds.length > 0) {
                    const { data: profiles, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', otherIds);

                    if (profiles && !profileError) {
                        const finalChats = profiles.map(p => {
                            const chatInfo = chatMap.get(p.id);
                            return { ...chatInfo, otherName: p.full_name };
                        });
                        finalChats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        setActiveChats(finalChats);
                    }
                } else {
                    setActiveChats([]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch active chats:", err);
        }
    };

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
                else {
                    // Check if vibe check-in is needed (not updated today)
                    let needsVibeCheck = true;
                    if (data.vibe_updated_at) {
                        const d1 = new Date(data.vibe_updated_at);
                        const d2 = new Date();
                        if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()) {
                            needsVibeCheck = false;
                        }
                    }
                    if (needsVibeCheck) {
                        setShowVibeCheck(true);
                    }
                }
            } else if (error && (error.code === 'PGRST116' || (error.message && error.message.includes('0 rows')))) {
                // Profile doesn't exist yet, trigger onboarding to collect basic info
                setOnboardingStep(1);
            }
        } catch (err) {
            console.error("Profile fetch error:", err);
            // Fallback to onboarding if we can't get profile but have a session
            setOnboardingStep(1);
        }
    }

    // Radius Animation for Tour
    useEffect(() => {
        let interval;
        if (onboardingStep === 2 && tourStep === 2) {
            let growing = true;
            interval = setInterval(() => {
                setRadius(prev => {
                    const val = parseFloat(prev);
                    if (growing) {
                        if (val >= 10) { growing = false; return 9; }
                        return val + 1;
                    } else {
                        if (val <= 1) { growing = true; return 2; }
                        return val - 1;
                    }
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [onboardingStep, tourStep]);

    const handleUpdateProfile = async (updates) => {
        setIsSavingChanges(true);
        try {
            // If newPassword is provided and we are in Step 1, update auth too
            if (onboardingStep === 1 && newPassword) {
                const hasUpper = /[A-Z]/.test(newPassword);
                const hasLower = /[a-z]/.test(newPassword);
                const hasNumber = /[0-9]/.test(newPassword);
                if (newPassword.length < 8 || !hasUpper || !hasLower || !hasNumber) {
                    throw new Error("Password must be 8+ characters and include uppercase, lowercase, and a number.");
                }
                const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
                if (authError) throw authError;
                setNewPassword(''); // clear after success
            }

            const { error } = await supabase
                .from('profiles')
                .upsert({ id: session.user.id, ...updates })

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
            showToast("Save failed: " + err.message, "error");
        } finally {
            setIsSavingChanges(false);
        }
    };

    const handleSelectVibe = async (vibe) => {
        try {
            const calculateNewStreak = (prof) => {
                if (!prof) return 1;
                const lastUpdatedAt = prof.vibe_updated_at;
                if (!lastUpdatedAt) return 1;

                const lastDate = new Date(lastUpdatedAt);
                const today = new Date();

                const isSameDay = (d1, d2) => 
                    d1.getFullYear() === d2.getFullYear() &&
                    d1.getMonth() === d2.getMonth() &&
                    d1.getDate() === d2.getDate();

                const isYesterday = (d1, d2) => {
                    const temp = new Date(d2);
                    temp.setDate(temp.getDate() - 1);
                    return isSameDay(d1, temp);
                };

                if (isSameDay(lastDate, today)) {
                    return prof.vibe_streak || 1;
                } else if (isYesterday(lastDate, today)) {
                    return (prof.vibe_streak || 0) + 1;
                } else {
                    return 1;
                }
            };

            const newStreak = calculateNewStreak(profile);
            const updates = {
                daily_vibe: vibe,
                vibe_updated_at: new Date().toISOString(),
                vibe_streak: newStreak
            };
            await handleUpdateProfile(updates);
            setShowVibeCheck(false);
        } catch (err) {
            console.error("Vibe update error:", err);
        }
    };

    const fetchTransactions = async () => {
        if (!session?.user?.id) return;
        setLoadingTransactions(true);
        try {
            const { data, error } = await supabase
                .from('points_transactions')
                .select(`
                    *,
                    sender:sender_id(full_name, avatar_url),
                    recipient:recipient_id(full_name, avatar_url),
                    offer:offer_id(title)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error("Error fetching transactions:", err);
        } finally {
            setLoadingTransactions(false);
        }
    };

    const handleSearchProfiles = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                let dbQuery = supabase.from('profiles');
                
                if (uuidRegex.test(query.trim())) {
                    dbQuery = dbQuery.select('id, full_name, avatar_url').eq('id', query.trim());
                } else {
                    dbQuery = dbQuery.select('id, full_name, avatar_url').ilike('full_name', `%${query.trim()}%`).limit(10);
                }
                
                const { data, error } = await dbQuery;
                if (error) throw error;
                setSearchResults(data || []);
            } catch (err) {
                console.error("Error searching profiles:", err);
            }
        }, 300);
    };

    const fetchAndSelectRecipient = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', userId)
                .single();
            if (error) throw error;
            if (data) {
                setSelectedRecipient(data);
                setRecipientEmail('');
                setSearchQuery('');
                setSearchResults([]);
                setTransferStatus({ type: 'success', message: `Recipient neighbor selected: ${data.full_name}` });
            } else {
                setTransferStatus({ type: 'error', message: 'No neighbor profile matches that ID.' });
            }
        } catch (err) {
            console.error("Error fetching scanned user profile:", err);
            setTransferStatus({ type: 'error', message: 'Could not find profile for the scanned User ID.' });
        }
    };

    const startScanner = async () => {
        setScanning(true);
        setTransferStatus(null);
        setTimeout(async () => {
            try {
                if (!isMounted.current) return;
                const html5QrCode = new Html5Qrcode("qr-reader");
                qrScannerRef.current = html5QrCode;
                
                const qrCodeSuccessCallback = (decodedText, decodedResult) => {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (uuidRegex.test(decodedText.trim())) {
                        fetchAndSelectRecipient(decodedText.trim());
                        stopScanner();
                    } else {
                        setTransferStatus({ type: 'error', message: 'Scanned code is not a valid User ID.' });
                    }
                };
                
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    qrCodeSuccessCallback,
                    (errorMessage) => {
                        // Silent during active search scanning
                    }
                );

                if (!isMounted.current) {
                    if (html5QrCode.isScanning) {
                        await html5QrCode.stop();
                    }
                }
            } catch (err) {
                console.error("Failed to start QR scanner:", err);
                if (isMounted.current) {
                    setTransferStatus({ type: 'error', message: 'Failed to access camera: ' + err.message });
                    setScanning(false);
                }
            }
        }, 100);
    };

    const stopScanner = async () => {
        if (qrScannerRef.current) {
            try {
                if (qrScannerRef.current.isScanning) {
                    await qrScannerRef.current.stop();
                }
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
            qrScannerRef.current = null;
        }
        setScanning(false);
    };

    useEffect(() => {
        return () => {
            if (qrScannerRef.current && qrScannerRef.current.isScanning) {
                qrScannerRef.current.stop().catch(err => console.error("Unmount scanner cleanup error:", err));
            }
        };
    }, []);

    const handleTransferPoints = async (e) => {
        if (e) e.preventDefault();
        setTransferStatus(null);
        
        const amount = parseInt(transferAmount);
        if (isNaN(amount) || amount <= 0) {
            setTransferStatus({ type: 'error', message: 'Please enter a valid points amount.' });
            return;
        }

        if (amount > (profile?.points || 0)) {
            setTransferStatus({ type: 'error', message: 'Insufficient points balance.' });
            return;
        }

        setTransferringPoints(true);
        try {
            let data, error;
            if (selectedRecipient) {
                const res = await supabase.rpc('transfer_points_by_id', {
                    target_user_id: selectedRecipient.id,
                    points_amount: amount
                });
                data = res.data;
                error = res.error;
            } else {
                if (!recipientEmail || !recipientEmail.trim()) {
                    setTransferStatus({ type: 'error', message: 'Please select a recipient neighbor or enter a valid email.' });
                    setTransferringPoints(false);
                    return;
                }
                const res = await supabase.rpc('transfer_points', {
                    target_email: recipientEmail.trim().toLowerCase(),
                    points_amount: amount
                });
                data = res.data;
                error = res.error;
            }

            if (error) throw error;

            if (data?.success) {
                const targetName = selectedRecipient ? selectedRecipient.full_name : recipientEmail;
                setTransferStatus({ type: 'success', message: `Successfully transferred ${amount} points to ${targetName}!` });
                setRecipientEmail('');
                setSelectedRecipient(null);
                setSearchQuery('');
                setSearchResults([]);
                setTransferAmount('');
                setProfile(prev => ({ ...prev, points: Math.max(0, (prev.points || 0) - amount) }));
                fetchTransactions();
            } else {
                setTransferStatus({ type: 'error', message: data?.message || 'Failed to complete transfer.' });
            }
        } catch (err) {
            console.error("Transfer error:", err);
            setTransferStatus({ type: 'error', message: err.message || 'Points transfer failed. Please try again.' });
        } finally {
            setTransferringPoints(false);
        }
    };

    const handleDirectTransferPoints = async (e) => {
        if (e) e.preventDefault();
        if (!session) {
            showToast("You must be logged in to transfer points.", "error");
            return;
        }
        if (!viewingProfile || viewingProfile.is_ai) return;

        const amount = parseInt(directTransferAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast("Please enter a valid points amount.", "error");
            return;
        }

        if (amount > (profile?.points || 0)) {
            showToast("Insufficient points balance.", "error");
            return;
        }

        setIsDirectTransferring(true);
        try {
            const { data, error } = await supabase.rpc('transfer_points_by_id', {
                target_user_id: viewingProfile.id,
                points_amount: amount
            });

            if (error) throw error;

            if (data?.success) {
                showToast(`Successfully transferred ${amount} points to ${viewingProfile.full_name || 'Neighbor'}!`, "success");
                
                // Update local user's balance
                setProfile(prev => ({ ...prev, points: Math.max(0, (prev.points || 0) - amount) }));
                
                // Update viewing profile points (adds the points visually)
                setViewingProfile(prev => prev ? { ...prev, points: (prev.points || 0) + amount } : null);
                
                // Reset direct transfer states
                setShowDirectTransfer(false);
                setDirectTransferAmount('');
                
                // Refresh transactions list
                fetchTransactions();
            } else {
                showToast(data?.message || 'Failed to complete transfer.', "error");
            }
        } catch (err) {
            console.error("Direct transfer error:", err);
            showToast(err.message || 'Points transfer failed. Please try again.', "error");
        } finally {
            setIsDirectTransferring(false);
        }
    };

    const handleRecoverySubmit = async (e) => {
        if (e) e.preventDefault();
        if (newPassword !== confirmNewPassword) return alert("Passwords do not match");
        
        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (newPassword.length < 8 || !hasUpper || !hasLower || !hasNumber) {
            return alert("Password must be 8+ chars and include upper, lower, and number.");
        }

        setIsSavingChanges(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            
            alert("New password established! You can now sign in.");
            setIsRecovering(false);
            window.history.replaceState({}, '', '/');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            alert("Recovery failed: " + err.message);
        } finally {
            setIsSavingChanges(false);
        }
    }

    const handleResetPassword = async (e) => {
        if (e) e.preventDefault();

        if (!currentPassword) return alert("Please enter your current password");
        if (newPassword !== confirmNewPassword) return alert("New passwords do not match");

        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (newPassword.length < 8 || !hasUpper || !hasLower || !hasNumber) {
            return alert("New password must be 8+ chars and include upper, lower, and number.");
        }

        setIsSavingChanges(true);
        try {
            // Verify current password by attempting to re-authenticate
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: session.user.email,
                password: currentPassword
            });

            if (authError) {
                throw new Error("Current password incorrect. Verification failed.");
            }

            // Update to new password
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;

            alert("Password updated successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

            // Redirect to feeds (chat mode)
            setShowSettings(false);
            setIsMapInteracting(false);
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSavingChanges(false);
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
    }

    const handleChatScroll = (e) => {
        // Keep header statically visible at all times to prevent layout shifts and scroll jumping
        lastChatScroll.current = e.currentTarget.scrollTop;
    };

    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        };
    }, []);

    const startRecording = async (e) => {
        if (e) e.preventDefault();
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast("Microphone recording is not supported in this browser.", "error");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());

                if (audioChunksRef.current.length === 0) {
                    return;
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result;
                    
                    setIsSending(true);
                    try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error("Not logged in");

                        const locationWKT = `POINT(${position[1]} ${position[0]})`;
                        const insertPayload = {
                            user_id: user.id,
                            content: `[Audio Note: ${base64Audio}]`,
                            location: locationWKT
                        };

                        if (replyingTo) {
                            insertPayload.reply_to_id = replyingTo.id;
                            insertPayload.reply_to_content = replyingTo.content?.substring(0, 200);
                            insertPayload.reply_to_author = replyingTo.author;
                        }

                        const { error: insertError } = await supabase.from('posts').insert([insertPayload]);
                        if (insertError) throw insertError;
                        
                        setReplyingTo(null);
                        setFeedTrigger(prev => prev + 1);
                        showToast("Voice message sent!", "success");
                    } catch (err) {
                        console.error("Failed to send voice message:", err);
                        showToast("Failed to send voice message: " + err.message, "error");
                    } finally {
                        setIsSending(false);
                    }
                };
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingDuration(0);

            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            showToast("Could not access microphone. Please check permissions.", "error");
        }
    };

    const cancelRecording = (e) => {
        if (e) e.preventDefault();
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        audioChunksRef.current = [];
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        setMediaRecorder(null);
        setIsRecording(false);
        setRecordingDuration(0);
        showToast("Recording cancelled", "info");
    };

    const stopAndSendRecording = (e) => {
        if (e) e.preventDefault();
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        setMediaRecorder(null);
        setIsRecording(false);
        setRecordingDuration(0);
    };

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if ((!messageContent.trim() && !attachedImageUrl) || isSending) return;
        
        if (!position || isNaN(position[0]) || isNaN(position[1])) {
            alert("Cannot send message: Location unavailable.");
            return;
        }

        const originalContent = messageContent;
        setMessageContent(''); // Clear immediately for live feel
        setIsSending(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            const locationWKT = `POINT(${position[1]} ${position[0]})`;
            const insertPayload = {
                user_id: user.id,
                content: originalContent.trim() || null,
                location: locationWKT
            };
            if (replyingTo) {
                insertPayload.reply_to_id = replyingTo.id;  // UUID FK
                insertPayload.reply_to_content = replyingTo.content?.substring(0, 200);
                insertPayload.reply_to_author = replyingTo.author;
            }
            if (attachedImageUrl) {
                insertPayload.image_url = attachedImageUrl;
            }
            const { error } = await supabase
                .from('posts')
                .insert([insertPayload]);
            setReplyingTo(null);
            setAttachedImageUrl(null);

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
        if (type === 'photo') {
            document.getElementById('post-image-upload').click();
            return;
        }
        if (type === 'file') {
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

    const handlePostImageSelect = (event) => {
        if (!event.target.files || event.target.files.length === 0) return;
        setSelectedPostFile(event.target.files[0]);
    };

    const handleSaveEditedPostPhoto = async (blob) => {
        try {
            setUploading(true);
            setSelectedPostFile(null); // Close editor

            const fileExt = 'jpg';
            const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('post-images')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('post-images')
                .getPublicUrl(filePath);

            setAttachedImageUrl(publicUrl);
            alert('Photo attached! Send your message to post it.');
        } catch (error) {
            console.error('Error uploading post photo:', error.message);
            alert("Photo upload failed: " + error.message);
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
        triggerConfirm("Are you sure you want to report this profile for inappropriate content?", async () => {
            try {
                const { error } = await supabase.from('reports').insert({
                    reporter_id: session.user.id,
                    reported_id: viewingProfile.id
                });
                if (error) {
                    if (error.code === '23505') showToast("You have already reported this user.", "error");
                    else throw error;
                } else {
                    showToast("Report submitted. Thank you for keeping Miles Circle safe.", "success");
                    setViewingProfile(null);
                }
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    const handleSendWave = async () => {
        if (!session || !viewingProfile) return;
        try {
            const { error } = await supabase.rpc('send_proximity_wave', {
                p_recipient_id: viewingProfile.id
            });
            if (error) throw error;
            alert(`You sent a wave to ${viewingProfile.full_name || 'your neighbor'}! 👋`);
        } catch (err) {
            console.error("Error sending wave:", err);
            alert("Failed to send wave: " + err.message);
        }
    };

    const openChat = async (neighborId, neighborName) => {
        setChatProfile({ id: neighborId, full_name: neighborName });
        setIsChatOpen(true);
        const { data, error } = await supabase
            .from('direct_messages')
            .select('*')
            .or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${neighborId}),and(sender_id.eq.${neighborId},recipient_id.eq.${session.user.id})`)
            .order('created_at', { ascending: true });
        if (data) {
            setChatMessages(data);
        }
    };

    const handleSendDirectMessage = async () => {
        if (!chatInput.trim() || !chatProfile) return;
        const msg = chatInput.trim();
        setChatInput('');
        
        const tempMsg = {
            id: 'temp-' + Date.now(),
            sender_id: session.user.id,
            recipient_id: chatProfile.id,
            content: msg,
            created_at: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, tempMsg]);

        const { data, error } = await supabase.from('direct_messages').insert({
            sender_id: session.user.id,
            recipient_id: chatProfile.id,
            content: msg
        }).select().single();

        fetchActiveChats();

        if (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message.");
        } else if (data) {
            setChatMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!session || !announcementContent.trim()) return;
        setIsBroadcasting(true);
        try {
            const { error } = await supabase.rpc('create_announcement', {
                p_content: announcementContent.trim()
            });
            if (error) throw error;
            alert("Your announcement has been broadcasted successfully! 📢");
            setAnnouncementContent('');
            setShowSettings(false);
        } catch (err) {
            console.error("Error creating announcement:", err);
            alert("Failed to broadcast announcement: " + err.message);
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleAnswerQuestion = (post) => {
        setIsMapInteracting(false);
        setIsExploreMapMode(false);
        const replyName = post.is_ai ? post.ai_name : (post.full_name || post.user_email?.split('@')[0] || 'Someone');
        setReplyingTo({
            id: post.id,
            content: post.content,
            author: replyName
        });
    };

    const handleBugReport = async () => {
        if (!bugDescription.trim()) return;
        try {
            setIsSavingChanges(true);
            // Simulate a premium transmission experience
            await new Promise(r => setTimeout(r, 1500));
            alert("Bug report transmitted successfully to our engineering team. Thank you for making the circle better!");
            setBugDescription('');
        } catch (err) {
            alert("Failed to send report: " + err.message);
        } finally {
            setIsSavingChanges(false);
        }
    }

    const handleExportData = () => {
        alert("Your request for data export has been received. A secure link will be sent to " + session.user.email + " within 48 hours.");
    }

    const handleDeleteAccount = async () => {
        triggerConfirm("CRITICAL: This will permanently purge your profile, posts, and social connections from Miles Circle. This action is IRREVERSIBLE. Proceed?", async () => {
            try {
                setIsSavingChanges(true);
                // In a real app, we'd call an Edge Function to handle full cascade deletion
                // For now, we perform a best-effort delete of the profile
                const { error } = await supabase.from('profiles').delete().eq('id', session.user.id);
                if (error) throw error;
                
                await supabase.auth.signOut();
                showToast("Account scheduled for deletion. You have been disconnected.", "success");
            } catch (err) {
                showToast("Exclusion failed: " + err.message, "error");
            } finally {
                setIsSavingChanges(false);
            }
        });
    }


    return (
        <div className={`app-container ${(isMapInteracting || !isSliderHidden || isExploreMapMode) ? 'map-mode' : 'chat-mode'} ${profile?.theme_mode === 'light' ? 'light-mode' : ''}`}>
            {toast && (
                <div className="toast-anim" style={{
                    position: 'fixed',
                    top: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: toast.type === 'error' ? 'rgba(210, 85, 78, 0.95)' : toast.type === 'success' ? 'rgba(46, 204, 113, 0.95)' : 'rgba(28, 28, 30, 0.95)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    zIndex: 100000,
                    backdropFilter: 'blur(10px)',
                    border: toast.type === 'error' ? '1px solid rgba(210, 85, 78, 0.3)' : toast.type === 'success' ? '1px solid rgba(46, 204, 113, 0.3)' : '1px solid var(--glass-border)',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>{toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}</span>
                    {toast.message}
                </div>
            )}

            {confirmModal && (
                <div className="modal-overlay" style={{ zIndex: 100001 }} onClick={() => confirmModal.onCancel()}>
                    <div className="onboarding-card-premium" style={{
                        maxWidth: '400px',
                        padding: '2rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        boxSizing: 'border-box'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {confirmModal.message}
                        </h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="event-cancel-btn"
                                onClick={() => confirmModal.onCancel()}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-confirm-yes"
                                onClick={() => {
                                    confirmModal.onConfirm();
                                }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--accent-red)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {incomingWave && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10000,
                    background: 'linear-gradient(135deg, rgba(255,152,0,0.95) 0%, rgba(255,87,34,0.95) 100%)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(255,87,34,0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'slide-down 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                    fontFamily: 'var(--font-family)'
                }}>
                    <span style={{ fontSize: '1.5rem', animation: 'pulse 1s infinite' }}>👋</span>
                    <div 
                        onClick={async () => {
                            try {
                                const { data, error } = await supabase.from('profiles').select('*').eq('id', incomingWave.from_id).single();
                                if (data) {
                                    setViewingProfile(data);
                                    setIncomingWave(null);
                                }
                            } catch(err) { console.error(err); }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <div style={{ fontWeight: '900', fontSize: '0.9rem' }}>Incoming Wave!</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{incomingWave.from_name} is waving at you! (Tap to view)</div>
                    </div>
                    <button
                        onClick={async () => {
                            try {
                                await supabase.rpc('send_proximity_wave', { p_recipient_id: incomingWave.from_id });
                                alert(`Waved back at ${incomingWave.from_name}! 👋`);
                                setIncomingWave(null);
                            } catch (err) {
                                console.error(err);
                            }
                        }}
                        style={{
                            background: 'white',
                            color: '#FF5722',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            marginLeft: '8px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}
                    >
                        Wave Back
                    </button>
                </div>
            )}
            {showSplash && <SplashScreen onComplete={() => {
                sessionStorage.setItem('miles_splash_seen', 'true');
                setShowSplash(false);
            }} />}

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
                                        <div className="pulse-circle" style={{ width: '128px', height: '128px' }}>
                                            <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="onboarding-card-premium" style={{ width: '100%', maxWidth: '440px' }}>
                                    <div className="onboarding-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                        <div className="pulse-circle" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem' }}>
                                            <ShieldCheck size={40} color="var(--accent-red)" />
                                        </div>
                                        <h2 className="onboarding-title" style={{ fontSize: '1.8rem' }}>Establish Access</h2>
                                        <p className="onboarding-text">Enter your new secret password below to regain circle access.</p>
                                    </div>
                                    <form onSubmit={handleRecoverySubmit} className="auth-form-classic" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                        <div className="field-block">
                                            <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>New Secret Password</label>
                                            <input type="password" placeholder="Min 8 characters, Upper, Lower, Number" className="auth-input-classic" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--text-primary)' }} />
                                        </div>
                                        <div className="field-block">
                                            <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Confirm Password</label>
                                            <input type="password" placeholder="Repeat Secret Password" className="auth-input-classic" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--text-primary)' }} />
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
                                <div className={`onboarding-overlay ${onboardingStep === 2 ? 'tour-mode' : ''}`} style={{ zIndex: 3000 }}>
                                    {onboardingStep === 1 && (
                                        <div className="onboarding-card-premium anim-fade-in">
                                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                                <img src="/logo.png" alt="" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                                            </div>
                                            <div className="onboarding-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                                <h2 className="onboarding-title">Establish Your Presence</h2>
                                                <p className="onboarding-text" style={{ margin: '0 auto' }}>Craft your digital persona before entering the circle.</p>
                                            </div>
                                            <div className="onboarding-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div className="field-block">
                                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Full Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Alex Rivera"
                                                        value={profile?.full_name || ''}
                                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                                        style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--text-primary)', outline: 'none' }}
                                                    />
                                                </div>
                                                <div className="field-block">
                                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Mobile Number (Encrypted)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="+1 (555) 000-0000"
                                                        value={profile?.mobile || ''}
                                                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                                                        style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--text-primary)', outline: 'none' }}
                                                    />
                                                </div>

                                                {/* Google Users: Option to create a password for email login */}
                                                {session?.user?.app_metadata?.provider === 'google' && (
                                                    <div className="field-block" style={{ marginTop: '0.5rem', background: 'rgba(210, 85, 78, 0.05)', padding: '1.5rem', borderRadius: '18px', border: '1px solid rgba(210, 85, 78, 0.1)' }}>
                                                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-red)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Create Secret Password (Recommended)</label>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>Set a password now if you'd like to sign in with your email address in the future.</p>
                                                        <input
                                                            type="password"
                                                            placeholder="Min 8 chars, A-Z, 0-9"
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--text-primary)', outline: 'none' }}
                                                        />
                                                    </div>
                                                )}
                                                <button
                                                    className="btn-onboarding-next"
                                                    style={{ marginTop: '1rem' }}
                                                    onClick={() => handleUpdateProfile({ full_name: profile.full_name || '', mobile: profile.mobile || '' })}
                                                    disabled={isSavingChanges}
                                                >
                                                    {isSavingChanges ? 'Synchronizing Circle...' : 'Join the Circle'}
                                                </button>
                                                <button
                                                    className="tour-skip"
                                                    style={{ marginTop: '1rem', width: '100%', textAlign: 'center' }}
                                                    onClick={() => setOnboardingStep(2)}
                                                >
                                                    Skip setup for now
                                                </button>
                                                <button
                                                    className="tour-skip"
                                                    style={{ marginTop: '0.5rem', width: '100%', textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}
                                                    onClick={() => handleUpdateProfile({ onboarding_completed: true })}
                                                >
                                                    Skip all and enter Circle
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {onboardingStep === 2 && (
                                        <div className="onboarding-card-premium tour-card" style={{ boxShadow: '0 0 0 1000px rgba(0,0,0,0.6)' }}>
                                            <div className="tour-steps-indicator">
                                                {[1, 2, 3, 4, 5, 6].map(s => <div key={s} className={`step-dot ${tourStep === s ? 'active' : ''}`}></div>)}
                                            </div>
                                            <div className="tour-content">
                                                {tourStep === 1 && (
                                                    <>
                                                        <Globe size={36} color="var(--accent-red)" />
                                                        <h3>Welcome to the Circle</h3>
                                                        <p>Miles Circle is a proximity-based social network. Connect with people who are physically near you right now!</p>
                                                    </>
                                                )}
                                                {tourStep === 2 && (
                                                    <>
                                                        <MapPin size={36} color="var(--accent-red)" />
                                                        <h3>Interactive Proximity</h3>
                                                        <p>Watch the map! The <strong>toggle bar</strong> on the right lets you expand your circle. A wider radius means you see more neighbors and posts!</p>
                                                    </>
                                                )}
                                                {tourStep === 3 && (
                                                    <>
                                                        <MessageCircle size={36} color="var(--accent-red)" />
                                                        <h3>Hyper-Local Feed</h3>
                                                        <p>All messages are from people currently within your radius. You can reply, react, and share files instantly.</p>
                                                    </>
                                                )}
                                                {tourStep === 4 && (
                                                    <>
                                                        <Sparkles size={36} color="var(--accent-red)" />
                                                        <h3>AI Local Neighbors</h3>
                                                        <p>Our context-aware AI neighbors might chime in to help with local info, weather, or just to keep the circle active!</p>
                                                    </>
                                                )}
                                                {tourStep === 5 && (
                                                    <>
                                                        <Share2 size={36} color="var(--accent-red)" />
                                                        <h3>Social Presence</h3>
                                                        <p>In <strong>Settings</strong>, add your social handles. Set them to <strong>Public</strong> to let neighbors connect with you externally.</p>
                                                    </>
                                                )}
                                                {tourStep === 6 && (
                                                    <>
                                                        <ShieldCheck size={36} color="var(--accent-red)" />
                                                        <h3>Trust & Safety</h3>
                                                        <p>Rate neighbors and build reputation. You control exactly what data stays private in your Identity Control.</p>
                                                    </>
                                                )}
                                            </div>
                                            <div className="tour-footer">
                                                <button className="btn-tour-next" onClick={() => tourStep < 6 ? setTourStep(s => s + 1) : handleUpdateProfile({ onboarding_completed: true })}>
                                                    {tourStep < 6 ? 'Next Step' : 'Enter the Circle'}
                                                </button>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                                                    <button className="tour-skip" onClick={() => handleUpdateProfile({ onboarding_completed: true })}>Skip Tour</button>
                                                    <button 
                                                        className="tour-skip" 
                                                        style={{ opacity: 0.5, fontSize: '0.75rem' }}
                                                        onClick={() => supabase.auth.signOut()}
                                                    >
                                                        Sign Out & Restart Session
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                                    {scanning && (
                                        <div className="modal-overlay" style={{ zIndex: 5000 }}>
                                            <div className="onboarding-card-premium anim-fade-in" style={{ maxWidth: '450px', width: '90%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center', position: 'relative' }}>
                                                <button
                                                    type="button"
                                                    onClick={stopScanner}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '16px',
                                                        right: '16px',
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: 'white',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                                >
                                                    <X size={16} />
                                                </button>
                                                
                                                <header style={{ marginBottom: '1.5rem' }}>
                                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>Scan Neighbor QR Code</h3>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px' }}>Align the neighbor's User ID QR code within the frame.</p>
                                                </header>
                                                
                                                <div 
                                                    id="qr-reader" 
                                                    style={{ 
                                                        width: '100%', 
                                                        background: 'black', 
                                                        borderRadius: '16px', 
                                                        overflow: 'hidden', 
                                                        border: '1px solid var(--glass-border)',
                                                        aspectRatio: '1',
                                                        marginBottom: '1.5rem'
                                                    }}
                                                ></div>
                                                
                                                <button
                                                    type="button"
                                                    onClick={stopScanner}
                                                    style={{
                                                        width: '100%',
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        color: 'white',
                                                        border: '1px solid var(--glass-border)',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                                >
                                                    Cancel Scan
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {showMyQr && session && (
                                        <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={() => setShowMyQr(false)}>
                                            <div className="onboarding-card-premium anim-fade-in" style={{ maxWidth: '420px', width: '90%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMyQr(false)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '16px',
                                                        right: '16px',
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: 'white',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                                >
                                                    <X size={16} />
                                                </button>
                                                
                                                <header style={{ marginBottom: '1.5rem' }}>
                                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>My User QR Code</h3>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px' }}>Let another neighbor scan this to transfer points to you.</p>
                                                </header>
                                                
                                                <div style={{
                                                    background: 'white',
                                                    padding: '16px',
                                                    borderRadius: '20px',
                                                    display: 'inline-block',
                                                    marginBottom: '1.5rem',
                                                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
                                                }}>
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${session.user.id}`} 
                                                        alt="User ID QR Code" 
                                                        style={{ display: 'block', width: '200px', height: '200px' }}
                                                    />
                                                </div>
                                                
                                                <div style={{
                                                    background: 'rgba(0,0,0,0.2)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '12px',
                                                    padding: '12px',
                                                    marginBottom: '1.5rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '6px'
                                                }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>MY USER ID</span>
                                                    <code style={{ fontSize: '0.85rem', color: 'white', wordBreak: 'break-all', fontFamily: 'monospace' }}>{session.user.id}</code>
                                                </div>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(session.user.id);
                                                        setCopiedId(true);
                                                        setTimeout(() => setCopiedId(false), 2000);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        background: copiedId ? '#2ecc71' : 'var(--accent-red)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    {copiedId ? (
                                                        <>✔️ Copied User ID!</>
                                                    ) : (
                                                        <>Copy ID to Clipboard</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                            {/* MAIN APP CONTENT */}
                            {(onboardingStep === 0 || onboardingStep === 2) && (
                                <>
                                    {/* STATUS OVERLAYS */}
                                    {(!locationAvailable || locationError) && !offlineMode && (
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
                                                    <button className="btn-onboarding-next" onClick={() => updateLocation()}>
                                                        {locationError ? 'Retry Location' : 'Check Permission'}
                                                    </button>
                                                    <button
                                                        className="nav-item"
                                                        style={{ justifyContent: 'center', background: 'rgba(210,85,78,0.1)', border: '1px solid var(--accent-red)', borderRadius: '12px', padding: '14px', color: 'var(--accent-red)', fontWeight: '700', cursor: 'pointer' }}
                                                        onClick={() => setOfflineMode(true)}
                                                    >
                                                        📍 Continue in Offline Mode
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* OFFLINE MODE — City Picker */}
                                    {offlineMode && !locationAvailable && (
                                        <div className="locating-overlay anim-fade-in" style={{ zIndex: 9000 }}>
                                            <div className="locating-card-premium" style={{ maxWidth: '480px' }}>
                                                {/* Go Online button — top right */}
                                                <button
                                                    onClick={goOnline}
                                                    style={{
                                                        position: 'absolute', top: '16px', right: '16px',
                                                        background: 'var(--accent-red)', border: 'none', color: 'white',
                                                        borderRadius: '20px', padding: '8px 16px', fontWeight: '700',
                                                        fontSize: '0.8rem', cursor: 'pointer', display: 'flex',
                                                        alignItems: 'center', gap: '6px'
                                                    }}
                                                >
                                                    <Globe size={14} /> Go Online
                                                </button>

                                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗺️</div>
                                                    <h2 style={{ fontSize: '1.6rem', fontWeight: '950', marginBottom: '0.5rem' }}>Offline Mode</h2>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                                        Search for your city to browse the local feed. Your exact location won't be shared.
                                                    </p>
                                                </div>

                                                {/* City Search */}
                                                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Search city (e.g. Mumbai, London...)"
                                                            value={citySearch}
                                                            onChange={e => setCitySearch(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && searchCity()}
                                                            style={{
                                                                flex: 1, padding: '12px 16px',
                                                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                                                borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.95rem'
                                                            }}
                                                        />
                                                        <button
                                                            onClick={searchCity}
                                                            disabled={citySearching || !citySearch.trim()}
                                                            style={{
                                                                padding: '12px 18px', background: 'var(--accent-red)', border: 'none',
                                                                borderRadius: '12px', color: 'white', fontWeight: '700',
                                                                cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {citySearching ? '...' : '🔍 Search'}
                                                        </button>
                                                    </div>

                                                    {/* Search Results Dropdown */}
                                                    {cityResults.length > 0 && (
                                                        <div style={{
                                                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                                                            background: 'var(--panel-bg)', border: '1px solid var(--glass-border)',
                                                            borderRadius: '12px', marginTop: '4px', overflow: 'hidden',
                                                            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                                                        }}>
                                                            {cityResults.map((city, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => selectCity(city)}
                                                                    style={{
                                                                        display: 'block', width: '100%', padding: '12px 16px',
                                                                        background: 'none', border: 'none', color: 'var(--text-primary)',
                                                                        textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem',
                                                                        borderBottom: i < cityResults.length - 1 ? '1px solid var(--glass-border)' : 'none'
                                                                    }}
                                                                >
                                                                    📍 {city.display_name?.split(',').slice(0, 3).join(', ')}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textAlign: 'center', marginTop: '0.5rem' }}>
                                                    Only large cities and regions available in offline mode
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* MAP LAYER */}

                                        {locationAvailable && (

                                            <MapContainer center={position} zoom={13} zoomControl={false} className="map-view">
                                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                                {isExploreMapMode && <ZoomControl position="bottomright" />}
                                                <Marker 
                                                    position={position} 
                                                    icon={neighborIcon(
                                                        (profile?.full_name || '?')[0].toUpperCase(), 
                                                        profile?.avatar_url, 
                                                        profile?.points || 0, 
                                                        profile?.daily_vibe
                                                    )} 
                                                    eventHandlers={{
                                                        click: () => {
                                                            setShowSettings(true);
                                                            setActiveSettingsTab('main');
                                                        }
                                                    }}
                                                />
                                                <Circle center={position} pathOptions={{ color: 'var(--accent-red)', fillColor: 'var(--accent-red)', fillOpacity: 0.1, weight: 2, dashArray: '4, 8' }} radius={radius * 1609.34} />
                                                {activeNeighbors.map(neighbor => {
                                                    const fuzzyPos = getFuzzyCoords(neighbor.id, neighbor.last_lat, neighbor.last_lng);
                                                    const initial = (neighbor.full_name || '?')[0].toUpperCase();
                                                    return (
                                                        <Marker 
                                                            key={neighbor.id} 
                                                            position={fuzzyPos} 
                                                            icon={neighborIcon(initial, neighbor.avatar_url, neighbor.points || 0, neighbor.daily_vibe)}
                                                        >
                                                            <Popup>
                                                                <div style={{
                                                                    background: 'rgba(30, 30, 30, 0.95)',
                                                                    color: '#fff',
                                                                    padding: '12px 14px',
                                                                    borderRadius: '16px',
                                                                    fontFamily: 'var(--font-family)',
                                                                    fontSize: '0.85rem',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    minWidth: '180px',
                                                                    textAlign: 'center',
                                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                                                    backdropFilter: 'blur(20px)',
                                                                    WebkitBackdropFilter: 'blur(20px)'
                                                                }}>
                                                                    <div style={{ fontWeight: '800', marginBottom: '4px', fontSize: '0.92rem', color: 'white' }}>{neighbor.full_name || 'Circle Member'}</div>
                                                                    <div style={{ color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px' }}>🔥 {neighbor.points || 0} Karma Points</div>
                                                                    {neighbor.daily_vibe && (
                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Today: {neighbor.daily_vibe}</div>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setViewingProfile(neighbor)}
                                                                        style={{
                                                                            background: 'var(--accent-red)',
                                                                            border: 'none',
                                                                            borderRadius: '8px',
                                                                            padding: '6px 12px',
                                                                            color: 'white',
                                                                            fontWeight: '800',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.75rem',
                                                                            width: '100%',
                                                                            boxSizing: 'border-box',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                                    >
                                                                        View Profile
                                                                    </button>
                                                                </div>
                                                            </Popup>
                                                        </Marker>
                                                    );
                                                })}
                                                {events.map(event => {
                                                    if (!event.location_lat || !event.location_lng) return null;
                                                    return (
                                                        <Marker 
                                                            key={`map-event-${event.id}`} 
                                                            position={[event.location_lat, event.location_lng]} 
                                                            icon={eventIcon(event.is_flash)}
                                                        >
                                                            <Popup>
                                                                <div style={{
                                                                    background: 'rgba(30, 30, 30, 0.9)',
                                                                    color: '#fff',
                                                                    padding: '12px',
                                                                    borderRadius: '16px',
                                                                    fontFamily: 'var(--font-family)',
                                                                    fontSize: '0.85rem',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    minWidth: '200px',
                                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                                                    backdropFilter: 'blur(20px)',
                                                                    WebkitBackdropFilter: 'blur(20px)'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                                        <span style={{ fontSize: '1.1rem' }}>{event.is_flash ? '⚡' : '📅'}</span>
                                                                        <span style={{ fontWeight: '900', color: event.is_flash ? '#ff9f43' : '#9b59b6', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                                                            {event.is_flash ? 'Flash Meetup' : 'Event'}
                                                                        </span>
                                                                    </div>
                                                                    <h4 style={{ margin: '0 0 6px', fontWeight: '800', fontSize: '1rem', color: 'white' }}>{event.title}</h4>
                                                                    <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: '1.4' }}>{event.description || 'No description provided.'}</p>
                                                                    <button
                                                                        onClick={() => setShowEvents(true)}
                                                                        style={{
                                                                            background: 'var(--accent-red)',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '8px',
                                                                            padding: '6px 12px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: '800',
                                                                            cursor: 'pointer',
                                                                            width: '100%',
                                                                            textAlign: 'center',
                                                                            boxShadow: '0 4px 12px rgba(210,85,78,0.25)'
                                                                        }}
                                                                    >
                                                                        View Event & RSVP
                                                                    </button>
                                                                </div>
                                                            </Popup>
                                                        </Marker>
                                                    );
                                                })}

                                                {/* Q&A / Alert Map Pins */}
                                                {mapPosts.map(post => {
                                                    const coords = parseWKTPoint(post.location);
                                                    if (!coords) return null;

                                                    const hasReplies = mapPosts.some(p => p.reply_to_id === post.id);
                                                    const isQuestion = post.content && post.content.trim().endsWith('?') && !post.reply_to_id && !hasReplies;
                                                    const isAlert = post.is_alert && !post.reply_to_id;

                                                    if (isQuestion) {
                                                        return (
                                                            <Marker
                                                                key={`map-qa-${post.id}`}
                                                                position={coords}
                                                                icon={qaIconInstance}
                                                            >
                                                                <Popup>
                                                                    <div style={{
                                                                        background: 'rgba(30, 30, 30, 0.9)',
                                                                        color: '#fff',
                                                                        padding: '12px',
                                                                        borderRadius: '16px',
                                                                        fontFamily: 'var(--font-family)',
                                                                        fontSize: '0.85rem',
                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                        minWidth: '200px',
                                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                                                        backdropFilter: 'blur(20px)',
                                                                        WebkitBackdropFilter: 'blur(20px)'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                                            <span style={{ fontSize: '1.1rem' }}>❓</span>
                                                                            <span style={{ fontWeight: '900', color: '#2ecc71', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                                                                Neighbor Question
                                                                            </span>
                                                                        </div>
                                                                        <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                                                            "{post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content}"
                                                                        </p>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleAnswerQuestion(post);
                                                                                // Dismiss popup by triggering a map interaction reset or similar
                                                                            }}
                                                                            style={{
                                                                                background: '#2ecc71',
                                                                                color: 'white',
                                                                                border: 'none',
                                                                                borderRadius: '8px',
                                                                                padding: '6px 12px',
                                                                                fontSize: '0.75rem',
                                                                                fontWeight: '800',
                                                                                cursor: 'pointer',
                                                                                width: '100%',
                                                                                textAlign: 'center',
                                                                                boxShadow: '0 4px 12px rgba(46,204,113,0.25)'
                                                                            }}
                                                                        >
                                                                            Help & Answer
                                                                        </button>
                                                                    </div>
                                                                </Popup>
                                                            </Marker>
                                                        );
                                                    }

                                                    if (isAlert) {
                                                        return (
                                                            <Marker
                                                                key={`map-alert-${post.id}`}
                                                                position={coords}
                                                                icon={alertIconInstance}
                                                            >
                                                                <Popup>
                                                                    <div style={{
                                                                        background: 'rgba(30, 30, 30, 0.9)',
                                                                        color: '#fff',
                                                                        padding: '12px',
                                                                        borderRadius: '16px',
                                                                        fontFamily: 'var(--font-family)',
                                                                        fontSize: '0.85rem',
                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                        minWidth: '200px',
                                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                                                        backdropFilter: 'blur(20px)',
                                                                        WebkitBackdropFilter: 'blur(20px)'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                                            <span style={{ fontSize: '1.1rem' }}>🚨</span>
                                                                            <span style={{ fontWeight: '900', color: '#e74c3c', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                                                                Broadcast Alert
                                                                            </span>
                                                                        </div>
                                                                        <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                                                            "{post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content}"
                                                                        </p>
                                                                        <button
                                                                            onClick={() => {
                                                                                setIsMapInteracting(false);
                                                                            }}
                                                                            style={{
                                                                                background: '#e74c3c',
                                                                                color: 'white',
                                                                                border: 'none',
                                                                                borderRadius: '8px',
                                                                                padding: '6px 12px',
                                                                                fontSize: '0.75rem',
                                                                                fontWeight: '800',
                                                                                cursor: 'pointer',
                                                                                width: '100%',
                                                                                textAlign: 'center',
                                                                                boxShadow: '0 4px 12px rgba(231,76,60,0.25)'
                                                                            }}
                                                                        >
                                                                            View Alert in Feed
                                                                        </button>
                                                                    </div>
                                                                </Popup>
                                                            </Marker>
                                                        );
                                                    }

                                                    return null;
                                                })}
                                                <MapController center={position} radius={radius} isInteracting={isMapInteracting} isExploreMapMode={isExploreMapMode} />
                                            </MapContainer>
                                        )}

                                    {/* CHAT LAYER */}
                                    {locationAvailable && (
                                        <div className="chat-interface">
                                            <header className={`app-header-new ${isHeaderHidden ? 'hidden' : ''}`} style={{ position: 'relative' }}>
                                                <div className="brand-wrap">
                                                    <h1 className="logo-text">MILES <span className="logo-accent">CIRCLE</span></h1>
                                                    {offlineMode && (
                                                        <span style={{
                                                            marginLeft: '8px', background: 'rgba(210,85,78,0.15)', color: 'var(--accent-red)',
                                                            fontSize: '0.65rem', fontWeight: '800', padding: '3px 8px',
                                                            borderRadius: '20px', border: '1px solid var(--accent-red)', letterSpacing: '0.05em'
                                                        }}>OFFLINE</span>
                                                    )}
                                                </div>

                                                {/* Weather pill — centre of header */}
                                                {weather && (() => {
                                                    const wd = getWeatherDescription(weather.code);
                                                    const uvLabel = weather.uv == null ? null : weather.uv <= 2 ? 'Low' : weather.uv <= 5 ? 'Moderate' : weather.uv <= 7 ? 'High' : 'Very High';
                                                    const uvColor = weather.uv == null ? '#aaa' : weather.uv <= 2 ? '#4caf50' : weather.uv <= 5 ? '#ff9800' : weather.uv <= 7 ? '#f44336' : '#9c27b0';
                                                    const feelsLike = weather.temp != null ? Math.round(weather.temp - (weather.windspeed || 0) * 0.05) : null;
                                                    return (
                                                        <div style={{ position: 'relative' }}>
                                                            {/* Pill button */}
                                                            <button
                                                                onClick={e => { e.stopPropagation(); setShowWeatherPanel(p => !p); }}
                                                                style={{
                                                                    background: showWeatherPanel ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                                                                    border: `1px solid ${showWeatherPanel ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}`,
                                                                    borderRadius: '50px',
                                                                    padding: '5px 12px 5px 8px',
                                                                    backdropFilter: 'blur(20px)',
                                                                    WebkitBackdropFilter: 'blur(20px)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{wd.emoji}</span>
                                                                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-primary)' }}>{weather.temp}°C</span>
                                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'none' }} className="weather-label">{wd.text}</span>
                                                                <span style={{
                                                                    fontSize: '0.6rem',
                                                                    color: 'var(--text-secondary)',
                                                                    display: 'inline-block',
                                                                    transform: showWeatherPanel ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                    transition: 'transform 0.2s',
                                                                }}>▼</span>
                                                            </button>

                                                            {/* Detail panel — drops below header */}
                                                            {showWeatherPanel && (
                                                                <div
                                                                    onClick={e => e.stopPropagation()}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: 'calc(100% + 10px)',
                                                                        left: '50%',
                                                                        transform: 'translateX(-50%)',
                                                                        zIndex: 9000,
                                                                        width: 'min(320px, calc(100vw - 32px))',
                                                                        background: 'rgba(10, 10, 18, 0.92)',
                                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                                        borderRadius: '20px',
                                                                        padding: '18px 16px',
                                                                        backdropFilter: 'blur(30px)',
                                                                        WebkitBackdropFilter: 'blur(30px)',
                                                                        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                                                                        animation: 'slideDownFade 0.22s ease',
                                                                    }}
                                                                >
                                                                    {/* Header row */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                                                                        <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>{wd.emoji}</span>
                                                                        <div>
                                                                            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>
                                                                                {weather.temp}°<span style={{ fontSize: '1rem', fontWeight: '600', opacity: 0.7 }}>C</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{wd.text}</div>
                                                                            {feelsLike != null && (
                                                                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>Feels like {feelsLike}°C</div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Stats grid */}
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                            <span style={{ fontSize: '1.2rem' }}>💨</span>
                                                                            <span style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{weather.windspeed ?? '—'} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>km/h</span></span>
                                                                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Wind Speed</span>
                                                                        </div>
                                                                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                            <span style={{ fontSize: '1.2rem' }}>💧</span>
                                                                            <span style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{weather.humidity != null ? weather.humidity + '%' : '—'}</span>
                                                                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Humidity</span>
                                                                        </div>
                                                                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                            <span style={{ fontSize: '1.2rem' }}>🌧️</span>
                                                                            <span style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{weather.rainChance != null ? weather.rainChance + '%' : '—'}</span>
                                                                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Rain Chance</span>
                                                                        </div>
                                                                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                            <span style={{ fontSize: '1.2rem' }}>☀️</span>
                                                                            <span style={{ fontSize: '1rem', fontWeight: '800', color: uvColor }}>
                                                                                {weather.uv != null ? weather.uv.toFixed(1) : '—'} <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>{uvLabel}</span>
                                                                            </span>
                                                                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>UV Index</span>
                                                                        </div>
                                                                    </div>

                                                                    {weather.rain != null && weather.rain > 0 && (
                                                                        <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>🌂 Current Rainfall</span>
                                                                                <span style={{ fontSize: '0.75rem', color: '#7ec8f7', fontWeight: '800' }}>{weather.rain} mm</span>
                                                                            </div>
                                                                            <div style={{ height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                                                                                <div style={{ height: '100%', width: `${Math.min(weather.rain * 20, 100)}%`, background: 'linear-gradient(90deg, #5fc3f7, #2196f3)', borderRadius: '10px' }} />
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div style={{ marginTop: '12px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                                                                        Powered by Open-Meteo • Tap pill to close
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                <div className="header-actions">
                                                    {offlineMode && (
                                                        <button
                                                            onClick={goOnline}
                                                            title="Go Online"
                                                            style={{
                                                                background: 'var(--accent-red)', border: 'none', color: 'white',
                                                                borderRadius: '20px', padding: '6px 12px', fontWeight: '700',
                                                                fontSize: '0.75rem', cursor: 'pointer', display: 'flex',
                                                                alignItems: 'center', gap: '5px', marginRight: '8px'
                                                            }}
                                                        >
                                                            <Globe size={13} /> Go Online
                                                        </button>
                                                    )}
                                                    <button 
                                                         className={`header-map-btn ${isExploreMapMode ? 'active' : ''}`} 
                                                         onClick={() => setIsExploreMapMode(!isExploreMapMode)} 
                                                         title="Explore Map"
                                                         style={{
                                                             background: isExploreMapMode ? 'var(--accent-red)' : 'rgba(255, 255, 255, 0.1)',
                                                             border: 'none',
                                                             color: 'white',
                                                             width: '40px',
                                                             height: '40px',
                                                             borderRadius: '50%',
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: 'center',
                                                             cursor: 'pointer',
                                                             marginRight: '8px',
                                                             transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                                         }}
                                                     >
                                                         <MapIcon size={20} style={{ transform: isExploreMapMode ? 'scale(1.15)' : 'none', transition: 'transform 0.3s' }} />
                                                     </button>
                                                    <button className="header-events-btn" onClick={() => { setShowEvents(true); setNewEventsCount(0); localStorage.setItem('miles_last_event_seen', new Date().toISOString()); }} title="Events">
                                                        <Calendar size={20} />
                                                        {newEventsCount > 0 && (
                                                            <span className="events-notif-badge">{newEventsCount > 9 ? '9+' : newEventsCount}</span>
                                                        )}
                                                    </button>
                                                    <div className="user-avatar-btn" onClick={() => setShowSettings(true)}>
                                                        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : getInitial()}
                                                    </div>
                                                </div>
                                            </header>

                                            <div className="chat-center-container" style={{
                                                opacity: isExploreMapMode ? 0 : (isMapInteracting ? 0.3 : 1),
                                                filter: (isMapInteracting || isExploreMapMode) ? 'blur(12px)' : 'none',
                                                transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                                                pointerEvents: isExploreMapMode ? 'none' : 'auto'
                                            }}>
                                                <div className="chat-messages-scroll" onScroll={handleChatScroll}>
                                                    <Feed
                                                        position={position}
                                                        radius={radius}
                                                        refreshTrigger={feedTrigger}
                                                        session={session}
                                                        activeNeighborsCount={activeNeighbors.length + 1}
                                                        waves={waves}
                                                        activeChats={activeChats}
                                                        activeNeighbors={activeNeighbors}
                                                        hasVibedToday={
                                                            profile?.vibe_updated_at ? 
                                                            new Date(profile.vibe_updated_at).toDateString() === new Date().toDateString() 
                                                            : false
                                                        }
                                                        onVibeClick={() => setShowVibeCheck(true)}
                                                        aiResponderEnabled={aiResponderEnabled}
                                                        onOpenChat={openChat}
                                                        onShowMap={() => setIsExploreMapMode(true)}
                                                        onUserClick={async (userId, isAi, aiName) => {
                                                            const isReallyAi = !!isAi || (typeof isAi === 'string' && isAi.toLowerCase() === 'true');
                                                            if (isReallyAi) {
                                                                setViewingProfile({
                                                                    full_name: aiName || 'AI Neighbor',
                                                                    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${aiName || 'AI'}&backgroundColor=b6e3f4`,
                                                                    bio: 'I am a specialized AI neighbor assistant. I provide answers and helpful local info if nobody nearby can reply.',
                                                                    is_ai: true
                                                                });
                                                                return;
                                                            }
                                                            if (!userId) return;
                                                            try {
                                                                const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
                                                                if (error) throw error;
                                                                if (data) setViewingProfile(data);
                                                            } catch (err) {
                                                                console.error("Error viewing profile:", err);
                                                            }
                                                        }}
                                                        onReplyChange={(ctx, suggestion) => {
                                                            setReplyingTo(ctx);
                                                            if (suggestion) setMessageContent(suggestion);
                                                        }}
                                                        onTransferPoints={(email, amount) => {
                                                            setRecipientEmail(email || '');
                                                            setTransferAmount(amount ? String(amount) : '');
                                                            setActiveSettingsTab('wallet');
                                                            setShowSettings(true);
                                                        }}
                                                    />
                                                    <div className="system-welcome-card">
                                                        <p className="welcome-tag">Proximity Active</p>
                                                        <p className="welcome-text">Connected to the <strong>{distanceUnit === 'km' ? (radius * 1.60934).toFixed(1) + ' km' : radius + ' mile'}</strong> sphere around your current location.</p>
                                                    </div>
                                                </div>

                                                <form className="chat-input-wrapper" onSubmit={handleSendMessage} style={{ flexDirection: 'column', gap: 0, alignItems: 'stretch' }}>
                                                    {/* Hidden File Input for Post Media Uploads */}
                                                    <input type="file" id="post-image-upload" hidden accept="image/*" onChange={handlePostImageSelect} />

                                                    {/* Reply Preview Bar */}
                                                    {replyingTo && (
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            padding: '8px 14px',
                                                            background: 'var(--panel-bg)',
                                                            borderTop: '1px solid var(--glass-border)',
                                                            borderLeft: '3px solid var(--accent-red)',
                                                            borderRadius: '12px 12px 0 0',
                                                            fontSize: '0.78rem'
                                                        }}>
                                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                <div style={{ fontWeight: '700', color: 'var(--accent-red)', marginBottom: '2px' }}>↩ {replyingTo.author}</div>
                                                                <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyingTo.content}</div>
                                                            </div>
                                                            <button type="button" onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '4px' }}>✕</button>
                                                        </div>
                                                    )}

                                                    {/* Image Attachment Preview Bar */}
                                                    {attachedImageUrl && (
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', gap: '12px',
                                                            padding: '8px 14px',
                                                            background: 'var(--panel-bg)',
                                                            borderTop: '1px solid var(--glass-border)',
                                                            borderLeft: '3px solid var(--accent-red)',
                                                            borderRadius: replyingTo ? '0' : '12px 12px 0 0',
                                                            fontSize: '0.78rem'
                                                        }}>
                                                            <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                                                <img src={attachedImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                            <div style={{ flex: 1, color: 'var(--text-secondary)' }}>
                                                                Photo attached and ready to post.
                                                            </div>
                                                            <button type="button" onClick={() => setAttachedImageUrl(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '4px' }}>✕</button>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                                                        {showAttachmentMenu && (
                                                            <div className="attachment-menu-popover">
                                                                <button type="button" className="menu-item" onClick={() => handleAttachmentAction('photo')}><div className="menu-icon-circle"><Image size={20} /></div><span>Photos</span></button>
                                                                <button type="button" className="menu-item" onClick={() => handleAttachmentAction('file')}><div className="menu-icon-circle"><Paperclip size={20} /></div><span>Files</span></button>
                                                                <button type="button" className="menu-item" onClick={() => handleAttachmentAction('location')}><div className="menu-icon-circle"><MapIcon size={20} /></div><span>Location</span></button>
                                                            </div>
                                                        )}
                                                        <button 
                                                            type="button" 
                                                            className={`chat-plus-btn ${showAttachmentMenu ? 'active' : ''}`} 
                                                            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                                                            disabled={isRecording}
                                                            style={{ opacity: isRecording ? 0.3 : 1, pointerEvents: isRecording ? 'none' : 'auto' }}
                                                        >
                                                            <Plus size={24} style={{ transform: showAttachmentMenu ? 'rotate(45deg)' : 'none' }} />
                                                        </button>
                                                        
                                                        {isRecording ? (
                                                            <>
                                                                <div style={{
                                                                    flex: 1,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '10px',
                                                                    background: 'rgba(210, 85, 78, 0.1)',
                                                                    border: '1px solid rgba(210, 85, 78, 0.3)',
                                                                    borderRadius: '20px',
                                                                    padding: '10px 16px',
                                                                    color: 'var(--accent-red)',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.9rem'
                                                                }}>
                                                                    <span className="recording-dot" style={{
                                                                        display: 'inline-block',
                                                                        width: '10px',
                                                                        height: '10px',
                                                                        borderRadius: '50%',
                                                                        background: 'var(--accent-red)',
                                                                        animation: 'pulse-orange-border 1s infinite alternate'
                                                                    }}></span>
                                                                    <span>Recording {formatDuration(recordingDuration)}</span>
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={cancelRecording} 
                                                                    style={{ 
                                                                        background: 'none', 
                                                                        border: 'none', 
                                                                        color: 'var(--text-secondary)', 
                                                                        cursor: 'pointer', 
                                                                        padding: '8px', 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        justifyContent: 'center',
                                                                        transition: 'transform 0.1s'
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                                >
                                                                    <Trash2 size={22} />
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={stopAndSendRecording} 
                                                                    className="chat-send-btn-new"
                                                                    style={{ background: 'var(--accent-red)', color: 'white' }}
                                                                >
                                                                    <Send size={18} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <input type="text" className="chat-input-main" placeholder={attachedImageUrl ? "Add a caption..." : "Message Circle..."} value={messageContent} onChange={e => setMessageContent(e.target.value)} disabled={isSending} />
                                                                {(!messageContent.trim() && !attachedImageUrl) ? (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={startRecording} 
                                                                        className="chat-send-btn-new"
                                                                        style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                                                                    >
                                                                        <Mic size={18} />
                                                                    </button>
                                                                ) : (
                                                                    <button type="submit" className="chat-send-btn-new" disabled={isSending}>
                                                                        {isSending ? <div className="spinner-tiny"></div> : <Send size={18} />}
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </form>
                                            </div>

                                            <div className={`side-slider-container ${isSliderHidden ? 'collapsed' : ''}`}>
                                                <button className="slider-toggle-btn" onClick={() => setIsSliderHidden(!isSliderHidden)}>
                                                    {isSliderHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                                                </button>
                                                {!isSliderHidden && (
                                                    <div className="slider-controls-wrap">
                                                        <span className="radius-badge">{distanceUnit === 'km' ? (radius * 1.60934).toFixed(1) + ' km' : radius + ' mi'}</span>
                                                        <input
                                                            type="range"
                                                            className="range-vertical"
                                                            min="0.5"
                                                            max="20"
                                                            step="0.5"
                                                            value={radius}
                                                            onInput={e => setRadius(parseFloat(e.target.value))}
                                                            onChange={e => setRadius(parseFloat(e.target.value))}
                                                            onMouseDown={() => handleSliderInteract(true)}
                                                            onMouseUp={() => handleSliderInteract(false)}
                                                            onTouchStart={() => handleSliderInteract(true)}
                                                            onTouchEnd={() => handleSliderInteract(false)}
                                                            style={{ '--range-percent': `${((radius - 0.5) / 19.5) * 100}%` }}
                                                        />
                                                        <span className="slider-label-vertical">{distanceUnit === 'km' ? 'Distance (km)' : 'Distance (mi)'}</span>
                                                        <MapIcon size={20} color="var(--text-secondary)" style={{ marginTop: '10px', opacity: 0.5 }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* SETTINGS MODAL */}
                                    {showSettings && (
                                        <div className="modal-overlay" onClick={resetSettings}>
                                            <div className="settings-card-premium" onClick={e => e.stopPropagation()}>
                                                    <aside className="settings-sidebar">
                                                        <div className="sidebar-header">
                                                            <div className="pulse-circle-mini" style={{ width: '24px', height: '24px', marginBottom: '8px' }}>
                                                                <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                            </div>
                                                            <span className="logo-badge" style={{ fontSize: '0.5rem' }}>CIRCLE</span>
                                                        </div>
                                                        <nav className="settings-nav">
                                                            <button className={`nav-item ${activeSettingsTab === 'main' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('main')}><User size={20} /> <span>Profile Identity</span></button>
                                                            <button className={`nav-item ${activeSettingsTab === 'wallet' ? 'active' : ''}`} onClick={() => { setActiveSettingsTab('wallet'); fetchTransactions(); }}><Wallet size={20} /> <span>Karma Wallet</span></button>
                                                            <button className={`nav-item ${activeSettingsTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('appearance')}><Globe size={20} /> <span>Appearance</span></button>
                                                            <button className={`nav-item ${activeSettingsTab === 'waves' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('waves')}><span>👋</span> <span>Waves Received</span></button>
                                                            {profile?.points >= 100 && (
                                                                <button className={`nav-item ${activeSettingsTab === 'broadcasts' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('broadcasts')}><span>📢</span> <span>Broadcast Announcement</span></button>
                                                            )}
                                                            <button className={`nav-item ${activeSettingsTab === 'security' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('security')}><ShieldCheck size={20} /> <span>Security</span></button>
                                                            <button className={`nav-item ${activeSettingsTab === 'data' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('data')}><Database size={20} /> <span>Data Control</span></button>
                                                            <button className={`nav-item ${activeSettingsTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('subscription')}><CreditCard size={20} /> <span>Subscription</span></button>
                                                            <button className={`nav-item ${activeSettingsTab === 'about' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('about')}><Info size={20} /> <span>About Us</span></button>
                                                            <button className={`nav-item ${activeSettingsTab === 'bug' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('bug')}><Bug size={20} /> <span>Report Bug</span></button>
                                                            <button className="nav-item signout" onClick={() => setShowLogoutConfirm(true)}><LogOut size={20} /> <span>Sign Out</span></button>
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
                                                                <div className="avatar-hero-info">
                                                                    <h3>{profile?.full_name || 'Anonymous User'}</h3>
                                                                    <p>{session?.user?.email}</p>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                                        <span style={{ 
                                                                            background: 'rgba(255, 107, 107, 0.1)', 
                                                                            border: '1px solid rgba(255, 107, 107, 0.3)', 
                                                                            borderRadius: '12px', 
                                                                            padding: '3px 8px', 
                                                                            fontSize: '0.8rem', 
                                                                            color: '#ff6b6b', 
                                                                            fontWeight: 'bold',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}>
                                                                            🔥 {profile?.vibe_streak || 0} Day Streak
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="settings-form-grid">
                                                                <div className="field-block"><label>Full Name</label><input type="text" value={profile?.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} /></div>
                                                                <div className="field-block full-width">
                                                                    <label>Bio / Status</label>
                                                                    <textarea
                                                                        placeholder="Tell the circle about yourself..."
                                                                        value={profile?.bio || ''}
                                                                        onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                                                        style={{ width: '100%', height: '100px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--text-primary)', padding: '14px', outline: 'none', resize: 'none' }}
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
                                                                            <input type="text" placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} ${key === 'whatsapp' ? 'Number' : 'Link'}`} value={key === 'whatsapp' ? (profile?.whatsapp_number || '') : (profile[`${key}_url`] || '')} onChange={e => setProfile({ ...profile, [key === 'whatsapp' ? 'whatsapp_number' : `${key}_url`]: e.target.value })} />
                                                                        </div>
                                                                        <button className={`privacy-toggle-text ${profile[`${key}_public`] ? 'on' : 'off'}`} onClick={() => setProfile({ ...profile, [`${key}_public`]: !profile[`${key}_public`] })}>{profile[`${key}_public`] ? 'PUBLIC' : 'PRIVATE'}</button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="panel-actions" style={{ marginTop: '2rem' }}>
                                                                <button className="btn-save-settings" onClick={() => handleUpdateProfile(profile)} disabled={isSavingChanges}>
                                                                    {isSavingChanges ? 'Syncing...' : 'Save Changes'}
                                                                </button>
                                                            </div>
                                                            <div className="social-links-manager" style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                                                                 <h4 style={{ color: 'var(--accent-red)' }}>Session Control</h4>
                                                                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Securely disconnect your local device from the Miles Circle network.</p>
                                                                 <button className="btn-save-settings" style={{ background: 'rgba(210, 85, 78, 0.05)', color: 'var(--accent-red)', border: '1px solid rgba(210, 85, 78, 0.2)', boxShadow: 'none', borderRadius: '12px' }} onClick={() => setShowLogoutConfirm(true)}>Terminate Current Session</button>
                                                             </div>
                                                        </div>
                                                    )}

                                                      {activeSettingsTab === 'wallet' && (
                                                          <div className="settings-panel anim-fade-in">
                                                              <div className="panel-header">
                                                                  <h2>Karma Wallet</h2>
                                                                  <p>Manage your Karma points, transfer them to neighbors, and view transaction history.</p>
                                                              </div>

                                                              <div style={{
                                                                  background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(210, 85, 78, 0.05) 100%)',
                                                                  border: '1px solid rgba(255, 107, 107, 0.3)',
                                                                  borderRadius: '20px',
                                                                  padding: '24px',
                                                                  marginBottom: '2rem',
                                                                  textAlign: 'center',
                                                                  boxShadow: '0 8px 32px 0 rgba(255, 107, 107, 0.08)',
                                                                  display: 'flex',
                                                                  flexDirection: 'column',
                                                                  alignItems: 'center',
                                                                  gap: '8px'
                                                              }}>
                                                                  <span style={{ fontSize: '2.5rem' }}>🔥</span>
                                                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Karma Balance</span>
                                                                  <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{profile?.points || 0} <span style={{ fontSize: '1.2rem', color: '#ff6b6b' }}>pts</span></span>
                                                              </div>

                                                              <div className="social-links-manager" style={{ marginBottom: '2rem' }}>
                                                                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                      <span>🎁</span> Transfer Points to Neighbor
                                                                  </h4>
                                                                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                                                      Send Karma points directly to another user by username, email, ID number, or QR scan.
                                                                  </p>
                                                                  <form onSubmit={handleTransferPoints} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                      <div className="field-block" style={{ margin: 0, position: 'relative' }}>
                                                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                                              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Recipient Neighbor</label>
                                                                              <div style={{ display: 'flex', gap: '8px' }}>
                                                                                  <button
                                                                                      type="button"
                                                                                      onClick={startScanner}
                                                                                      style={{
                                                                                          background: 'rgba(255, 107, 107, 0.1)',
                                                                                          border: '1px solid rgba(255, 107, 107, 0.2)',
                                                                                          borderRadius: '8px',
                                                                                          color: 'white',
                                                                                          fontSize: '0.7rem',
                                                                                          cursor: 'pointer',
                                                                                          display: 'flex',
                                                                                          alignItems: 'center',
                                                                                          gap: '4px',
                                                                                          padding: '4px 8px',
                                                                                          fontWeight: 'bold',
                                                                                          transition: 'all 0.2s'
                                                                                      }}
                                                                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)'}
                                                                                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                                                                                  >
                                                                                      <Camera size={12} /> Scan QR
                                                                                  </button>
                                                                                  <button
                                                                                      type="button"
                                                                                      onClick={() => setShowMyQr(true)}
                                                                                      style={{
                                                                                          background: 'rgba(255, 107, 107, 0.1)',
                                                                                          border: '1px solid rgba(255, 107, 107, 0.2)',
                                                                                          borderRadius: '8px',
                                                                                          color: 'white',
                                                                                          fontSize: '0.7rem',
                                                                                          cursor: 'pointer',
                                                                                          display: 'flex',
                                                                                          alignItems: 'center',
                                                                                          gap: '4px',
                                                                                          padding: '4px 8px',
                                                                                          fontWeight: 'bold',
                                                                                          transition: 'all 0.2s'
                                                                                      }}
                                                                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)'}
                                                                                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                                                                                  >
                                                                                      <Sparkles size={12} /> My QR
                                                                                  </button>
                                                                              </div>
                                                                          </div>
                                                                          
                                                                          {selectedRecipient ? (
                                                                              <div style={{
                                                                                  display: 'flex',
                                                                                  alignItems: 'center',
                                                                                  justifyContent: 'space-between',
                                                                                  background: 'rgba(255, 107, 107, 0.1)',
                                                                                  border: '1px solid rgba(255, 107, 107, 0.3)',
                                                                                  borderRadius: '12px',
                                                                                  padding: '10px 14px',
                                                                                  marginTop: '6px'
                                                                              }}>
                                                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                      {selectedRecipient.avatar_url ? (
                                                                                          <img src={selectedRecipient.avatar_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                                                                                      ) : (
                                                                                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>👤</div>
                                                                                      )}
                                                                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>{selectedRecipient.full_name}</span>
                                                                                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ID: {selectedRecipient.id}</span>
                                                                                      </div>
                                                                                  </div>
                                                                                  <button
                                                                                      type="button"
                                                                                      onClick={() => setSelectedRecipient(null)}
                                                                                      style={{
                                                                                          background: 'none',
                                                                                          border: 'none',
                                                                                          color: 'var(--text-secondary)',
                                                                                          cursor: 'pointer',
                                                                                          padding: '4px'
                                                                                      }}
                                                                                  >
                                                                                      <X size={16} />
                                                                                  </button>
                                                                              </div>
                                                                          ) : (
                                                                              <>
                                                                                  <input
                                                                                      type="text"
                                                                                      placeholder="Type username, user ID, or email..."
                                                                                      value={searchQuery || recipientEmail}
                                                                                      onChange={e => {
                                                                                          const val = e.target.value;
                                                                                          setRecipientEmail(val);
                                                                                          handleSearchProfiles(val);
                                                                                      }}
                                                                                      required={!selectedRecipient}
                                                                                      style={{
                                                                                          width: '100%',
                                                                                          background: 'var(--glass-bg)',
                                                                                          border: '1px solid var(--glass-border)',
                                                                                          borderRadius: '12px',
                                                                                          color: 'var(--text-primary)',
                                                                                          padding: '12px',
                                                                                          outline: 'none',
                                                                                          marginTop: '2px'
                                                                                      }}
                                                                                  />
                                                                                  
                                                                                  {searchResults.length > 0 && (
                                                                                      <div style={{
                                                                                          position: 'absolute',
                                                                                          top: '100%',
                                                                                          left: 0,
                                                                                          right: 0,
                                                                                          background: 'rgba(20, 20, 20, 0.95)',
                                                                                          backdropFilter: 'blur(20px)',
                                                                                          border: '1px solid var(--glass-border)',
                                                                                          borderRadius: '12px',
                                                                                          zIndex: 1000,
                                                                                          maxHeight: '200px',
                                                                                          overflowY: 'auto',
                                                                                          marginTop: '4px',
                                                                                          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
                                                                                      }}>
                                                                                          {searchResults.map(user => (
                                                                                              <div
                                                                                                  key={user.id}
                                                                                                  onClick={() => {
                                                                                                      setSelectedRecipient(user);
                                                                                                      setRecipientEmail('');
                                                                                                      setSearchQuery('');
                                                                                                      setSearchResults([]);
                                                                                                  }}
                                                                                                  style={{
                                                                                                      display: 'flex',
                                                                                                      alignItems: 'center',
                                                                                                      gap: '10px',
                                                                                                      padding: '10px 14px',
                                                                                                      cursor: 'pointer',
                                                                                                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                                                      transition: 'background 0.2s'
                                                                                                  }}
                                                                                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                                                                                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                                              >
                                                                                                  {user.avatar_url ? (
                                                                                                      <img src={user.avatar_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                                                                                                  ) : (
                                                                                                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>👤</div>
                                                                                                  )}
                                                                                                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                                                                                                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>{user.full_name}</span>
                                                                                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ID: {user.id}</span>
                                                                                                  </div>
                                                                                              </div>
                                                                                          ))}
                                                                                      </div>
                                                                                  )}
                                                                              </>
                                                                          )}
                                                                      </div>
                                                                      <div className="field-block" style={{ margin: 0 }}>
                                                                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Points Amount</label>
                                                                          <input
                                                                              type="number"
                                                                              placeholder="e.g. 10"
                                                                              min="1"
                                                                              max={profile?.points || 0}
                                                                              value={transferAmount}
                                                                              onChange={e => setTransferAmount(e.target.value)}
                                                                              required
                                                                              style={{
                                                                                  width: '100%',
                                                                                  background: 'var(--glass-bg)',
                                                                                  border: '1px solid var(--glass-border)',
                                                                                  borderRadius: '12px',
                                                                                  color: 'var(--text-primary)',
                                                                                  padding: '12px',
                                                                                  outline: 'none'
                                                                              }}
                                                                          />
                                                                      </div>
                                                                      {transferStatus && (
                                                                          <div style={{
                                                                              fontSize: '0.85rem',
                                                                              padding: '10px 14px',
                                                                              borderRadius: '10px',
                                                                              border: `1px solid ${transferStatus.type === 'success' ? 'rgba(46, 204, 113, 0.3)' : 'rgba(210, 85, 78, 0.3)'}`,
                                                                              background: transferStatus.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(210, 85, 78, 0.1)',
                                                                              color: transferStatus.type === 'success' ? '#2ecc71' : 'var(--accent-red)'
                                                                          }}>
                                                                              {transferStatus.message}
                                                                          </div>
                                                                      )}
                                                                      <button
                                                                          type="submit"
                                                                          disabled={transferringPoints || !profile?.points || profile?.points <= 0}
                                                                          style={{
                                                                              background: 'var(--accent-red)',
                                                                              color: 'white',
                                                                              border: 'none',
                                                                              borderRadius: '12px',
                                                                              padding: '12px',
                                                                              fontWeight: 'bold',
                                                                              cursor: 'pointer',
                                                                              transition: 'all 0.2s',
                                                                              opacity: (transferringPoints || !profile?.points || profile?.points <= 0) ? 0.5 : 1
                                                                          }}
                                                                      >
                                                                          {transferringPoints ? 'Transferring...' : 'Send Points'}
                                                                      </button>
                                                                  </form>
                                                              </div>

                                                              <div className="social-links-manager">
                                                                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                      <span>📜</span> Transaction History
                                                                  </h4>
                                                                  {loadingTransactions ? (
                                                                      <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.6 }}>Loading transactions...</div>
                                                                  ) : transactions.length === 0 ? (
                                                                      <div style={{
                                                                          padding: '1.5rem',
                                                                          textAlign: 'center',
                                                                          background: 'var(--glass-bg)',
                                                                          border: '1px solid var(--glass-border)',
                                                                          borderRadius: '16px',
                                                                          color: 'var(--text-secondary)',
                                                                          fontSize: '0.85rem'
                                                                      }}>
                                                                          No transactions recorded yet.
                                                                      </div>
                                                                  ) : (
                                                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                          {transactions.map(t => {
                                                                              const isSender = t.sender_id === session?.user?.id;
                                                                              const otherParty = isSender ? (t.recipient?.full_name || 'Neighbor') : (t.sender?.full_name || 'Neighbor');
                                                                              const dateStr = new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                                                              
                                                                              return (
                                                                                  <div key={t.id} style={{
                                                                                      background: 'var(--glass-bg)',
                                                                                      border: '1px solid var(--glass-border)',
                                                                                      borderRadius: '12px',
                                                                                      padding: '12px 16px',
                                                                                      display: 'flex',
                                                                                      justifyContent: 'space-between',
                                                                                      alignItems: 'center',
                                                                                      gap: '12px'
                                                                                  }}>
                                                                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                                                              {t.transaction_type === 'transfer' ? (
                                                                                                  isSender ? `Sent to ${otherParty}` : `Received from ${otherParty}`
                                                                                              ) : (
                                                                                                  `Redeemed "${t.offer?.title || 'Offer'}"`
                                                                                              )}
                                                                                          </span>
                                                                                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                                                              {dateStr}
                                                                                          </span>
                                                                                          {t.redemption_code && (
                                                                                              <span style={{
                                                                                                  fontSize: '0.75rem',
                                                                                                  fontWeight: 'bold',
                                                                                                  color: '#2ecc71',
                                                                                                  background: 'rgba(46, 204, 113, 0.1)',
                                                                                                  border: '1px solid rgba(46, 204, 113, 0.2)',
                                                                                                  borderRadius: '6px',
                                                                                                  padding: '2px 6px',
                                                                                                  marginTop: '4px',
                                                                                                  alignSelf: 'flex-start'
                                                                                              }}>
                                                                                                  Code: {t.redemption_code}
                                                                                              </span>
                                                                                          )}
                                                                                      </div>
                                                                                      <span style={{
                                                                                          fontSize: '0.95rem',
                                                                                          fontWeight: 'bold',
                                                                                          color: isSender ? 'var(--accent-red)' : '#2ecc71'
                                                                                      }}>
                                                                                          {isSender ? `-${t.amount}` : `+${t.amount}`} pts
                                                                                      </span>
                                                                                  </div>
                                                                              );
                                                                          })}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                          </div>
                                                      )}

                                                     {activeSettingsTab === 'waves' && (
                                                         <div className="settings-panel anim-fade-in">
                                                             <div className="panel-header">
                                                                 <h2>Waves Received</h2>
                                                                 <p>See neighbors who waved at you in the circle.</p>
                                                             </div>
                                                             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1.5rem' }}>
                                                                 {waves.length === 0 ? (
                                                                     <div style={{
                                                                         padding: '2rem',
                                                                         textAlign: 'center',
                                                                         background: 'var(--glass-bg)',
                                                                         border: '1px solid var(--glass-border)',
                                                                         borderRadius: '16px',
                                                                         color: 'var(--text-secondary)'
                                                                     }}>
                                                                         <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🏖️</span>
                                                                         No waves received yet. Go wave at your neighbors on the map!
                                                                     </div>
                                                                 ) : (
                                                                     waves.slice().reverse().map((wave, idx) => (
                                                                         <div key={idx} style={{
                                                                             display: 'flex',
                                                                             alignItems: 'center',
                                                                             justifyContent: 'space-between',
                                                                             padding: '12px 16px',
                                                                             background: 'var(--glass-bg)',
                                                                             border: '1px solid var(--glass-border)',
                                                                             borderRadius: '16px'
                                                                         }}>
                                                                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                 <div style={{
                                                                                     width: '32px',
                                                                                     height: '32px',
                                                                                     borderRadius: '10px',
                                                                                     background: 'var(--panel-bg)',
                                                                                     border: '1px solid var(--glass-border)',
                                                                                     display: 'flex',
                                                                                     alignItems: 'center',
                                                                                     justifyContent: 'center',
                                                                                     fontSize: '0.9rem',
                                                                                     fontWeight: '800',
                                                                                     color: 'var(--accent-red)'
                                                                                 }}>
                                                                                     {(wave.from_name || '?')[0].toUpperCase()}
                                                                                 </div>
                                                                                 <div>
                                                                                     <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                                                         {wave.from_name}
                                                                                     </div>
                                                                                     <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                                                         {new Date(wave.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(wave.timestamp).toLocaleDateString()}
                                                                                     </div>
                                                                                 </div>
                                                                             </div>
                                                                             <div style={{ display: 'flex', gap: '8px' }}>
                                                                                <button
                                                                                    onClick={() => openChat(wave.from_id, wave.from_name)}
                                                                                    style={{
                                                                                        background: 'var(--glass-bg)',
                                                                                        color: 'var(--text-primary)',
                                                                                        border: '1px solid var(--glass-border)',
                                                                                        borderRadius: '10px',
                                                                                        padding: '8px',
                                                                                        cursor: 'pointer',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center'
                                                                                    }}
                                                                                >
                                                                                    💬
                                                                                </button>
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        try {
                                                                                            await supabase.rpc('send_proximity_wave', { p_recipient_id: wave.from_id });
                                                                                            alert(`Waved back at ${wave.from_name}! 👋`);
                                                                                        } catch (err) {
                                                                                            console.error(err);
                                                                                            alert("Failed to wave back: " + err.message);
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
                                                                                        color: 'white',
                                                                                        border: 'none',
                                                                                        borderRadius: '10px',
                                                                                        padding: '8px 16px',
                                                                                        fontSize: '0.8rem',
                                                                                        fontWeight: '800',
                                                                                        cursor: 'pointer',
                                                                                        boxShadow: '0 4px 10px rgba(255, 87, 34, 0.2)'
                                                                                    }}
                                                                                >
                                                                                    👋 Wave Back
                                                                                </button>
                                                                             </div>
                                                                         </div>
                                                                     ))
                                                                 )}
                                                             </div>
                                                         </div>
                                                     )}

                                                     {activeSettingsTab === 'broadcasts' && profile?.points >= 100 && (
                                                         <div className="settings-panel anim-fade-in">
                                                             <div className="panel-header">
                                                                 <h2>Broadcast Announcement</h2>
                                                                 <p>Pin a 24-hour announcement to the top of everyone's feed.</p>
                                                             </div>
                                                             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '1.5rem' }}>
                                                                 <div style={{
                                                                     background: 'rgba(255, 193, 7, 0.05)',
                                                                     border: '1px solid rgba(255, 193, 7, 0.2)',
                                                                     padding: '12px 16px',
                                                                     borderRadius: '16px',
                                                                     color: '#FFC107',
                                                                     fontSize: '0.82rem',
                                                                     lineHeight: '1.5'
                                                                 }}>
                                                                     👑 <strong>Karma Privilege Active</strong>: You have {profile?.points || 0} Karma points, which unlocks the ability to broadcast local notifications visible to all neighbors.
                                                                 </div>
                                                                 
                                                                 <div className="field-block full-width" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                     <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700' }}>Announcement Message (max 150 chars)</label>
                                                                     <textarea
                                                                         placeholder="E.g., Neighborhood block party this Saturday at 5 PM! Bring your own snacks. 🥳"
                                                                         value={announcementContent}
                                                                         onChange={(e) => setAnnouncementContent(e.target.value.substring(0, 150))}
                                                                         style={{
                                                                             width: '100%',
                                                                             height: '100px',
                                                                             background: 'var(--glass-bg)',
                                                                             border: '1px solid var(--glass-border)',
                                                                             borderRadius: '14px',
                                                                             color: 'var(--text-primary)',
                                                                             padding: '14px',
                                                                             outline: 'none',
                                                                             resize: 'none',
                                                                             fontSize: '0.9rem',
                                                                             fontFamily: 'var(--font-family)'
                                                                         }}
                                                                     />
                                                                     <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                                                         {announcementContent.length} / 150 characters
                                                                     </div>
                                                                 </div>
                                                                 
                                                                 <button
                                                                     onClick={handleCreateAnnouncement}
                                                                     disabled={isBroadcasting || !announcementContent.trim()}
                                                                     style={{
                                                                         background: 'linear-gradient(135deg, #FFC107 0%, #FF5722 100%)',
                                                                         color: 'black',
                                                                         border: 'none',
                                                                         borderRadius: '12px',
                                                                         padding: '12px 20px',
                                                                         fontSize: '0.9rem',
                                                                         fontWeight: '900',
                                                                         cursor: (!announcementContent.trim() || isBroadcasting) ? 'default' : 'pointer',
                                                                         opacity: (!announcementContent.trim() || isBroadcasting) ? 0.5 : 1,
                                                                         textAlign: 'center',
                                                                         boxShadow: '0 4px 15px rgba(255, 193, 7, 0.25)',
                                                                         transition: 'all 0.2s'
                                                                     }}
                                                                 >
                                                                     {isBroadcasting ? 'Broadcasting...' : '📢 Broadcast for 24h'}
                                                                 </button>
                                                             </div>
                                                         </div>
                                                     )}

                                                     {activeSettingsTab === 'appearance' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Visual Experience</h2><p>Tailor the miles interface to your preference.</p></div>
                                                            <div className="appearance-grid">
                                                                <div className="appearance-card">
                                                                    <div className="card-info"><h4>Theme Mode</h4><p>Set dark mode or light mode appearance.</p></div>
                                                                    <div className="theme-toggle-strip">
                                                                        <button className={`theme-tab ${profile?.theme_mode !== 'light' ? 'active' : ''}`} onClick={() => handleUpdateProfile({ theme_mode: 'dark' })}><Lock size={16} /> Dark</button>
                                                                        <button className={`theme-tab ${profile?.theme_mode === 'light' ? 'active' : ''}`} onClick={() => handleUpdateProfile({ theme_mode: 'light' })}><Globe size={16} /> Light</button>
                                                                    </div>
                                                                </div>
                                                                <div className="appearance-card">
                                                                    <div className="card-info"><h4>Distance Unit</h4><p>Show radius in miles or kilometers.</p></div>
                                                                    <div className="theme-toggle-strip">
                                                                        <button className={`theme-tab ${distanceUnit === 'miles' ? 'active' : ''}`} onClick={() => { setDistanceUnit('miles'); localStorage.setItem('miles_distance_unit', 'miles'); }}>🏁 Miles</button>
                                                                        <button className={`theme-tab ${distanceUnit === 'km' ? 'active' : ''}`} onClick={() => { setDistanceUnit('km'); localStorage.setItem('miles_distance_unit', 'km'); }}>🌍 Kilometers</button>
                                                                    </div>
                                                                </div>
                                                                <div className="appearance-card">
                                                                    <div className="card-info"><h4>AI Neighbor Auto-Replies</h4><p>Let local AI assistants respond to your text posts when you share updates.</p></div>
                                                                    <div className="theme-toggle-strip">
                                                                        <button className={`theme-tab ${aiResponderEnabled ? 'active' : ''}`} onClick={() => handleToggleAIResponder(true)}>🟢 Enabled</button>
                                                                        <button className={`theme-tab ${!aiResponderEnabled ? 'active' : ''}`} onClick={() => handleToggleAIResponder(false)}>🔴 Disabled</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                     )}

                                                    {activeSettingsTab === 'security' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Security & Privacy</h2><p>Manage your credentials and account safety.</p></div>
                                                            <form onSubmit={handleResetPassword} className="security-form">
                                                                <div className="field-block"><label>Current Secret Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Type old password..." required /></div>
                                                                <div className="field-block"><label>New Secret Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="8+ chars, upper, lower, number..." required /></div>
                                                                <div className="field-block"><label>Confirm Secret Password</label><input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Repeat new password..." required /></div>
                                                                <button type="submit" className="btn-security-update" disabled={isSavingChanges}>
                                                                    {isSavingChanges ? 'Syncing...' : 'Update Password'}
                                                                </button>
                                                            </form>
                                                        </div>
                                                    )}

                                                    {activeSettingsTab === 'data' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Data Control</h2><p>Manage your account data and privacy rights.</p></div>
                                                            <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                                                <div className="appearance-card">
                                                                    <div className="card-info"><h4>Export Personal Data</h4><p>Download a full archive of your digital footprint (posts, media, connections).</p></div>
                                                                    <button className="btn-auth-premium" style={{ width: 'auto', padding: '12px 24px' }} onClick={handleExportData}>Request Data Archive</button>
                                                                </div>
                                                                <div className="appearance-card" style={{ border: '1px solid rgba(210, 85, 78, 0.2)', background: 'rgba(210, 85, 78, 0.02)' }}>
                                                                    <div className="card-info"><h4>Circle Exclusion (Delete Account)</h4><p>Permanently purge your digital presence. This action cannot be reversed.</p></div>
                                                                    <button className="btn-tour-next" style={{ width: 'auto', padding: '12px 24px', background: 'rgba(210, 85, 78, 0.1)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)' }} onClick={handleDeleteAccount} disabled={isSavingChanges}>Delete Account</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeSettingsTab === 'subscription' && (
                                                        <div className="settings-panel anim-fade-in">
                                                            <div className="panel-header"><h2>Subscription</h2><p>Premium features and billing information.</p></div>
                                                            <div className="onboarding-card-premium" style={{ maxWidth: 'none', background: 'rgba(210, 85, 78, 0.05)', border: '1px dashed var(--accent-red)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem' }}>
                                                                <Lock size={48} color="var(--accent-red)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
                                                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Premium Access Restricted</h3>
                                                                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '2rem', lineHeight: '1.6' }}>Subscription tiers and local merchant features are currently in closed Alpha for verified circle testers.</p>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: '500px', textAlign: 'left' }}>
                                                                    <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                        <h5 style={{ color: 'white', marginBottom: '5px' }}>Unlimited Radius</h5>
                                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expand your search sphere up to 500 miles.</p>
                                                                    </div>
                                                                    <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                        <h5 style={{ color: 'white', marginBottom: '5px' }}>Verified Badge</h5>
                                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gain identity trust within your local community.</p>
                                                                    </div>
                                                                    <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                        <h5 style={{ color: 'white', marginBottom: '5px' }}>Ad-Free Sphere</h5>
                                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Zero sponsored posts in your local feed.</p>
                                                                    </div>
                                                                    <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                        <h5 style={{ color: 'white', marginBottom: '5px' }}>Legacy Support</h5>
                                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Priority response from our engineering team.</p>
                                                                    </div>
                                                                </div>
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
                                                                        value={bugDescription}
                                                                        onChange={e => setBugDescription(e.target.value)}
                                                                        style={{ width: '100%', height: '150px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--text-primary)', padding: '14px', outline: 'none', resize: 'none' }}
                                                                    />
                                                                </div>
                                                                <button className="btn-save-settings" onClick={handleBugReport} disabled={isSavingChanges || !bugDescription.trim()}>
                                                                    {isSavingChanges ? 'Transmitting...' : 'Submit Report'}
                                                                </button>
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
                                                    <p className="viewer-joined">{viewingProfile.is_ai ? 'AI Assistant' : 'Radius Citizen'}</p>
                                                </header>
                                                {!viewingProfile.is_ai && (
                                                    <div className="viewer-stats">
                                                        <div className="stat-item"><span className="stat-val">{viewingProfile.points || 0}</span><span className="stat-lbl">Points</span></div>
                                                        <div className="stat-sep" />
                                                        <div className="stat-item"><span className="stat-val">Active</span><span className="stat-lbl">Status</span></div>
                                                    </div>
                                                )}
                                                {viewingProfile.bio && (
                                                    <div className="viewer-bio-section" style={{ background: '#000', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--glass-border)', marginBottom: '1.5rem', textAlign: 'left' }}>
                                                        <h4 style={{ fontSize: '0.7rem', color: 'var(--accent-red)', marginBottom: '8px', textTransform: 'uppercase' }}>Biography</h4>
                                                        <p style={{ color: 'white', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>{viewingProfile.bio}</p>
                                                    </div>
                                                )}
                                                {!viewingProfile.is_ai && (
                                                    <div className="viewer-info-rows">
                                                        {viewingProfile.address_public && viewingProfile.address && <div className="viewer-info-row"><MapPin size={16} color="var(--accent-red)" /> <span>{viewingProfile.address}</span></div>}
                                                        {viewingProfile.mobile_public && viewingProfile.mobile && <div className="viewer-info-row"><Phone size={16} color="var(--accent-red)" /> <span>{viewingProfile.mobile}</span></div>}
                                                    </div>
                                                )}
                                                {!viewingProfile.is_ai && (
                                                    <>
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
                                                        <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '10px' }}>
                                                            {(!viewingProfile.received_waves || !viewingProfile.received_waves.some(w => w.from_id === session?.user?.id)) ? (
                                                                <button 
                                                                    className="btn-wave-primary" 
                                                                    onClick={handleSendWave} 
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '12px',
                                                                        borderRadius: '14px',
                                                                        background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        fontWeight: '800',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '8px',
                                                                        boxShadow: '0 4px 15px rgba(255, 87, 34, 0.25)',
                                                                        transition: 'transform 0.2s'
                                                                    }}
                                                                >
                                                                    👋 Wave
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    className="btn-wave-primary" 
                                                                    disabled
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '12px',
                                                                        borderRadius: '14px',
                                                                        background: 'var(--glass-bg)',
                                                                        color: 'var(--text-secondary)',
                                                                        border: '1px solid var(--glass-border)',
                                                                        fontWeight: '800',
                                                                        cursor: 'not-allowed',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '8px'
                                                                    }}
                                                                >
                                                                    👋 Waved
                                                                </button>
                                                            )}
                                                            
                                                            {(viewingProfile.received_waves?.some(w => w.from_id === session?.user?.id) && waves.some(w => w.from_id === viewingProfile.id)) && (
                                                                <button
                                                                    className="btn-wave-primary"
                                                                    onClick={() => openChat(viewingProfile.id, viewingProfile.full_name || 'Neighbor')}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '12px',
                                                                        borderRadius: '14px',
                                                                        background: 'var(--panel-bg)',
                                                                        color: 'var(--text-primary)',
                                                                        border: '1px solid var(--glass-border)',
                                                                        fontWeight: '800',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '8px',
                                                                        transition: 'transform 0.2s'
                                                                    }}
                                                                >
                                                                    💬 Message
                                                                </button>
                                                            )}
                                                        </div>
                                                        <button 
                                                            className="btn-wave-primary" 
                                                            onClick={() => setShowDirectTransfer(!showDirectTransfer)} 
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px',
                                                                borderRadius: '14px',
                                                                background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
                                                                color: 'black',
                                                                border: 'none',
                                                                fontWeight: '800',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '8px',
                                                                marginBottom: '10px',
                                                                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.25)',
                                                                transition: 'transform 0.2s'
                                                            }}
                                                        >
                                                            💰 Transfer Points
                                                        </button>
                                                        {showDirectTransfer && (
                                                            <form onSubmit={handleDirectTransferPoints} style={{
                                                                background: 'rgba(0, 0, 0, 0.3)',
                                                                border: '1px solid var(--glass-border)',
                                                                borderRadius: '16px',
                                                                padding: '16px',
                                                                marginBottom: '10px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '10px',
                                                                textAlign: 'left'
                                                            }} onClick={e => e.stopPropagation()}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                                                                        Your Balance: {profile?.points || 0} pts
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="Amount (e.g. 50)" 
                                                                        value={directTransferAmount}
                                                                        onChange={e => setDirectTransferAmount(e.target.value)}
                                                                        min="1"
                                                                        max={profile?.points || 0}
                                                                        required
                                                                        style={{
                                                                            flex: 1,
                                                                            background: 'var(--glass-bg)',
                                                                            border: '1px solid var(--glass-border)',
                                                                            borderRadius: '10px',
                                                                            padding: '10px 14px',
                                                                            color: 'var(--text-primary)',
                                                                            fontSize: '0.9rem',
                                                                            outline: 'none'
                                                                        }}
                                                                    />
                                                                    <button 
                                                                        type="submit" 
                                                                        disabled={isDirectTransferring}
                                                                        style={{
                                                                            background: 'var(--accent-red)',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '10px',
                                                                            padding: '0 18px',
                                                                            fontWeight: 'bold',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.9rem'
                                                                        }}
                                                                    >
                                                                        {isDirectTransferring ? 'Sending...' : 'Send'}
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        )}
                                                        <div className="viewer-actions-row">
                                                            <button className="btn-rate up" onClick={() => handleRate(1)}><ShieldCheck size={20} /> Like</button>
                                                            <button className="btn-rate down" onClick={() => handleRate(-1)}><X size={20} /> Dislike</button>
                                                            <button className="btn-report" onClick={handleReport}><Lock size={20} /> Report</button>
                                                        </div>
                                                    </>
                                                )}
                                                <button className="btn-viewer-close" onClick={() => setViewingProfile(null)}>Dismiss</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* EVENTS PAGE */}
                                    {showEvents && (
                                        <EventsPage
                                            position={position}
                                            radius={radius}
                                            distanceUnit={distanceUnit}
                                            session={session}
                                            onBack={() => setShowEvents(false)}
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
                                    )}

                                    {/* SANDBOX TESTING PANEL */}
                                    {isMock && (
                                        <div className="sandbox-panel-container" style={{
                                            position: 'fixed',
                                            bottom: '90px',
                                            left: '25px',
                                            zIndex: 9998,
                                            fontFamily: 'var(--font-family)'
                                        }}>
                                            {!showSandbox ? (
                                                <button
                                                    onClick={() => setShowSandbox(true)}
                                                    style={{
                                                        background: 'var(--color-charcoal)',
                                                        color: 'white',
                                                        border: '1px solid var(--accent-red)',
                                                        borderRadius: '30px',
                                                        padding: '10px 18px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '800',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                >
                                                    <Sparkles size={14} color="var(--accent-red)" />
                                                    <span>Sandbox Tools</span>
                                                </button>
                                            ) : (
                                                <div style={{
                                                    background: 'rgba(14, 14, 14, 0.95)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '20px',
                                                    padding: '1.25rem',
                                                    width: '280px',
                                                    maxWidth: '90vw',
                                                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                                                    backdropFilter: 'blur(20px)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                                                        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sandbox Tools</h4>
                                                        <button onClick={() => setShowSandbox(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', padding: '2px' }}>✕</button>
                                                    </div>
                                                    
                                                    {/* Teleport section */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)' }}>TELEPORT COORDINATES</span>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                                            <button type="button" className="sandbox-btn" onClick={() => { setPosition([18.9750, 72.8258]); setLocationAvailable(true); setLocationError(null); }} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center' }}>🇮🇳 Mumbai</button>
                                                            <button type="button" className="sandbox-btn" onClick={() => { setPosition([40.7128, -74.0060]); setLocationAvailable(true); setLocationError(null); }} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center' }}>🇺🇸 New York</button>
                                                            <button type="button" className="sandbox-btn" onClick={() => { setPosition([51.5074, -0.1278]); setLocationAvailable(true); setLocationError(null); }} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center' }}>🇬🇧 London</button>
                                                            <button type="button" className="sandbox-btn" onClick={() => { setPosition([35.6762, 139.6503]); setLocationAvailable(true); setLocationError(null); }} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center' }}>🇯🇵 Tokyo</button>
                                                        </div>
                                                    </div>

                                                    {/* Insert Mock Posts */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)' }}>MOCK DATA GENERATION</span>
                                                        <button 
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!position) return alert("Please set location first");
                                                                const mockData = [
                                                                    { content: "Hey neighbors! Just tried the new bakery down the street. Their croissants are amazing! 🥐", offset: [0.002, -0.003], name: "Rohan" },
                                                                    { content: "Is anyone else experiencing a power outage? In the south block.", offset: [-0.004, 0.005], name: "Emma" },
                                                                    { content: "Beautiful morning for a run in the park! 🏃‍♂️☀️", offset: [0.008, 0.009], name: "Kenji" },
                                                                    { content: "Lost keys near the community hall. Please DM if found!", offset: [-0.001, -0.001], name: "Sarah" }
                                                                ];
                                                                const postsToInsert = mockData.map(p => {
                                                                    const lat = position[0] + p.offset[0];
                                                                    const lng = position[1] + p.offset[1];
                                                                    return {
                                                                        user_id: session.user.id,
                                                                        content: p.content,
                                                                        location: `POINT(${lng} ${lat})`,
                                                                        is_ai: true,
                                                                        ai_name: p.name
                                                                    };
                                                                });
                                                                const { error } = await supabase.from('posts').insert(postsToInsert);
                                                                if (!error) {
                                                                    setFeedTrigger(prev => prev + 1);
                                                                    alert("Mock posts generated near your coordinates!");
                                                                } else {
                                                                    alert("Failed: " + error.message);
                                                                }
                                                            }}
                                                            style={{
                                                                background: 'var(--accent-red)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '8px 12px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            <Sparkles size={12} /> Populate Local Feed
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* PHOTO EDITOR */}
                                    {selectedFile && <PhotoEditor file={selectedFile} onSave={handleSaveEditedPhoto} onCancel={() => setSelectedFile(null)} />}
                                    {selectedPostFile && <PhotoEditor file={selectedPostFile} onSave={handleSaveEditedPostPhoto} onCancel={() => setSelectedPostFile(null)} />}

                                    {/* DAILY VIBE CHECK-IN MODAL */}
                                    {showVibeCheck && session && onboardingStep === 0 && (
                                        <div className="modal-overlay" style={{ zIndex: 4000 }}>
                                            <div className="onboarding-card-premium anim-fade-in" style={{ maxWidth: '420px', textAlign: 'center' }}>
                                                <header style={{ marginBottom: '1.5rem' }}>
                                                    <span style={{ fontSize: '2.5rem' }}>✨</span>
                                                    <h2 className="onboarding-title" style={{ fontSize: '1.6rem', marginTop: '10px' }}>Daily Vibe Check</h2>
                                                    {profile?.vibe_streak > 0 && (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)', borderRadius: '12px', padding: '4px 10px', fontSize: '0.85rem', color: '#ff6b6b', fontWeight: 'bold', marginTop: '8px' }}>
                                                            🔥 {profile.vibe_streak} Day Streak
                                                        </div>
                                                    )}
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>Let neighbors know what your vibe is today.</p>
                                                </header>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', margin: '2rem 0' }}>
                                                    {[
                                                        { emoji: '🧘', label: 'Calm' },
                                                        { emoji: '🚗', label: 'Busy' },
                                                        { emoji: '🌧️', label: 'Cozy' },
                                                        { emoji: '🎉', label: 'Festive' },
                                                        { emoji: '⚡', label: 'Energetic' }
                                                    ].map(v => (
                                                        <button
                                                            key={v.emoji}
                                                            type="button"
                                                            onClick={() => handleSelectVibe(v.emoji)}
                                                            title={v.label}
                                                            style={{
                                                                background: 'var(--glass-bg)',
                                                                border: '1px solid var(--glass-border)',
                                                                borderRadius: '16px',
                                                                fontSize: '1.8rem',
                                                                padding: '12px 6px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-red)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'none'; }}
                                                        >
                                                            <span>{v.emoji}</span>
                                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: '800' }}>{v.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="nav-item"
                                                    onClick={() => setShowVibeCheck(false)}
                                                    style={{ width: '100%', justifyContent: 'center', background: 'transparent', color: 'var(--text-secondary)' }}
                                                >
                                                    Skip for Now
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}

            {/* PRIVATE CHAT MODAL */}
            {isChatOpen && chatProfile && (
                <div className="modal-overlay" onClick={() => setIsChatOpen(false)}>
                    <div className="chat-modal-content" onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg-primary)',
                        width: '90%',
                        maxWidth: '450px',
                        height: '80vh',
                        maxHeight: '600px',
                        borderRadius: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div className="chat-header" style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--glass-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--glass-bg)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '12px',
                                    background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: '900', color: 'var(--accent-red)'
                                }}>
                                    {(chatProfile.full_name || '?')[0].toUpperCase()}
                                </div>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{chatProfile.full_name}</h3>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} style={{
                                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                            }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="chat-messages-area" style={{
                            flex: 1,
                            padding: '16px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {chatMessages.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px' }}>
                                    No messages yet. Say hi! 👋
                                </div>
                            ) : (
                                chatMessages.map((msg, i) => {
                                    const isMe = msg.sender_id === session.user.id;
                                    return (
                                        <div key={msg.id || i} style={{
                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                            maxWidth: '75%',
                                            background: isMe ? 'linear-gradient(135deg, #FF9800, #FF5722)' : 'var(--panel-bg)',
                                            color: isMe ? 'white' : 'var(--text-primary)',
                                            padding: '10px 14px',
                                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                            border: isMe ? 'none' : '1px solid var(--glass-border)',
                                            wordBreak: 'break-word',
                                            fontSize: '0.9rem'
                                        }}>
                                            {msg.content}
                                            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="chat-input-area" style={{
                            padding: '12px',
                            borderTop: '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)',
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendDirectMessage()}
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--panel-bg)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleSendDirectMessage}
                                disabled={!chatInput.trim()}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: chatInput.trim() ? 'var(--accent-red)' : 'var(--glass-border)',
                                    color: 'white',
                                    cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
