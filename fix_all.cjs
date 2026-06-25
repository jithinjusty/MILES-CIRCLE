const fs = require('fs');

// 1. CommunityPage: Remove BorrowingShed
let commContent = fs.readFileSync('src/components/CommunityPage.jsx', 'utf-8');
commContent = commContent.replace("import BorrowingShed from './BorrowingShed';\n", "");
commContent = commContent.replace("<BorrowingShed session={session} />\n", "");
fs.writeFileSync('src/components/CommunityPage.jsx', commContent, 'utf-8');

// 2. ClubsPanel: fix flex wrap
let clubsContent = fs.readFileSync('src/components/ClubsPanel.jsx', 'utf-8');
clubsContent = clubsContent.replace("<div style={{ display: 'flex', gap: '8px' }}>", "<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>");
fs.writeFileSync('src/components/ClubsPanel.jsx', clubsContent, 'utf-8');

// 3. App.jsx: Remove waves from Settings and pass waves to Feed
let appContent = fs.readFileSync('src/App.jsx', 'utf-8');
appContent = appContent.replace(
    "<button className={`nav-item ${activeSettingsTab === 'waves' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('waves')}><span>👋</span> <span>Waves Received</span></button>\n", 
    ""
);

appContent = appContent.replace(
    "activeNeighborsCount={activeNeighbors.length + 1}", 
    "activeNeighborsCount={activeNeighbors.length + 1}\n                                                        waves={waves}"
);

fs.writeFileSync('src/App.jsx', appContent, 'utf-8');

// 4. Feed.jsx: Receive waves, show waves box, show waves modal
let feedContent = fs.readFileSync('src/components/Feed.jsx', 'utf-8');

feedContent = feedContent.replace(
    "hasVibedToday = false }) {", 
    "hasVibedToday = false, waves = [] }) {\n    const [showWavesModal, setShowWavesModal] = useState(false);"
);

const vibeDiagnosticTarget = "{/* Neighborhood Vibe Gauge */}";
const wavesBanner = `
            {/* Waves Received Gauge */}
            <div 
                onClick={() => setShowWavesModal(true)}
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.01) 100%)',
                    borderBottom: '1px solid var(--glass-border)',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    boxSizing: 'border-box'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 152, 0, 0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.01) 100%)'}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem' }}>👋</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                            WAVES RECEIVED
                        </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'white', fontWeight: '800', background: 'var(--accent-red)', padding: '3px 8px', borderRadius: '8px' }}>
                        {waves.length}
                    </span>
                </div>
            </div>

            {/* Neighborhood Vibe Gauge */}`;
feedContent = feedContent.replace(vibeDiagnosticTarget, wavesBanner);

const wavesModalTarget = "{/* Create Barter Modal */}";
const wavesModalCode = `
            {/* Waves Received Modal */}
            {showWavesModal && (
                <div className="modal-overlay" style={{ zIndex: 4000, display: 'block', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '20px 10px' }} onClick={() => setShowWavesModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        marginTop: '40px', marginBottom: '40px', padding: '24px', background: 'var(--panel-bg)',
                        border: '1px solid var(--glass-border)', borderRadius: '24px', position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 className="onboarding-title" style={{ fontSize: '1.5rem', margin: 0 }}>Waves Received</h2>
                            <button onClick={() => setShowWavesModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {waves.length === 0 ? (
                                <div style={{
                                    padding: '2rem', textAlign: 'center', background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)', borderRadius: '16px', color: 'var(--text-secondary)'
                                }}>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🏖️</span>
                                    No waves received yet.
                                </div>
                            ) : (
                                waves.slice().reverse().map((wave, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 16px', background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)', borderRadius: '16px',
                                        flexWrap: 'wrap', gap: '10px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '10px',
                                                background: 'var(--panel-bg)', border: '1px solid var(--glass-border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent-red)'
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
                                        <button onClick={() => {
                                            setShowWavesModal(false);
                                            onUserClick(wave.from_id);
                                        }} style={{
                                            background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
                                            color: 'white', border: 'none', borderRadius: '10px',
                                            padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer'
                                        }}>
                                            View Profile
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Barter Modal */}`;
feedContent = feedContent.replace(wavesModalTarget, wavesModalCode);

fs.writeFileSync('src/components/Feed.jsx', feedContent, 'utf-8');

// 5. CSS fix
let cssContent = fs.readFileSync('src/index.css', 'utf-8');
if (!cssContent.includes("overflow-x: hidden")) {
    cssContent += "\n\nhtml, body { overflow-x: hidden; max-width: 100vw; }\n";
    fs.writeFileSync('src/index.css', cssContent, 'utf-8');
}
console.log("All fixes applied successfully!");
