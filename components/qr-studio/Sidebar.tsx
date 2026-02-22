import React, { useState } from 'react';
import ContentForm from './ContentForm';
import StyleForm from './StyleForm';

type SidebarTab = 'content' | 'style' | 'templates';

interface SidebarProps
{
    className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps)
{
    const [activeTab, setActiveTab] = useState<SidebarTab>('content');

    return (
        <aside className={`flex flex-col ${className}`}>
            {/* Tab Navigation */}
            <div className="flex border-b border-border shrink-0">
                {(['content', 'style', 'templates'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab
                            ? 'text-brand-primary border-b-2 border-brand-primary'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'content' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">QR Content</h2>
                        <p className="text-sm text-text-secondary">Select the data type for your QR code.</p>
                        <div className="mt-6">
                            <ContentForm />
                        </div>
                    </div>
                )}

                {activeTab === 'style' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Visual Style</h2>
                        <p className="text-sm text-text-secondary">Customize colors, shapes, and theme.</p>
                        <div className="mt-6">
                            <StyleForm />
                        </div>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Templates</h2>
                        <p className="text-sm text-text-secondary">Start with a pre-designed template.</p>
                        <div className="p-4 rounded-lg bg-black/20 border border-border mt-4">
                            Templates coming in Phase 2
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
