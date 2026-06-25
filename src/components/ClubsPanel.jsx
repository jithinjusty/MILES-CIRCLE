import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, PlusCircle } from 'lucide-react';
import ClubChat from './ClubChat';

export default function ClubsPanel({ session }) {
    const [clubs, setClubs] = useState([]);
    const [myMemberships, setMyMemberships] = useState(new Set());
    const [showAdd, setShowAdd] = useState(false);
    const [newClub, setNewClub] = useState({ name: '', description: '' });
    const [activeClub, setActiveClub] = useState(null);

    useEffect(() => {
        if (session) {
            fetchClubs();
            fetchMemberships();
        }
    }, [session]);

    const fetchClubs = async () => {
        const { data } = await supabase
            .from('micro_clubs')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setClubs(data);
    };

    const fetchMemberships = async () => {
        const { data } = await supabase
            .from('club_members')
            .select('club_id')
            .eq('user_id', session.user.id);
        
        if (data) {
            setMyMemberships(new Set(data.map(m => m.club_id)));
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newClub.name.trim()) return;
        
        const { data } = await supabase.from('micro_clubs').insert({
            creator_id: session.user.id,
            name: newClub.name,
            description: newClub.description
        }).select().single();
        
        if (data) {
            // Automatically join the club you created
            await supabase.from('club_members').insert({
                club_id: data.id,
                user_id: session.user.id
            });
            setMyMemberships(prev => new Set([...prev, data.id]));
        }

        setNewClub({ name: '', description: '' });
        setShowAdd(false);
        fetchClubs();
    };

    const joinClub = async (clubId) => {
        await supabase.from('club_members').insert({
            club_id: clubId,
            user_id: session.user.id
        });
        setMyMemberships(prev => new Set([...prev, clubId]));
    };

    if (activeClub) {
        return <ClubChat club={activeClub} session={session} onBack={() => setActiveClub(null)} />;
    }

    return (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={24} color="var(--accent-red)" /> Micro-Clubs
                </h2>
                <button onClick={() => setShowAdd(!showAdd)} className="icon-btn">
                    <PlusCircle size={24} color="var(--text-primary)" />
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAdd} style={{ margin: '15px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                        type="text" 
                        placeholder="Club Name (e.g. Weekend Runners)" 
                        value={newClub.name}
                        onChange={e => setNewClub({...newClub, name: e.target.value})}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }}
                    />
                    <textarea 
                        placeholder="What is this club about?" 
                        value={newClub.description}
                        onChange={e => setNewClub({...newClub, description: e.target.value})}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }}
                    />
                    <button type="submit" className="primary-btn" style={{ padding: '10px' }}>Create Club</button>
                </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                {clubs.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No clubs yet. Start one!</p>}
                {clubs.map(club => {
                    const isMember = myMemberships.has(club.id);
                    return (
                        <div key={club.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderRadius: '15px', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)' }}>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0' }}>{club.name}</h4>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{club.description}</p>
                            </div>
                            {isMember ? (
                                <button onClick={() => setActiveClub(club)} style={{ padding: '5px 15px', borderRadius: '20px', background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Open Chat
                                </button>
                            ) : (
                                <button onClick={() => joinClub(club.id)} style={{ padding: '5px 15px', borderRadius: '20px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
                                    Join
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
