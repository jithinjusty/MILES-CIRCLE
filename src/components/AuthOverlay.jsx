import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthOverlay({ onInstall }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [isSignUp, setIsSignUp] = useState(false)
    const [isForgotPassword, setIsForgotPassword] = useState(false)

    const validatePassword = (pass) => {
        const hasUpper = /[A-Z]/.test(pass);
        const hasLower = /[a-z]/.test(pass);
        const hasNumber = /[0-9]/.test(pass);
        return pass.length >= 8 && hasUpper && hasLower && hasNumber;
    }

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        if (isSignUp) {
            if (password !== confirmPassword) {
                setMessage({ type: 'error', text: 'Passwords do not match.' })
                setLoading(false)
                return
            }
            if (!validatePassword(password)) {
                setMessage({ type: 'error', text: 'Password must be 8+ characters with uppercase, lowercase, and a number.' })
                setLoading(false)
                return
            }
        }

        let result;
        if (isSignUp) {
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
            if (isSignUp && data?.user && data?.session === null) {
                setMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' })
            }
        }
        setLoading(false)
    }

    const handleForgotPassword = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}?type=recovery`,
        })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: 'Password reset link sent to your email.' })
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
        <div className="auth-overlay-new">
            <div className="auth-container anim-fade-in">
                <div className="brand-header-premium" style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%' }}>
                    <div className="logo-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                        <div className="pulse-circle" style={{ width: '64px', height: '64px' }}>
                            <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>
                    <p className="auth-tagline" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Connect with your local circle.</p>
                </div>

                <div className="onboarding-card-premium" style={{ width: '100%', maxWidth: '440px' }}>
                    {!isForgotPassword && (
                        <div className="auth-tabs" style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                            <button
                                className={`auth-tab ${!isSignUp ? 'active' : ''}`}
                                onClick={() => { setIsSignUp(false); setMessage(null); }}
                                style={{
                                    background: 'none', border: 'none', padding: '12px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer',
                                    color: !isSignUp ? 'var(--accent-red)' : 'var(--text-secondary)',
                                    borderBottom: !isSignUp ? '3px solid var(--accent-red)' : '3px solid transparent'
                                }}
                            >
                                Sign In
                            </button>
                            <button
                                className={`auth-tab ${isSignUp ? 'active' : ''}`}
                                onClick={() => { setIsSignUp(true); setMessage(null); }}
                                style={{
                                    background: 'none', border: 'none', padding: '12px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer',
                                    color: isSignUp ? 'var(--accent-red)' : 'var(--text-secondary)',
                                    borderBottom: isSignUp ? '3px solid var(--accent-red)' : '3px solid transparent'
                                }}
                            >
                                Register
                            </button>
                        </div>
                    )}

                    {isForgotPassword ? (
                        <div className="forgot-password-flow">
                            <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'white' }}>Reset Password</h2>
                            <form onSubmit={handleForgotPassword} className="auth-form-classic" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div className="field-block">
                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Email Recovery</label>
                                    <input
                                        type="email"
                                        placeholder="your-email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="auth-input-classic"
                                        style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white', fontSize: '1rem', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn-onboarding-next" disabled={loading} style={{ marginTop: '1rem' }}>
                                    {loading ? 'Sending Request...' : 'Send Recovery Link'}
                                </button>
                                <button type="button" onClick={() => setIsForgotPassword(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600', width: '100%', marginTop: '1rem' }}>Back to Sign In</button>
                            </form>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} className="auth-form-classic" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div className="field-block">
                                <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Email Address</label>
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="auth-input-classic"
                                    style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white', fontSize: '1rem', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div className="field-block">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Password</label>
                                    {!isSignUp && (
                                        <button type="button" onClick={() => setIsForgotPassword(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', padding: 0 }}>FORGOT?</button>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    placeholder={isSignUp ? "Min 8 chars, A-z, 0-9" : "Enter Password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="auth-input-classic"
                                    style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white', fontSize: '1rem', outline: 'none' }}
                                    required
                                    minLength={isSignUp ? 8 : 6}
                                />
                            </div>

                            {isSignUp && (
                                <div className="field-block">
                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Confirm Password</label>
                                    <input
                                        type="password"
                                        placeholder="Repeat Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="auth-input-classic"
                                        style={{ width: '100%', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'white', fontSize: '1rem', outline: 'none' }}
                                        required
                                    />
                                </div>
                            )}

                            <button type="submit" className="btn-onboarding-next" disabled={loading} style={{ marginTop: '1.2rem' }}>
                                {loading ? 'Authenticating...' : (isSignUp ? 'Create your Circle' : 'Enter the Circle')}
                            </button>
                        </form>
                    )}

                    {!isForgotPassword && (
                        <>
                            <div className="auth-divider-classic" style={{ margin: '2rem 0', textAlign: 'center', position: 'relative' }}>
                                <span style={{ background: 'var(--panel-bg)', padding: '0 15px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '800' }}>OR CONTINUE WITH</span>
                                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--glass-border)', zIndex: -1 }}></div>
                            </div>

                            <button onClick={handleGoogleLogin} className="auth-btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontWeight: '700' }}>
                                <svg width="20" height="20" viewBox="0 0 18 18">
                                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                                    <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" />
                                    <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                                    <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>
                        </>
                    )}

                    <div className="auth-pwa-install-box" style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'var(--glass-bg)', borderRadius: '20px', border: '1px dashed var(--glass-border)', textAlign: 'center' }}>
                        {onInstall ? (
                            <button onClick={onInstall} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--accent-red)', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.4rem' }}>📱</span> Install App
                            </button>
                        ) : (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                <p>To install: Tap Share <span style={{ color: 'var(--accent-red)', fontWeight: '900' }}>↑</span> then<br /><strong>"Add to Home Screen"</strong></p>
                            </div>
                        )}
                    </div>

                    {message && (
                        <div className={`auth-message-classic ${message.type}`} style={{ marginTop: '1.5rem', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', textAlign: 'center', background: message.type === 'error' ? 'rgba(210, 85, 78, 0.1)' : 'rgba(52, 168, 83, 0.1)', color: message.type === 'error' ? 'var(--accent-red)' : '#34A853' }}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
