import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, ShieldCheck, FileText, Lock } from 'lucide-react'

export default function AuthOverlay({ onInstall }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [isSignUp, setIsSignUp] = useState(false)
    const [isForgotPassword, setIsForgotPassword] = useState(false)
    const [showTerms, setShowTerms] = useState(false)
    const [policyType, setPolicyType] = useState(null) // 'terms' | 'privacy'

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
            let errorText = error.message;
            if (isSignUp) {
                if (error.message.toLowerCase().includes('already registered')) {
                    errorText = 'This email ID is already registered with Miles Circle.';
                }
            } else {
                if (error.message.toLowerCase().includes('invalid login credentials')) {
                    // Supabase returns 'Invalid login credentials' for both. 
                    // To be specific, we could try to sign up or check if user exists, but standard practice is generic for security.
                    // However, the user explicitly asked for specific messages.
                    errorText = 'Invalid email or password. Please try again.';

                    // Specific check for 'Email not confirmed' which is common
                    if (error.message.toLowerCase().includes('email not confirmed')) {
                        errorText = 'Please verify your email address first.';
                    } else if (error.status === 400 || error.message.toLowerCase().includes('invalid login')) {
                        errorText = 'Email unregistered or incorrect password.';
                    }
                }
            }
            setMessage({ type: 'error', text: errorText })
        } else {
            if (isSignUp && data?.user) {
                // If identities array is empty, the user already exists (Supabase security feature)
                if (data.user.identities && data.user.identities.length === 0) {
                    setMessage({ type: 'error', text: 'This email ID is already registered with Miles Circle.' });
                    setLoading(false);
                    return;
                }

                if (data.session === null) {
                    setMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' });
                }
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
                    {message && (
                        <div className={`auth-message-classic ${message.type}`} style={{
                            marginBottom: '1.5rem',
                            padding: '16px',
                            borderRadius: '16px',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            fontWeight: '700',
                            background: message.type === 'error' ? 'rgba(210, 85, 78, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                            color: message.type === 'error' ? '#FF6B6B' : '#4ADE80',
                            border: `1px solid ${message.type === 'error' ? 'rgba(210, 85, 78, 0.3)' : 'rgba(52, 168, 83, 0.3)'}`
                        }}>
                            {message.type === 'error' ? '⚠️ ' : '✅ '}{message.text}
                        </div>
                    )}

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

                            <p style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                textAlign: 'center',
                                marginTop: '1rem',
                                lineHeight: '1.4'
                            }}>
                                By continuing, you comply with Miles Circle's <br />
                                <button type="button" onClick={() => { setPolicyType('terms'); setShowTerms(true); }} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', padding: 0, textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>Terms & Conditions</button> and <button type="button" onClick={() => { setPolicyType('privacy'); setShowTerms(true); }} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', padding: 0, textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>Privacy Policy</button>.
                            </p>
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
                </div>

                {showTerms && (
                    <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setShowTerms(false)}>
                        <div className="onboarding-card-premium" style={{
                            maxWidth: '700px',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            position: 'relative',
                            padding: '3rem 2rem'
                        }} onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setShowTerms(false)}
                                style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>

                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                {policyType === 'terms' ? <FileText size={48} color="var(--accent-red)" /> : <ShieldCheck size={48} color="var(--accent-red)" />}
                                <h2 style={{ fontSize: '2rem', fontWeight: '950', marginTop: '1rem' }}>
                                    {policyType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Last updated: February 2026</p>
                            </div>

                            <div className="policy-content" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                                {policyType === 'terms' ? (
                                    <>
                                        <h3>1. Acceptance of Terms</h3>
                                        <p>By entering Miles Circle, you agree to be bound by these local community standards. We are a proximity-based social network focused on real-world interactions.</p>

                                        <h3>2. User Conduct</h3>
                                        <p>Users must remain respectful to their immediate neighbors. Harassment, illegal content, or coordinated disruption of the local sphere will result in immediate "Circle Exclusion" (Banning).</p>

                                        <h3>3. Location Accuracy</h3>
                                        <p>You acknowledge that Miles Circle relies on real-time GPS data. Providing false location data or using "spoofers" is a violation of our core proximity mission.</p>

                                        <h3>4. Content Ownership</h3>
                                        <p>You retain ownership of your posts, but grant Miles Circle a license to distribute this content to other users within your designated radius.</p>
                                    </>
                                ) : (
                                    <>
                                        <h3>1. Data Synchronization</h3>
                                        <p>Your location is synchronized only while the app is active to determine your current "Circle". We do not store historical location traces after you exit the app.</p>

                                        <h3>2. Profile Visibility</h3>
                                        <p>Your full name and avatar are visible to anyone within your broadcast radius. Private information like mobile numbers and social links are ONLY shared if you explicitly toggle them to "Public".</p>

                                        <h3>3. Real-time Security</h3>
                                        <p>We use end-to-end security for post distribution. Your proximity data is used strictly for filtering the local feed and is never sold to third-party advertisers.</p>

                                        <h3>4. Account Rights</h3>
                                        <p>You can request full account deletion at any time via the settings menu. Deletion includes all posts, profiles, and associated metadata within 30 days.</p>
                                    </>
                                )}
                            </div>

                            <button
                                className="btn-onboarding-next"
                                style={{ marginTop: '2rem' }}
                                onClick={() => setShowTerms(false)}
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
