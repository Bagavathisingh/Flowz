import { useState } from 'react';
import { Plus, LayoutTemplate, Maximize2, History, Settings, ChevronRight } from 'lucide-react';

const DockItem = ({ icon: Icon, label, onClick, active, accent = 'var(--cyan)', disabled = false }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div className="relative flex items-center justify-end">
            {/* Tooltip */}
            {hovered && (
                <div
                    className="absolute right-full mr-3 flex items-center gap-2 px-3 py-1.5 rounded-xl whitespace-nowrap pointer-events-none"
                    style={{
                        background: 'rgba(10,13,20,0.95)',
                        border: '1px solid var(--border)',
                        backdropFilter: 'blur(16px)',
                        animation: 'slideRight 0.15s ease',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    }}
                >
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                        {label}
                    </span>
                    <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
                </div>
            )}

            {/* Button */}
            <button
                onClick={onClick}
                disabled={disabled}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: active
                        ? `linear-gradient(135deg, ${accent}22, ${accent}15)`
                        : hovered
                        ? 'rgba(255,255,255,0.06)'
                        : 'transparent',
                    border: active
                        ? `1px solid ${accent}55`
                        : '1px solid transparent',
                    color: active || hovered ? accent : 'var(--text-muted)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.18s ease',
                    outline: 'none',
                    opacity: disabled ? 0.4 : 1,
                    boxShadow: active ? `0 0 12px ${accent}30` : 'none',
                }}
            >
                <Icon size={17} />
            </button>
        </div>
    );
};

export default function ActionDock({
    setIsSidebarOpen, isSidebarOpen,
    onLayout, onZoomFit,
    openHistoryModal,
    isPropertiesOpen,
}) {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div
            className="absolute right-5 top-1/2 -translate-y-1/2 z-[40] flex flex-col items-center gap-1.5 pointer-events-auto"
            style={{
                background: 'rgba(10,13,20,0.88)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 20,
                padding: '10px 6px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
                opacity: isPropertiesOpen ? 0 : 1,
                pointerEvents: isPropertiesOpen ? 'none' : 'auto',
            }}
        >
            <DockItem
                icon={Plus}
                label="Add Node"
                onClick={() => setIsSidebarOpen(s => !s)}
                active={isSidebarOpen}
                accent="var(--cyan)"
            />

            <div className="w-6 h-px my-0.5" style={{ background: 'var(--border)' }} />

            <DockItem
                icon={LayoutTemplate}
                label="Auto Layout"
                onClick={onLayout}
                accent="#7c3aed"
            />
            <DockItem
                icon={Maximize2}
                label="Zoom to Fit"
                onClick={onZoomFit}
                accent="#7c3aed"
            />

            <div className="w-6 h-px my-0.5" style={{ background: 'var(--border)' }} />

            <DockItem
                icon={History}
                label="Run History"
                onClick={openHistoryModal}
                accent="var(--amber)"
            />
            <DockItem
                icon={Settings}
                label="Settings"
                onClick={() => setShowSettings(s => !s)}
                active={showSettings}
                accent="var(--text-secondary)"
            />
        </div>
    );
}
