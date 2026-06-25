import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Medal, Star } from 'lucide-react';

export default function Leaderboard({ session }) {
    const [leaders, setLeaders] = useState([]);
    const [badges, setBadges] = useState([]);

    useEffect(() => {
        if (!session) return;
        fetchLeaders();
        fetchMyBadges();
    }, [session]);

    const fetchLeaders = async () => {
        const { data, error } = await supabase
            .from('leaderboard_stats')
            .select(`
                user_id,
                points,
                level,
                profiles:user_id (full_name, avatar_url)
            `)
            .order('points', { ascending: false })
            .limit(10);
            
        if (data) setLeaders(data);
    };

    const fetchMyBadges = async () => {
        const { data } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_id', session.user.id);
        if (data) setBadges(data);
    };

    return (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trophy size={24} color="gold" /> Neighborhood Leaderboard
            </h2>
            
            <div style={{ marginTop: '20px' }}>
                <h3>My Badges</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '10px 0' }}>
                    {badges.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No badges yet. Get active in the neighborhood!</p>
                    ) : (
                        badges.map(b => (
                            <span key={b.id} className="badge" style={{ padding: '5px 10px', background: 'var(--accent-red)', borderRadius: '15px', color: 'white', fontSize: '12px' }}>
                                <Medal size={12} style={{ marginRight: '5px' }} /> {b.badge_name}
                            </span>
                        ))
                    )}
                </div>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h3>Top Neighbors</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {leaders.map((leader, index) => (
                        <li key={leader.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: 'bold', width: '20px' }}>#{index + 1}</span>
                                <span>{leader.profiles?.full_name || 'Anonymous Neighbor'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-red)' }}>
                                <Star size={16} /> {leader.points} pts (Lvl {leader.level})
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
