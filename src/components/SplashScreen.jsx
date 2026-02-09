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
            <div className="splash-content">
                <img
                    src="/logo.png"
                    alt="Miles Circle"
                    className="splash-logo-animated"
                />
                <h1 className="splash-tagline-animated">Draw your Circle</h1>
            </div>
        </div>
    )
}
