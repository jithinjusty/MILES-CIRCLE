import React from 'react';
import Leaderboard from './Leaderboard';
import BorrowingShed from './BorrowingShed';
import ClubsPanel from './ClubsPanel';
import { ArrowLeft } from 'lucide-react';

export default function CommunityPage({ session, onBack }) {
    return (
        <div className="events-page" style={{ zIndex: 100000, background: 'var(--bg-dark)', overflowY: 'auto' }}>
            <div className="events-header" style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
                <button className="events-back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <div className="events-header-info">
                    <h2>Community Hub</h2>
                    <p>Connect with your neighbors</p>
                </div>
            </div>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', width: '100%' }}>
                
                <Leaderboard session={session} />
                <ClubsPanel session={session} />
                <BorrowingShed session={session} />
            </div>
        </div>
    );
}
