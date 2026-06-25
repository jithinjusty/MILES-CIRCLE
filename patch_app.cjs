const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf-8');

// 2. Initial fetch
const initialFetchTarget = `        // Initial fetch of waves
        supabase.from('profiles').select('received_waves').eq('id', session.user.id).single()
            .then(({ data }) => {
                if (data && Array.isArray(data.received_waves)) {
                    setWaves(data.received_waves);
                }
            });`;

const initialFetchReplace = `        // Initial fetch of waves and chats
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

if (app.includes(initialFetchTarget)) {
    app = app.replace(initialFetchTarget, initialFetchReplace);
}

// 3. profile update
const updateProfileTarget = `                const newProfile = payload.new;
                if (newProfile && Array.isArray(newProfile.received_waves)) {
                    const newWaves = newProfile.received_waves;
                    setWaves(newWaves);`;

const updateProfileReplace = `                const newProfile = payload.new;
                if (newProfile) {
                    const newWaves = Array.isArray(newProfile.received_waves) ? newProfile.received_waves : [];
                    const sentWaves = Array.isArray(newProfile.sent_waves) ? newProfile.sent_waves : [];
                    setWaves(newWaves.filter(w => !sentWaves.some(sw => sw.to_id === w.from_id)));`;

if (app.includes(updateProfileTarget)) {
    app = app.replace(updateProfileTarget, updateProfileReplace);
}

// 4. message listener
const msgListenTarget = `                    if (!isChatOpen || chatProfile?.id !== newMsg.sender_id) {
                        alert(\`New message received! 💬\`);
                    }`;

const msgListenReplace = `                    if (!isChatOpen || chatProfile?.id !== newMsg.sender_id) {
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

if (app.includes(msgListenTarget)) {
    app = app.replace(msgListenTarget, msgListenReplace);
}

fs.writeFileSync('src/App.jsx', app, 'utf-8');
console.log('App patched successfully');
