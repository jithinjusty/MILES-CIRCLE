import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { Plus, List } from 'lucide-react'
import './App.css'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase'
import SplashScreen from './components/SplashScreen'
import AuthOverlay from './components/AuthOverlay'
import CreatePostModal from './components/CreatePostModal'
import Feed from './components/Feed'

// Fix for default marker icon in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Sub-component to handle map effects (The "Globe Effect")
function MapController({ center, radius }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Wait for map to be fully initialized
        map.whenReady(() => {
            try {
                // Calculate bounds for the circle
                const meters = radius * 1609.34;
                // Create a temporary circle to get bounds (purely logical)
                const circle = L.circle(center, { radius: meters });

                map.fitBounds(circle.getBounds(), {
                    padding: [20, 20], // Minimal padding to fill screen
                    animate: true,
                    duration: 1.2, // Smooth animation
                    easeLinearity: 0.25
                });
            } catch (error) {
                console.warn('Map bounds calculation failed:', error);
            }
        });
    }, [center, radius, map]);

    return null;
}

function App() {
    const [showSplash, setShowSplash] = useState(true)
    const [session, setSession] = useState(null)
    const [radius, setRadius] = useState(1); // miles
    const [position, setPosition] = useState([40.7128, -74.0060]); // NYC Default
    const [locationAvailable, setLocationAvailable] = useState(false);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [showFeed, setShowFeed] = useState(false);

    useEffect(() => {
        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        // 2. Get User Location (Phase 1 simplistic approach)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                setPosition([latitude, longitude]);
                setLocationAvailable(true);
            }, (err) => {
                console.error("Location error:", err);
                // Fallback to default or ask permission (handled by browser)
            }, {
                enableHighAccuracy: true
            });
        }

        return () => subscription.unsubscribe()
    }, [])

    // Handlers
    const handleRadiusChange = (e) => {
        setRadius(parseFloat(e.target.value));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    }

    const handlePostCreated = () => {
        setShowCreatePost(false)
        // Optionally refresh feed or show success message
    }

    return (
        <div className="app-container">
            {/* SPLASH SCREEN */}
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

            {/* AUTH CHECK */}
            {!showSplash && !session && <AuthOverlay />}

            {/* MAP LAYER */}
            <MapContainer
                center={position}
                zoom={13}
                zoomControl={false}
                className="map-view"
            >
                <TileLayer
                    // CartoDB Voyager - Clean, cream-ish, premium style
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {/* User Location */}
                {locationAvailable && <Marker position={position} />}

                {/* The Radius Circle */}
                <Circle
                    center={position}
                    pathOptions={{
                        color: '#D2554E',
                        fillColor: '#D2554E',
                        fillOpacity: 0.08,
                        weight: 2,
                        dashArray: '4, 8',
                        className: 'breathing-circle'
                    }}
                    radius={radius * 1609.34}
                />

                <MapController center={position} radius={radius} />
            </MapContainer>

            {/* UI OVERLAY */}
            <header className="app-header frosted-glass">
                <img src="/logo.png" alt="Miles Circle Logo" className="header-logo" />
                {session && (
                    <button
                        onClick={handleLogout}
                        className="header-btn"
                    >
                        Log Out
                    </button>
                )}
            </header>

            {/* RADIUS CONTROL */}
            {session && (
                <div className="radius-control-container frosted-glass">
                    <div className="radius-info">
                        <span>Radius: </span>
                        <span className="text-red" style={{ fontSize: '1.4em', fontWeight: '800' }}>{radius}</span>
                        <span style={{ fontSize: '0.9em', color: '#666' }}> miles</span>
                    </div>

                    <input
                        type="range"
                        min="0.5"
                        max="50"
                        step="0.5"
                        value={radius}
                        onChange={handleRadiusChange}
                        className="radius-slider"
                    />

                    <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', fontWeight: 500 }}>
                        Draw your circle
                    </p>
                </div>
            )}

            {/* FLOATING ACTION BUTTONS */}
            {session && (
                <div className="fab-container">
                    <button
                        className="fab fab-primary"
                        onClick={() => setShowCreatePost(true)}
                        title="Create Post"
                    >
                        <Plus size={28} strokeWidth={2.5} />
                    </button>
                    <button
                        className="fab fab-secondary"
                        onClick={() => setShowFeed(true)}
                        title="View Feed"
                    >
                        <List size={28} strokeWidth={2.5} />
                    </button>
                </div>
            )}

            {/* MODALS */}
            {showCreatePost && (
                <CreatePostModal
                    position={position}
                    onClose={() => setShowCreatePost(false)}
                    onPostCreated={handlePostCreated}
                />
            )}

            {showFeed && (
                <Feed
                    position={position}
                    radius={radius}
                    onClose={() => setShowFeed(false)}
                />
            )}
        </div>
    )
}

export default App
