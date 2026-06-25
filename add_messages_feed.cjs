const fs = require('fs');

let feedContent = fs.readFileSync('src/components/Feed.jsx', 'utf-8');

// 1. Add showMessagesModal state
feedContent = feedContent.replace(
    "const [showWavesModal, setShowWavesModal] = useState(false);",
    "const [showWavesModal, setShowWavesModal] = useState(false);\n    const [showMessagesModal, setShowMessagesModal] = useState(false);"
);

// 2. Replace Waves Gauge with a side-by-side Waves & Messages Gauge
const wavesGaugeRegex = /\{\/\* Waves Received Gauge \*\/\}[\s\S]*?\{\/\* Neighborhood Vibe Gauge \*\/\}/;

const stickyHeaders = `
            {/* Steady Headers: Waves & Messages */}
            <div style={{
                position: 'sticky',
                top: '55px',
                zIndex: 9,
                display: 'flex',
                background: 'rgba(30, 30, 30, 0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--glass-border)',
                width: '100%',
                boxSizing: 'border-box',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
            }}>
                <div 
                    onClick={() => setShowWavesModal(true)}
                    style={{
                        flex: 1,
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        borderRight: '1px solid var(--glass-border)',
                        transition: 'all 0.2s',
                        color: 'var(--text-primary)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <span style={{ fontSize: '1.2rem' }}>👋</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.5px' }}>WAVES ({waves.length})</span>
                </div>
                
                <div 
                    onClick={() => setShowMessagesModal(true)}
                    style={{
                        flex: 1,
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: 'var(--text-primary)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <span style={{ fontSize: '1.2rem' }}>💬</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.5px' }}>MESSAGES</span>
                </div>
            </div>

            {/* Neighborhood Vibe Gauge */}`;

feedContent = feedContent.replace(wavesGaugeRegex, stickyHeaders);

// 3. Add Messages Modal
const wavesModalTarget = "{/* Waves Received Modal */}";
const messagesModalCode = `
            {/* Messages Modal */}
            {showMessagesModal && (
                <div className="modal-overlay" style={{ zIndex: 4000, display: 'block', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '20px 10px' }} onClick={() => setShowMessagesModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        marginTop: '40px', marginBottom: '40px', padding: '24px', background: 'var(--panel-bg)',
                        border: '1px solid var(--glass-border)', borderRadius: '24px', position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 className="onboarding-title" style={{ fontSize: '1.5rem', margin: 0 }}>Messages</h2>
                            <button onClick={() => setShowMessagesModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        
                        <div style={{
                            padding: '2rem', textAlign: 'center', background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)', borderRadius: '16px', color: 'var(--text-secondary)'
                        }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>💬</span>
                            <div style={{ marginBottom: '10px' }}>To start a private chat, open a neighbor's profile and click Message.</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Incoming messages will pop up automatically.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Waves Received Modal */}`;
feedContent = feedContent.replace(wavesModalTarget, messagesModalCode);

fs.writeFileSync('src/components/Feed.jsx', feedContent, 'utf-8');
console.log("Messages UI added to Feed successfully!");
