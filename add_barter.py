import re

with open('src/components/Feed.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
states_target = "const [postingLostFound, setPostingLostFound] = useState(false);"
states_replacement = """const [postingLostFound, setPostingLostFound] = useState(false);
    
    // Barter States
    const [showCreateBarter, setShowCreateBarter] = useState(false);
    const [barterType, setBarterType] = useState('offer'); // 'offer' or 'request'
    const [barterTitle, setBarterTitle] = useState('');
    const [barterLookingFor, setBarterLookingFor] = useState('');
    const [barterDesc, setBarterDesc] = useState('');
    const [barterContact, setBarterContact] = useState('');
    const [postingBarter, setPostingBarter] = useState(false);"""
content = content.replace(states_target, states_replacement)

# 2. Add handleCreateBarter
handler_target = """    const handleCreateLostFound = async (e) => {"""
handler_replacement = """    const handleCreateBarter = async (e) => {
        if (e) e.preventDefault();
        if (!session?.user?.id || !position) return;

        setPostingBarter(true);
        try {
            const typeLabel = barterType === 'offer' ? 'OFFERING' : 'REQUESTING';
            const lookingForText = barterLookingFor ? `\\nLooking For: ${barterLookingFor.trim()}` : '';
            const contactText = barterContact ? `\\nContact: ${barterContact.trim()}` : '';

            const postContent = `🔄 #barter [${typeLabel}]\\nItem: ${barterTitle.trim()}${lookingForText}\\nDetails: ${barterDesc.trim()}${contactText}`;

            const locationWKT = `POINT(${position[1]} ${position[0]})`;

            const { error } = await supabase
                .from('posts')
                .insert([{
                    user_id: session.user.id,
                    content: postContent,
                    location: locationWKT
                }]);

            if (error) throw error;

            setBarterTitle('');
            setBarterLookingFor('');
            setBarterDesc('');
            setBarterContact('');
            setShowCreateBarter(false);
            fetchPosts();
        } catch (err) {
            console.error("Error creating barter post:", err);
            showToast("Failed to post: " + err.message, "error");
        } finally {
            setPostingBarter(false);
        }
    };

    const handleCreateLostFound = async (e) => {"""
content = content.replace(handler_target, handler_replacement)

# 3. Add to determineCategory
cat_target = """        if (lower.includes('#lostfound') || lower.includes('#lost') || lower.includes('#found') ||"""
cat_replacement = """        if (lower.includes('#barter') || lower.includes('barter') || lower.includes('trade') || lower.includes('exchange')) {
            return 'barter';
        }
        if (lower.includes('#lostfound') || lower.includes('#lost') || lower.includes('#found') ||"""
content = content.replace(cat_target, cat_replacement)

# 4. Add to categories
categories_target = "{ id: 'lostfound', label: 'Lost & Found', icon: '🔍' },"
categories_replacement = """{ id: 'lostfound', label: 'Lost & Found', icon: '🔍' },
        { id: 'barter', label: 'Barter System', icon: '🔄' },"""
content = content.replace(categories_target, categories_replacement)

# 5. Add Banner
banner_target = "                    {activeCategory === 'lostfound' && ("
banner_replacement = """                    {activeCategory === 'barter' && (
                        <div 
                            onClick={() => setShowCreateBarter(true)}
                            style={{
                                background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 87, 34, 0.1) 100%)',
                                border: '1px dashed var(--accent-red)',
                                borderRadius: '16px',
                                padding: '16px',
                                margin: '0 20px 20px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                color: 'var(--text-primary)',
                                fontWeight: 'bold'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 87, 34, 0.15) 100%)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 87, 34, 0.1) 100%)'}
                        >
                            <span>🔄</span> Post a Barter Request
                        </div>
                    )}
                    
                    {activeCategory === 'lostfound' && ("""
content = content.replace(banner_target, banner_replacement)

# 6. Add Modal
modal_target = """            {/* Create Lost & Found Modal */}"""
modal_replacement = """            {/* Create Barter Modal */}
            {showCreateBarter && (
                <div className="modal-overlay" style={{ zIndex: 4000, display: 'block', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '20px 10px' }} onClick={() => setShowCreateBarter(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        marginTop: '40px', marginBottom: '40px', padding: '24px', background: 'var(--panel-bg)',
                        border: '1px solid var(--glass-border)', borderRadius: '24px', position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 className="onboarding-title" style={{ fontSize: '1.5rem', margin: 0 }}>Barter System</h2>
                            <button onClick={() => setShowCreateBarter(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>

                        <form onSubmit={handleCreateBarter} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div 
                                    onClick={() => setBarterType('offer')}
                                    style={{
                                        flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer',
                                        background: barterType === 'offer' ? 'var(--accent-red)' : 'var(--glass-bg)',
                                        border: barterType === 'offer' ? 'none' : '1px solid var(--glass-border)',
                                        color: barterType === 'offer' ? 'white' : 'var(--text-primary)',
                                        fontWeight: 'bold', transition: 'all 0.2s'
                                    }}
                                >
                                    Offering Item
                                </div>
                                <div 
                                    onClick={() => setBarterType('request')}
                                    style={{
                                        flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer',
                                        background: barterType === 'request' ? 'var(--accent-red)' : 'var(--glass-bg)',
                                        border: barterType === 'request' ? 'none' : '1px solid var(--glass-border)',
                                        color: barterType === 'request' ? 'white' : 'var(--text-primary)',
                                        fontWeight: 'bold', transition: 'all 0.2s'
                                    }}
                                >
                                    Requesting Item
                                </div>
                            </div>

                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Item {barterType === 'offer' ? 'Offered' : 'Requested'}</label>
                                <input type="text" required placeholder={barterType === 'offer' ? "e.g. Lawn Mower" : "e.g. Power Drill"} value={barterTitle} onChange={e => setBarterTitle(e.target.value)} style={{ width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-primary)', padding: '12px', outline: 'none' }} />
                            </div>

                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Looking For in Return {barterType === 'offer' ? '(Optional)' : ''}</label>
                                <input type="text" placeholder={barterType === 'offer' ? "e.g. Power Drill, or anything useful" : "e.g. Can offer a Lawn Mower to trade"} value={barterLookingFor} onChange={e => setBarterLookingFor(e.target.value)} style={{ width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-primary)', padding: '12px', outline: 'none' }} />
                            </div>

                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Description & Details</label>
                                <textarea required placeholder="Condition, duration of trade, etc..." value={barterDesc} onChange={e => setBarterDesc(e.target.value)} style={{ width: '100%', height: '100px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-primary)', padding: '12px', outline: 'none', resize: 'none' }} />
                            </div>

                            <div className="field-block" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Contact details</label>
                                <input type="text" placeholder="e.g. DM me or text 987654xxxx" value={barterContact} onChange={e => setBarterContact(e.target.value)} style={{ width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-primary)', padding: '12px', outline: 'none' }} />
                            </div>

                            <button type="submit" disabled={postingBarter} style={{ background: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', transition: 'all 0.2s', opacity: postingBarter ? 0.6 : 1 }}>
                                {postingBarter ? 'Posting...' : 'Post Barter'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Lost & Found Modal */}"""
content = content.replace(modal_target, modal_replacement)

with open('src/components/Feed.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Barter changes injected successfully!")
