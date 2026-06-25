import React from 'react';
import Leaderboard from './Leaderboard';
import BorrowingShed from './BorrowingShed';
import ClubsPanel from './ClubsPanel';
import { ArrowLeft } from 'lucide-react';

export default function CommunityPage({ session, onBack }) {
    return (
        <div className="events-overlay" style={{ zIndex: 100000, background: 'var(--bg-color)', overflowY: 'auto' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
                <button onClick={onBack} className="icon-btn" style={{ marginBottom: '20px', background: 'var(--glass-bg)' }}>
                    <ArrowLeft size={24} color="var(--text-primary)" /> Back
                </button>
                <h1 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Community Hub</h1>
                
                <Leaderboard session={session} />
                <ClubsPanel session={session} />
                <BorrowingShed session={session} />
            </div>
        </div>
    );
}
