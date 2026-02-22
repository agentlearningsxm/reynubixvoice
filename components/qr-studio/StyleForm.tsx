import React from 'react';
import { useQRStore } from '../../store/qrStore';

function extractFirstSvgPath(svgText: string): string | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const path = doc.querySelector('path[d]');
    return path?.getAttribute('d') ?? null;
}

export default function StyleForm()
{
    const { qrStyle, updateQRStyle } = useQRStore();

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) =>
    {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () =>
        {
            updateQRStyle({
                logo: {
                    ...qrStyle.logo,
                    enabled: true,
                    imageDataUrl: String(reader.result ?? ''),
                }
            });
        };
        reader.readAsDataURL(file);
    };

    const handleMaskUpload = (event: React.ChangeEvent<HTMLInputElement>) =>
    {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () =>
        {
            const path = extractFirstSvgPath(String(reader.result ?? ''));
            updateQRStyle({
                renderMode: 'art',
                mask: {
                    ...qrStyle.mask,
                    enabled: Boolean(path),
                    svgPath: path,
                    name: file.name,
                },
            });
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">Render Mode</label>
                <div className="grid grid-cols-2 gap-2">
                    {(['safe', 'art'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => updateQRStyle({ renderMode: mode })}
                            className={`py-2 text-xs font-semibold uppercase rounded-md border transition-all ${qrStyle.renderMode === mode
                                ? mode === 'safe' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-amber-500 bg-amber-500/10 text-amber-300'
                                : 'border-border bg-bg-card hover:border-brand-primary/50 text-text-secondary'
                                }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
                <p className="text-[11px] text-text-secondary">
                    Safe mode enforces scan reliability; Art mode enables experimental shapes/masks.
                </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <label className="block text-sm font-medium text-text-primary">QR Size</label>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={160}
                        max={520}
                        step={5}
                        value={qrStyle.qrSize}
                        onChange={(e) => updateQRStyle({ qrSize: Number(e.target.value) })}
                        className="flex-1"
                    />
                    <span className="text-xs font-semibold text-text-secondary w-14 text-right">{qrStyle.qrSize}px</span>
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <label className="block text-sm font-medium text-text-primary">Quiet Zone (modules)</label>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={2}
                        max={12}
                        value={qrStyle.quietZone}
                        onChange={(e) => updateQRStyle({ quietZone: Number(e.target.value) })}
                        className="flex-1"
                    />
                    <span className="text-xs font-semibold text-text-secondary w-10 text-right">{qrStyle.quietZone}</span>
                </div>
                <p className="text-[11px] text-text-secondary">Recommended minimum is 4 modules.</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <label className="block text-sm font-medium text-text-primary">QR Shape Structure</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {(['square', 'circle', 'heart', 'star', 'shield'] as const).map((shape) => (
                        <button
                            key={shape}
                            onClick={() => updateQRStyle({ shape, renderMode: shape === 'square' ? qrStyle.renderMode : 'art' })}
                            className={`py-2 text-xs font-medium capitalize rounded-md border transition-all ${qrStyle.shape === shape
                                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                : 'border-border bg-bg-card hover:border-brand-primary/50 text-text-secondary'}`}
                        >
                            {shape}
                        </button>
                    ))}
                </div>
                <p className="text-[11px] text-text-secondary">Choosing non-square shapes automatically uses Art mode.</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <label className="block text-sm font-medium text-text-primary">Inner Pattern Style</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['rounded', 'dots', 'square'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => updateQRStyle({ dotsType: type })}
                            className={`py-2 text-xs font-medium capitalize rounded-md border transition-all ${qrStyle.dotsType === type
                                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                : 'border-border bg-bg-card hover:border-brand-primary/50 text-text-secondary'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">Pattern Color</label>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={qrStyle.dotsColor}
                        onChange={(e) => updateQRStyle({ dotsColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                    />
                    <input
                        type="text"
                        value={qrStyle.dotsColor}
                        onChange={(e) => updateQRStyle({ dotsColor: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-1.5 bg-black/20 border border-border rounded-md text-sm focus:outline-none focus:border-brand-primary uppercase font-mono"
                    />
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <label className="block text-sm font-medium text-text-primary">Corner Square Style</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['dot', 'square', 'extra-rounded'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => updateQRStyle({ cornerSquareType: type })}
                            className={`py-2 text-xs font-medium capitalize rounded-md border transition-all ${qrStyle.cornerSquareType === type
                                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                : 'border-border bg-bg-card hover:border-brand-primary/50 text-text-secondary'
                                }`}
                        >
                            {type.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">Corner Color</label>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={qrStyle.cornerSquareColor}
                        onChange={(e) => updateQRStyle({ cornerSquareColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                    />
                    <input
                        type="text"
                        value={qrStyle.cornerSquareColor}
                        onChange={(e) => updateQRStyle({ cornerSquareColor: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-1.5 bg-black/20 border border-border rounded-md text-sm focus:outline-none focus:border-brand-primary uppercase font-mono"
                    />
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <label className="block text-sm font-medium text-text-primary">Background Color</label>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={qrStyle.backgroundColor === 'transparent' ? '#ffffff' : qrStyle.backgroundColor}
                        onChange={(e) => updateQRStyle({ backgroundColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                    />
                    <button
                        onClick={() => updateQRStyle({ backgroundColor: 'transparent' })}
                        className="flex-1 px-3 py-1.5 text-xs font-medium bg-black/20 border border-border rounded-md hover:border-brand-primary transition-colors"
                    >
                        Transparent
                    </button>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-text-primary">Gradient</label>
                    <button
                        onClick={() => updateQRStyle({
                            gradient: qrStyle.gradient ? { ...qrStyle.gradient, enabled: !qrStyle.gradient.enabled } : {
                                enabled: true,
                                type: 'linear',
                                colorStops: [{ offset: 0, color: '#0EA5E9' }, { offset: 1, color: '#8B5CF6' }]
                            }
                        })}
                        className={`text-[10px] px-2 py-1 rounded transition-colors ${qrStyle.gradient?.enabled ? 'bg-brand-primary text-white' : 'bg-border text-text-secondary'}`}
                    >
                        {qrStyle.gradient?.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>

                {qrStyle.gradient?.enabled && (
                    <div className="space-y-3 p-3 bg-black/20 rounded-lg border border-border">
                        <div className="flex gap-2">
                            {(['linear', 'radial'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => updateQRStyle({ gradient: { ...qrStyle.gradient!, type } })}
                                    className={`flex-1 py-1.5 text-xs font-medium capitalize rounded ${qrStyle.gradient!.type === type ? 'bg-brand-primary text-white' : 'bg-bg-card text-text-secondary border border-border'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            {qrStyle.gradient.colorStops.map((stop, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={stop.color}
                                        onChange={(e) =>
                                        {
                                            const newStops = [...qrStyle.gradient!.colorStops];
                                            newStops[i].color = e.target.value;
                                            updateQRStyle({ gradient: { ...qrStyle.gradient!, colorStops: newStops } });
                                        }}
                                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                                    />
                                    <input
                                        type="text"
                                        value={stop.color}
                                        onChange={(e) =>
                                        {
                                            const newStops = [...qrStyle.gradient!.colorStops];
                                            newStops[i].color = e.target.value;
                                            updateQRStyle({ gradient: { ...qrStyle.gradient!, colorStops: newStops } });
                                        }}
                                        className="flex-1 min-w-0 px-2 py-1 bg-black/40 border border-border rounded text-xs focus:outline-none focus:border-brand-primary uppercase font-mono"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-text-primary">Logo Overlay</label>
                    <button
                        onClick={() => updateQRStyle({ logo: { ...qrStyle.logo, enabled: !qrStyle.logo.enabled } })}
                        className={`text-[10px] px-2 py-1 rounded transition-colors ${qrStyle.logo.enabled ? 'bg-brand-primary text-white' : 'bg-border text-text-secondary'}`}
                    >
                        {qrStyle.logo.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>

                <label className="block text-xs text-text-secondary">Upload Logo Image</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-xs" />

                {qrStyle.logo.enabled && (
                    <>
                        <div className="space-y-1.5">
                            <label className="text-xs text-text-secondary">Logo Size</label>
                            <input
                                type="range"
                                min={0.08}
                                max={0.6}
                                step={0.01}
                                value={qrStyle.logo.sizeRatio}
                                onChange={(e) => updateQRStyle({ logo: { ...qrStyle.logo, sizeRatio: Number(e.target.value) } })}
                                className="w-full"
                            />
                            <div className="text-[11px] text-text-secondary">{Math.round(qrStyle.logo.sizeRatio * 100)}%</div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-text-secondary">Logo Margin</label>
                            <input
                                type="range"
                                min={0}
                                max={40}
                                step={1}
                                value={qrStyle.logo.margin}
                                onChange={(e) => updateQRStyle({ logo: { ...qrStyle.logo, margin: Number(e.target.value) } })}
                                className="w-full"
                            />
                            <div className="text-[11px] text-text-secondary">{qrStyle.logo.margin}px</div>
                        </div>
                        {!qrStyle.logo.imageDataUrl && (
                            <p className="text-[11px] text-text-secondary">Upload a logo image to see size/margin changes.</p>
                        )}
                    </>
                )}
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-text-primary">SVG Mask (Art Mode)</label>
                    <button
                        onClick={() => updateQRStyle({
                            renderMode: 'art',
                            mask: { ...qrStyle.mask, enabled: !qrStyle.mask.enabled }
                        })}
                        className={`text-[10px] px-2 py-1 rounded transition-colors ${qrStyle.mask.enabled ? 'bg-amber-500 text-black' : 'bg-border text-text-secondary'}`}
                    >
                        {qrStyle.mask.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>

                <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={handleMaskUpload}
                    className="w-full text-xs"
                />
                <p className="text-[11px] text-text-secondary">{qrStyle.mask.name ? `Loaded: ${qrStyle.mask.name}` : 'No SVG mask loaded'}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <label className="block text-sm font-medium text-text-primary">Scan Guard</label>
                <div className={`rounded-md border p-3 text-xs ${qrStyle.scanGuard.pass ? 'border-green-500/40 bg-green-500/5 text-green-300' : 'border-red-500/40 bg-red-500/5 text-red-300'}`}>
                    <div className="font-semibold mb-1">Score: {qrStyle.scanGuard.score}/100</div>
                    <div className="mb-1">Status: {qrStyle.scanGuard.pass ? 'PASS' : 'BLOCKED'}</div>
                    {qrStyle.scanGuard.warnings.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-1">
                            {qrStyle.scanGuard.warnings.map((warning, idx) => (
                                <li key={idx}>{warning}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No warnings.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
