import { useState, useRef, useEffect } from 'react'
import { X, Check, RotateCcw, Sliders } from 'lucide-react'

export default function PhotoEditor({ file, onSave, onCancel }) {
    const [imageSrc, setImageSrc] = useState(null)
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

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }))
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
        <div className="photo-editor-overlay">
            <div className="photo-editor-card">
                <div className="editor-header">
                    <h3>Edit Photo</h3>
                    <div className="editor-actions">
                        <button onClick={onCancel} className="icon-btn"><X size={20} /></button>
                        <button onClick={handleSave} className="save-btn"><Check size={20} /> Save</button>
                    </div>
                </div>

                <div className="editor-main">
                    <div className="image-preview-container">
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Edit preview"
                            style={{ filter: getFilterString() }}
                        />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>

                    <div className="editor-controls">
                        <div className="controls-header">
                            <Sliders size={16} /> <span>Adjust</span>
                            <button onClick={resetFilters} className="reset-btn"><RotateCcw size={14} /> Reset</button>
                        </div>

                        <div className="control-group">
                            <label>Brightness</label>
                            <input
                                type="range" min="0" max="200" value={filters.brightness}
                                onChange={(e) => handleFilterChange('brightness', e.target.value)}
                            />
                        </div>
                        <div className="control-group">
                            <label>Contrast</label>
                            <input
                                type="range" min="0" max="200" value={filters.contrast}
                                onChange={(e) => handleFilterChange('contrast', e.target.value)}
                            />
                        </div>
                        <div className="control-group">
                            <label>Saturation</label>
                            <input
                                type="range" min="0" max="200" value={filters.saturation}
                                onChange={(e) => handleFilterChange('saturation', e.target.value)}
                            />
                        </div>
                        <div className="control-group">
                            <label>Grayscale</label>
                            <input
                                type="range" min="0" max="100" value={filters.grayscale}
                                onChange={(e) => handleFilterChange('grayscale', e.target.value)}
                            />
                        </div>
                        <div className="control-group" style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label>Sepia</label>
                                <input
                                    type="range" min="0" max="100" value={filters.sepia}
                                    style={{ width: '100%' }}
                                    onChange={(e) => handleFilterChange('sepia', e.target.value)}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Blur</label>
                                <input
                                    type="range" min="0" max="10" step="0.1" value={filters.blur}
                                    style={{ width: '100%' }}
                                    onChange={(e) => handleFilterChange('blur', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="control-group">
                            <label>Hue</label>
                            <input
                                type="range" min="0" max="360" value={filters.hueRotate}
                                onChange={(e) => handleFilterChange('hueRotate', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
