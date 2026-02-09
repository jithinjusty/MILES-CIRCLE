import { useEffect, useState } from 'react'

export default function SplashScreen({ onComplete }) {
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        // Start fade out after 2 seconds
        const fadeTimer = setTimeout(() => {
            setFadeOut(true)
        }, 2000)

        // Complete after fade animation
        const completeTimer = setTimeout(() => {
            onComplete()
        }, 2800)

        return () => {
            clearTimeout(fadeTimer)
            clearTimeout(completeTimer)
        }
    }, [onComplete])

    return (
        <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
            <img
                src="/logo.png"
                alt="Miles Circle"
                className="splash-logo"
            />
            <p className="splash-tagline">Draw your Circle</p>
        </div>
    )
}
