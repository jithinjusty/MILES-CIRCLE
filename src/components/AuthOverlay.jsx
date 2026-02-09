import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthOverlay({ onLogin }) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)

    const handleMagicLink = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            },
        })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: 'Check your email for the magic link!' })
        }
        setLoading(false)
    }

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        })
        if (error) setMessage({ type: 'error', text: error.message })
    }

    return (
        <div className="auth-overlay-new">
            <div className="auth-container">
                {/* Logo Section */}
                <div className="auth-logo-section">
                    <img src="/logo.png" alt="Miles Circle" className="auth-logo-main" />
                    <h2 className="auth-tagline">Draw your circle. Connect locally.</h2>
                </div>

                {/* Form Section */}
                <div className="auth-form-section">
                    <form onSubmit={handleMagicLink} className="auth-form-classic">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="auth-input-classic"
                            required
                        />
                        <button type="submit" className="auth-btn-primary" disabled={loading}>
                            {loading ? 'Sending...' : 'Sign in with Email'}
                        </button>
                    </form>

                    <div className="auth-divider-classic">
                        <span>or</span>
                    </div>

                    <button onClick={handleGoogleLogin} className="auth-btn-google">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" />
                            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" />
                        </svg>
                        Sign in with Google
                    </button>

                    {message && (
                        <div className={`auth-message-classic ${message.type}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
