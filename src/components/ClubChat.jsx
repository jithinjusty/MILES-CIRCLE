import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Send } from 'lucide-react';

export default function ClubChat({ club, session, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchMessages();
        const channel = supabase
            .channel(`club_chat_${club.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'club_messages',
                filter: `club_id=eq.${club.id}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [club.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('club_messages')
            .select(`
                *,
                profiles:sender_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('club_id', club.id)
            .order('created_at', { ascending: true });
        
        if (data) {
            setMessages(data);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        const messageText = newMessage;
        setNewMessage('');

        await supabase.from('club_messages').insert({
            club_id: club.id,
            sender_id: session.user.id,
            content: messageText
        });
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100001,
            background: 'var(--bg-dark)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slide-down 0.3s ease'
        }}>
            <div style={{
                padding: '20px',
                borderBottom: '1px solid var(--glass-border)',
                background: 'var(--panel-bg)',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <button onClick={onBack} className="icon-btn" style={{ background: 'transparent' }}>
                    <ArrowLeft size={24} color="var(--text-primary)" />
                </button>
                <div>
                    <h2 style={{ margin: 0 }}>{club.name}</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{club.description}</p>
                </div>
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
                        No messages yet. Say hello!
                    </div>
                )}
                {messages.map(msg => {
                    const isMe = msg.sender_id === session.user.id;
                    const senderName = msg.profiles?.full_name || 'Neighbor';
                    return (
                        <div key={msg.id} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                        }}>
                            {!isMe && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>{senderName}</span>}
                            <div style={{
                                background: isMe ? 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)' : 'var(--panel-bg)',
                                color: isMe ? 'white' : 'var(--text-primary)',
                                padding: '10px 14px',
                                borderRadius: '14px',
                                border: isMe ? 'none' : '1px solid var(--glass-border)',
                                fontSize: '0.9rem',
                                wordBreak: 'break-word'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{
                padding: '15px',
                background: 'var(--panel-bg)',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                gap: '10px'
            }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Message the club..."
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '20px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--bg-dark)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                    }}
                />
                <button type="submit" style={{
                    background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '45px',
                    height: '45px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                }}>
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
