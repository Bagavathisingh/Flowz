import { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';

export default function Notification({ notification, setNotification }) {
    if (!notification) return null;

    const { type, message, title } = notification;

    useEffect(() => {
        const timer = setTimeout(() => {
            setNotification(null);
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification, setNotification]);

    const variants = {
        success: {
            icon: <CheckCircle2 size={20} className="text-emerald-400" />,
            border: 'border-emerald-500/20',
            bg: 'bg-emerald-500/10',
            glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]'
        },
        error: {
            icon: <AlertCircle size={20} className="text-rose-400" />,
            border: 'border-rose-500/20',
            bg: 'bg-rose-500/10',
            glow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]'
        },
        info: {
            icon: <Info size={20} className="text-blue-400" />,
            border: 'border-blue-500/20',
            bg: 'bg-blue-500/10',
            glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]'
        },
        default: {
            icon: <Bell size={20} className="text-slate-400" />,
            border: 'border-white/10',
            bg: 'bg-slate-900/80',
            glow: 'shadow-[0_0_20px_rgba(255,255,255,0.05)]'
        }
    };

    const style = variants[type] || variants.default;

    return (
        <div className={`fixed bottom-8 right-8 z-[100] min-w-[320px] max-w-[420px] p-4 rounded-2xl border ${style.bg} ${style.border} ${style.glow} backdrop-blur-xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] flex gap-4 items-start`}>
            <div className="mt-0.5">
                {style.icon}
            </div>
            <div className="flex-1">
                {title && <h4 className="m-0 text-white font-semibold text-sm mb-1">{title}</h4>}
                <p className="m-0 text-slate-300 text-sm leading-relaxed">{message}</p>
            </div>
            <button
                onClick={() => setNotification(null)}
                className="bg-transparent border-none text-slate-500 hover:text-white transition-colors cursor-pointer p-0.5"
            >
                <X size={16} />
            </button>
            <div className="absolute bottom-0 left-0 h-1 bg-white/10 rounded-full overflow-hidden w-full">
                <div className={`h-full animate-[progress_5s_linear] ${type === 'success' ? 'bg-emerald-500' :
                        type === 'error' ? 'bg-rose-500' :
                            'bg-blue-500'
                    }`} />
            </div>
        </div>
    );
}
