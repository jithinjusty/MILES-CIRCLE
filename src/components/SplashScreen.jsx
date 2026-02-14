import { useEffect, useState } from 'react'

export default function SplashScreen({ onComplete }) {
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        const fadeTimer = setTimeout(() => {
            setFadeOut(true)
        }, 2500)

        const completeTimer = setTimeout(() => {
            onComplete()
        }, 3000)

        return () => {
            clearTimeout(fadeTimer)
            clearTimeout(completeTimer)
        }
    }, [onComplete])

    return (
        <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
            <div className="splash-content anim-fade-in">
                <div className="splash-logo-wrap">
                    <img
                        src="/logo.png"
                        alt="Miles Circle"
                        className="splash-logo-animated"
                    />
                    <div className="logo-pulse-ring"></div>
                </div>
                <h1 className="splash-tagline-animated">Draw your Circle</h1>
                <div className="splash-loader">
                    <div className="loader-track">
                        <div className="loader-fill"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
