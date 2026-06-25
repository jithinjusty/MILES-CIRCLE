import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, PlusCircle } from 'lucide-react';

export default function BorrowingShed({ session }) {
    const [items, setItems] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ title: '', description: '' });

    useEffect(() => {
        if (session) fetchItems();
    }, [session]);

    const fetchItems = async () => {
        const { data } = await supabase
            .from('barter_items')
            .select('*, profiles:owner_id(full_name)')
            .order('created_at', { ascending: false });
        if (data) setItems(data);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItem.title.trim()) return;
        
        await supabase.from('barter_items').insert({
            owner_id: session.user.id,
            title: newItem.title,
            description: newItem.description
        });
        
        setNewItem({ title: '', description: '' });
        setShowAdd(false);
        fetchItems();
    };

    return (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span role="img" aria-label="tools">🛠️</span> The Borrowing Shed
                </h2>
                <button onClick={() => setShowAdd(!showAdd)} className="icon-btn">
                    <PlusCircle size={24} color="var(--accent-red)" />
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAdd} style={{ margin: '15px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                        type="text" 
                        placeholder="What are you offering to lend/barter?" 
                        value={newItem.title}
                        onChange={e => setNewItem({...newItem, title: e.target.value})}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }}
                    />
                    <textarea 
                        placeholder="Description (e.g. Needs returning by Sunday)" 
                        value={newItem.description}
                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }}
                    />
                    <button type="submit" className="primary-btn" style={{ padding: '10px' }}>Add Item</button>
                </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                {items.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>The shed is empty. Be the first to share!</p>}
                {items.map(item => (
                    <div key={item.id} style={{ padding: '15px', borderRadius: '15px', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>{item.title}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>{item.description}</p>
                        <p style={{ fontSize: '12px', margin: 0 }}><strong>Owner:</strong> {item.profiles?.full_name}</p>
                        <button style={{ marginTop: '10px', width: '100%', padding: '5px', borderRadius: '5px', background: 'var(--accent-red)', color: 'white', border: 'none', cursor: 'pointer' }}>
                            Ask to Borrow
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
