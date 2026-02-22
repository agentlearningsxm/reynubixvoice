import React from 'react';
import Sidebar from './Sidebar';
import CanvasArea from './CanvasArea';
import { ArrowLeft } from 'lucide-react';

export default function QRStudioLayout()
{
    return (
        <div className="flex h-screen w-full overflow-hidden bg-bg-main text-text-primary">
            {/* Top Header/Nav */}
            <div className="absolute top-0 left-0 w-full h-16 border-b border-border bg-bg-glass backdrop-blur flex items-center px-4 z-50">
                <a href="/" className="flex items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to Home</span>
                </a>
                <h1 className="mx-auto text-xl font-display font-semibold text-gradient">QR Studio</h1>
                <div className="w-24 {/* spacer to balance back button */}"></div>
            </div>

            <div className="flex flex-1 pt-16 h-full">
                <Sidebar className="w-80 h-full border-r border-border bg-bg-card shrink-0" />
                <CanvasArea className="flex-1 h-full bg-black/20" />
            </div>
        </div>
    );
}
