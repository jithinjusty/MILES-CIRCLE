import { useState, useRef, useEffect } from 'react'
import { X, Check, RotateCcw, Sliders } from 'lucide-react'

export default function PhotoEditor({ file, onSave, onCancel }) {
    const [imageSrc, setImageSrc] = useState(null)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [filters, setFilters] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        blur: 0
    })
    const canvasRef = useRef(null)
    const imgRef = useRef(null)

    useEffect(() => {
        const reader = new FileReader()
        reader.onload = (e) => setImageSrc(e.target.result)
        reader.readAsDataURL(file)
    }, [file])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: Number(value) }))
    }

    const resetFilters = () => {
        setFilters({
            brightness: 100,
            contrast: 100,
            saturation: 100,
            grayscale: 0,
            sepia: 0,
            hueRotate: 0,
            blur: 0
        })
    }

    const getFilterString = () => {
        return `
            brightness(${filters.brightness}%) 
            contrast(${filters.contrast}%) 
            saturate(${filters.saturation}%) 
            grayscale(${filters.grayscale}%) 
            sepia(${filters.sepia}%) 
            hue-rotate(${filters.hueRotate}deg)
            blur(${filters.blur}px)
        `.trim()
    }

    const handleSave = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const img = imgRef.current

        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight

        ctx.filter = getFilterString()
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob((blob) => {
            onSave(blob)
        }, 'image/jpeg', 0.9)
    }

    if (!imageSrc) return null

    return (
        <div className="photo-editor-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <div className="photo-editor-card anim-fade-in" style={{ display: 'flex', flexDirection: 'column', width: isMobile ? '100%' : '90%', height: isMobile ? '100dvh' : '85vh', maxWidth: isMobile ? 'none' : '1000px', maxHeight: isMobile ? 'none' : '800px', background: 'var(--panel-bg)', borderRadius: isMobile ? '0' : '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <header className="modal-header-premium" style={{ borderBottom: '1px solid var(--glass-border)', padding: isMobile ? '1rem' : '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sliders size={24} color="var(--accent-red)" />
                        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>Enhance Photo</h2>
                    </div>
                    <div className="editor-actions" style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onCancel} className="nav-item" style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
                        <button onClick={handleSave} className="btn-save-settings" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}><Check size={20} /> Save</button>
                    </div>
                </header>

                <div className="editor-main" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, overflow: 'hidden' }}>
                    <div className="image-preview-container" style={{ flex: isMobile ? '1' : '2', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '1rem' : '2rem', overflow: 'hidden', position: 'relative' }}>
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Edit preview"
                            style={{ filter: getFilterString(), maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                        />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>

                    <div className="editor-controls" style={{ flex: 'none', height: isMobile ? '280px' : 'auto', width: isMobile ? '100%' : '350px', background: 'var(--panel-bg)', padding: isMobile ? '1.2rem' : '2rem', overflowY: 'auto', borderLeft: isMobile ? 'none' : '1px solid var(--glass-border)', borderTop: isMobile ? '1px solid var(--glass-border)' : 'none' }}>
                        <div className="controls-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Adjustment Tools</span>
                            <button onClick={resetFilters} className="reset-btn" style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><RotateCcw size={14} /> Reset</button>
                        </div>

                        <div className="controls-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {[
                                { id: 'brightness', label: 'Brightness', min: 0, max: 200 },
                                { id: 'contrast', label: 'Contrast', min: 0, max: 200 },
                                { id: 'saturation', label: 'Saturation', min: 0, max: 200 },
                                { id: 'grayscale', label: 'Grayscale', min: 0, max: 100 },
                                { id: 'sepia', label: 'Sepia', min: 0, max: 100 },
                                { id: 'blur', label: 'Soft Blur', min: 0, max: 10, step: 0.1 },
                                { id: 'hueRotate', label: 'Color Shift', min: 0, max: 360 }
                            ].map(filter => (
                                <div className="field-block" key={filter.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>{filter.label}</label>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-red)' }}>{filters[filter.id]}{filter.id === 'hueRotate' ? '°' : filter.id === 'blur' ? 'px' : '%'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={filter.min}
                                        max={filter.max}
                                        step={filter.step || 1}
                                        value={filters[filter.id]}
                                        style={{ width: '100%', height: '6px', background: 'var(--glass-bg)', borderRadius: '3px', outline: 'none', cursor: 'pointer', accentColor: 'var(--accent-red)' }}
                                        onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
