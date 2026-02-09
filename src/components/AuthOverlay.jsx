import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthOverlay() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [isSignUp, setIsSignUp] = useState(false)
    const [useMagicLink, setUseMagicLink] = useState(false)

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        let result;
        if (useMagicLink) {
            result = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            })
        } else if (isSignUp) {
            result = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                }
            })
        } else {
            result = await supabase.auth.signInWithPassword({
                email,
                password,
            })
        }

        const { error, data } = result;

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            if (useMagicLink) {
                setMessage({ type: 'success', text: 'Check your email!' })
            } else if (isSignUp && data?.user && data?.session === null) {
                setMessage({ type: 'success', text: 'Please confirm your email.' })
            }
        }
        setLoading(false)
    }

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        })
        if (error) setMessage({ type: 'error', text: error.message })
    }

    return (
        <div className="auth-overlay-new" style={{ background: '#000' }}>
            <div className="auth-container" style={{ maxWidth: '400px' }}>
                <div className="auth-logo-section">
                    <img src="/logo.png" alt="Miles Circle" className="auth-logo-main" style={{ width: '180px' }} />
                    <h2 className="auth-tagline" style={{ color: '#666', fontSize: '0.9rem' }}>Connect with your local circle.</h2>
                </div>

                <div className="onboarding-card" style={{ padding: '2.5rem', background: '#111', border: '1px solid #222' }}>
                    <div className="auth-tabs" style={{ justifyContent: 'center', borderBottom: '1px solid #222' }}>
                        <button
                            className={`auth-tab ${!isSignUp ? 'active' : ''}`}
                            onClick={() => { setIsSignUp(false); setUseMagicLink(false); }}
                            style={{ color: !isSignUp ? 'var(--accent-red)' : '#444' }}
                        >
                            Log In
                        </button>
                        <button
                            className={`auth-tab ${isSignUp ? 'active' : ''}`}
                            onClick={() => { setIsSignUp(true); setUseMagicLink(false); }}
                            style={{ color: isSignUp ? 'var(--accent-red)' : '#444' }}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="auth-form-classic" style={{ marginTop: '2rem' }}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="auth-input-classic"
                            style={{ background: '#080808', border: '1px solid #333', color: 'white' }}
                            required
                        />

                        {!useMagicLink && (
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="auth-input-classic"
                                style={{ background: '#080808', border: '1px solid #333', color: 'white' }}
                                required
                                minLength={6}
                            />
                        )}

                        <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                            {loading ? '...' : (useMagicLink ? 'Send Link' : (isSignUp ? 'Create' : 'Sign In'))}
                        </button>
                    </form>

                    <div className="auth-divider-classic" style={{ margin: '2rem 0', color: '#333' }}>
                        <span>OR</span>
                    </div>

                    <button onClick={handleGoogleLogin} className="auth-btn-google" style={{ background: 'white', color: 'black', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '10px' }}>
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" />
                            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>

                    <div className="auth-options" style={{ marginTop: '2rem' }}>
                        <button
                            type="button"
                            className="auth-link-btn"
                            onClick={() => setUseMagicLink(!useMagicLink)}
                            style={{ color: '#666', textDecoration: 'none', fontSize: '0.8rem' }}
                        >
                            {useMagicLink ? 'Use Password' : 'Login via Magic Link'}
                        </button>
                    </div>

                    {message && (
                        <div className={`auth-message-classic ${message.type}`} style={{ marginTop: '1.5rem', background: message.type === 'error' ? '#211' : '#121', borderColor: '#333' }}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

