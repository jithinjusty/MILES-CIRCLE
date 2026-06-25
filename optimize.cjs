const fs = require('fs');

// 1. Patch App.jsx
let app = fs.readFileSync('src/App.jsx', 'utf-8');

// Add activeChats state
app = app.replace(
    "const [waves, setWaves] = useState([]);",
    "const [waves, setWaves] = useState([]);\n    const [activeChats, setActiveChats] = useState([]);"
);

// Update setupRealtime fetching logic
const setupTarget = `        // Initial fetch of waves
        supabase.from('profiles').select('received_waves').eq('id', session.user.id).single()
            .then(({ data }) => {
                if (data && Array.isArray(data.received_waves)) {
                    setWaves(data.received_waves);
                }
            });`;

const setupReplacement = `        // Initial fetch of waves and chats
        const fetchInitialData = async () => {
            const { data } = await supabase.from('profiles').select('received_waves, sent_waves').eq('id', session.user.id).single();
            if (data) {
                const rWaves = Array.isArray(data.received_waves) ? data.received_waves : [];
                const sWaves = Array.isArray(data.sent_waves) ? data.sent_waves : [];
                setWaves(rWaves.filter(w => !sWaves.some(sw => sw.to_id === w.from_id)));
            }
            
            const { data: dMsgs } = await supabase.from('direct_messages').select('id, sender_id, recipient_id, content, created_at, sender:sender_id(full_name), recipient:recipient_id(full_name)').or(\`sender_id.eq.\${session.user.id},recipient_id.eq.\${session.user.id}\`).order('created_at', { ascending: false });
            if (dMsgs) {
                const chatsMap = new Map();
                dMsgs.forEach(msg => {
                    const otherId = msg.sender_id === session.user.id ? msg.recipient_id : msg.sender_id;
                    const otherName = msg.sender_id === session.user.id ? msg.recipient?.full_name : msg.sender?.full_name;
                    if (!chatsMap.has(otherId)) {
                        chatsMap.set(otherId, { otherId, otherName: otherName || 'Neighbor', lastMessage: msg.content, timestamp: msg.created_at });
                    }
                });
                setActiveChats(Array.from(chatsMap.values()));
            }
        };
        fetchInitialData();`;

app = app.replace(setupTarget, setupReplacement);

// Update wave listener to apply filtering when a new wave comes in
// Actually, wave listener gets the whole profile record from realtime
const profileListenerTarget = `                if (newProfile && Array.isArray(newProfile.received_waves)) {
                    const newWaves = newProfile.received_waves;
                    setWaves(newWaves);`;

const profileListenerReplacement = `                if (newProfile) {
                    const newWaves = Array.isArray(newProfile.received_waves) ? newProfile.received_waves : [];
                    const sentWaves = Array.isArray(newProfile.sent_waves) ? newProfile.sent_waves : [];
                    setWaves(newWaves.filter(w => !sentWaves.some(sw => sw.to_id === w.from_id)));`;

app = app.replace(profileListenerTarget, profileListenerReplacement);

// Update messages listener to update activeChats
const msgListenerTarget = `                    if (!isChatOpen || chatProfile?.id !== newMsg.sender_id) {
                        alert(\`New message received! 💬\`);
                    }`;
const msgListenerReplacement = `                    if (!isChatOpen || chatProfile?.id !== newMsg.sender_id) {
                        alert(\`New message received! 💬\`);
                    }
                    supabase.from('direct_messages').select('id, sender_id, recipient_id, content, created_at, sender:sender_id(full_name), recipient:recipient_id(full_name)').or(\`sender_id.eq.\${session.user.id},recipient_id.eq.\${session.user.id}\`).order('created_at', { ascending: false }).then(({ data: dMsgs }) => {
                        if (dMsgs) {
                            const chatsMap = new Map();
                            dMsgs.forEach(msg => {
                                const otherId = msg.sender_id === session.user.id ? msg.recipient_id : msg.sender_id;
                                const otherName = msg.sender_id === session.user.id ? msg.recipient?.full_name : msg.sender?.full_name;
                                if (!chatsMap.has(otherId)) chatsMap.set(otherId, { otherId, otherName: otherName || 'Neighbor', lastMessage: msg.content, timestamp: msg.created_at });
                            });
                            setActiveChats(Array.from(chatsMap.values()));
                        }
                    });`;
app = app.replace(msgListenerTarget, msgListenerReplacement);

// Pass activeChats to Feed
app = app.replace("waves={waves}", "waves={waves}\n                                                        activeChats={activeChats}");
fs.writeFileSync('src/App.jsx', app, 'utf-8');

// 2. Patch Feed.jsx
let feed = fs.readFileSync('src/components/Feed.jsx', 'utf-8');

feed = feed.replace(
    "hasVibedToday = false, waves = [] }) {",
    "hasVibedToday = false, waves = [], activeChats = [] }) {"
);

// Update messages modal
const msgModalTargetRegex = /<div style=\{\{\s*padding: '2rem', textAlign: 'center'[\s\S]*?Incoming messages will pop up automatically\.<\/div>\s*<\/div>/;
const newMsgModalContent = `<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {activeChats.length === 0 ? (
                                <div style={{
                                    padding: '2rem', textAlign: 'center', background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)', borderRadius: '16px', color: 'var(--text-secondary)'
                                }}>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>💬</span>
                                    <div style={{ marginBottom: '10px' }}>No active messages yet.</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>To start a private chat, open a neighbor's profile and click Message.</div>
                                </div>
                            ) : (
                                activeChats.map((chat, idx) => (
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
                                                {(chat.otherName || '?')[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: '100px' }}>
                                                <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                    {chat.otherName}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {chat.lastMessage}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => {
                                            setShowMessagesModal(false);
                                            onUserClick(chat.otherId);
                                        }} style={{
                                            background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
                                            color: 'white', border: 'none', borderRadius: '10px',
                                            padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer'
                                        }}>
                                            Open Chat
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>`;

feed = feed.replace(msgModalTargetRegex, newMsgModalContent);
fs.writeFileSync('src/components/Feed.jsx', feed, 'utf-8');

// 3. Patch index.css for global fixes
let css = fs.readFileSync('src/index.css', 'utf-8');
const globalCss = `
/* Global Layout Fixes for Mobile & Optimization */
html, body, #root {
  overflow-x: hidden !important;
  max-width: 100vw;
  width: 100%;
  position: relative;
}

* {
  box-sizing: border-box;
}

/* Modals shouldn't overflow screen */
.modal-overlay {
  display: flex !important;
  align-items: center;
  justify-content: center;
  padding: 20px !important;
  box-sizing: border-box;
}

.modal-content {
  max-height: 90vh;
  overflow-y: auto;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  margin: 0 !important;
}

/* Ensure inputs and buttons don't exceed parent width */
input, select, textarea, button {
  max-width: 100%;
}
`;

if (!css.includes("Global Layout Fixes")) {
    css += "\\n" + globalCss;
    fs.writeFileSync('src/index.css', css, 'utf-8');
}
console.log("Optimizations applied successfully!");
