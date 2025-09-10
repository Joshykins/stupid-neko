import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { LanguageFlagSVG } from './LanguageFlagSVG';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import HeatmapProgress from './ui/heatmap-progress';
import { calculateStreakBonusPercent } from '../../../../lib/streakBonus';

type TrackingWidgetProps = {
    userName?: string;
    languageCode?: string; // ISO like "ja"
    collapsedByDefault?: boolean;
};

export default function TrackingWidget(props: TrackingWidgetProps) {
    const { collapsedByDefault = true } = props;
    const [expanded, setExpanded] = useState(!collapsedByDefault);
    const [hovered, setHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<{ left: number; top: number; }>(() => ({ left: 18, top: 100 }));
    const dragMovedRef = useRef(false);
    const startRef = useRef<{ left: number; top: number; } | null>(null);
    const positionRef = useRef<{ left: number; top: number; }>(position);
    useEffect(() => { positionRef.current = position; }, [position.left, position.top]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const controls = useAnimation();
    const mvLeft = useMotionValue<number>(position.left);
    const mvTop = useMotionValue<number>(position.top);

    const [iconUrl, setIconUrl] = useState<string>('');
    useEffect(() => {
        try {
            setIconUrl(chrome.runtime.getURL('icon-128.png'));
        } catch {
            setIconUrl('/icon-128.png');
        }
    }, []);

    const contentLabel: string = useMemo(() => {
        try {
            const raw = localStorage.getItem('lastContentLabel');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed?.title === 'string' && parsed.title.trim().length > 0) return parsed.title.trim();
            }
        } catch { }
        try {
            const title = document.title.replace(/ - YouTube$/, '').trim();
            if (title) return title;
        } catch { }
        return 'this content';
    }, []);

    // Auth/me state from background
    const { isAuthed, me } = useAuth();

    // Rotating encouragement lines (stupid neko themed)
    const encouragement: string = useMemo(() => {
        const lines: Array<string> = [
            'Keep up the good work',
            'Stupid Neko approves this grind.',
            'Nyaa~ your brain is leveling up.',
            'Meowtstanding progress!',
            'Learn now, nap later.',
            'One more minute, one more whisker.',
            'Claw your way to fluency.',
            'Big Neko energy.',
            'No nap until +1 XP.',
        ];
        try {
            const idx = Math.floor(Math.random() * lines.length);
            return lines[idx];
        } catch {
            return lines[0];
        }
    }, []);

    const userName = props.userName ?? 'Joshowaah';

    // Mock stats for now
    const nekos = 1426;
    const hours = 1034;
    const experienceMillions = 1.34;
    const dailyStreak = (typeof me?.currentStreak === 'number' ? me.currentStreak : 0) || 0;

    const streakPercent = calculateStreakBonusPercent(dailyStreak);
    const xpBonusPercent = streakPercent;
    const progressPercent = streakPercent;


    // Load persisted position (chrome.storage.sync with localStorage fallback)
    useEffect(() => {
        (async () => {
            try {
                const data = await new Promise<Record<string, any>>((resolve) => {
                    try { chrome.storage.sync.get(['trackingWidgetPos'], (items) => resolve(items || {})); } catch { resolve({}); }
                });
                const p = data?.trackingWidgetPos;
                if (p && typeof p.left === 'number' && typeof p.top === 'number') {
                    setPosition({ left: p.left, top: p.top });
                    return;
                }
            } catch { }
            try {
                const raw = localStorage.getItem('trackingWidgetPos');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed.left === 'number' && typeof parsed.top === 'number') setPosition(parsed);
                }
            } catch { }
        })();
    }, []);

    const ICON_PX = 40;
    const H_PAD = 32; // horizontal padding from screen edges
    const V_PAD = 64; // vertical padding from screen edges
    const SNAP_THRESHOLD = 32; // px

    function clampToViewport(left: number, top: number): { left: number; top: number; } {
        const maxLeft = Math.max(H_PAD, window.innerWidth - ICON_PX - H_PAD);
        const maxTop = Math.max(V_PAD, window.innerHeight - ICON_PX - V_PAD);
        return { left: Math.min(Math.max(H_PAD, left), maxLeft), top: Math.min(Math.max(V_PAD, top), maxTop) };
    }

    function snapToEdges(p: { left: number; top: number; }): { left: number; top: number; } {
        const maxLeft = Math.max(H_PAD, window.innerWidth - ICON_PX - H_PAD);
        const maxTop = Math.max(V_PAD, window.innerHeight - ICON_PX - V_PAD);
        const toLeft = p.left - H_PAD;
        const toRight = maxLeft - p.left;
        // Snap horizontally to the nearest edge
        const snappedLeft = toLeft <= toRight ? H_PAD : maxLeft;
        // Optional vertical snap when near top/bottom
        let snappedTop = p.top;
        if (p.top - V_PAD < SNAP_THRESHOLD) snappedTop = V_PAD;
        else if (maxTop - p.top < SNAP_THRESHOLD) snappedTop = maxTop;
        return { left: snappedLeft, top: snappedTop };
    }

    function savePosition(p: { left: number; top: number; }) {
        try { chrome.storage.sync.set({ trackingWidgetPos: p }); } catch { }
        try { localStorage.setItem('trackingWidgetPos', JSON.stringify(p)); } catch { }
    }

    // Framer-motion drag handlers
    const onDragStart = () => {
        dragMovedRef.current = false;
        startRef.current = { left: mvLeft.get(), top: mvTop.get() };
        // Don't set isDragging yet; wait until we detect real movement in onDrag
    };
    const onDrag = (_e: any, info: { offset: { x: number; y: number; }; }) => {
        const dx = Math.abs(info?.offset?.x || 0);
        const dy = Math.abs(info?.offset?.y || 0);
        if (dx > 2 || dy > 2) {
            dragMovedRef.current = true;
            setIsDragging(true);
            // Close popover
            setExpanded(false);
        }
        // Let framer handle visual movement via transform during drag
    };
    const onDragEnd = async (_e: any, info: { offset: { x: number; y: number; }; }) => {
        const start = startRef.current || { left: position.left, top: position.top };
        const nextLeft = start.left + (info?.offset?.x || 0);
        const nextTop = start.top + (info?.offset?.y || 0);
        const clamped = clampToViewport(nextLeft, nextTop);
        const snapped = snapToEdges(clamped);
        setIsDragging(false);
        // Animate left/top while resetting transform x/y to 0 to avoid additive jumps
        await controls.start({ x: 0, y: 0, left: snapped.left, top: snapped.top, transition: { type: 'spring', stiffness: 500, damping: 40 } });
        setPosition(snapped);
        mvLeft.set(snapped.left);
        mvTop.set(snapped.top);
        savePosition(snapped);
        startRef.current = null;
        // Allow subsequent clicks to open popover
        dragMovedRef.current = false;
    };

    // Ensure initial position is clamped and snapped to an edge
    useEffect(() => {
        const snapped = snapToEdges(clampToViewport(position.left, position.top));
        setPosition(snapped);
        mvLeft.set(snapped.left);
        mvTop.set(snapped.top);
        savePosition(snapped);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-clamp and keep against edge on resize
    useEffect(() => {
        const onResize = () => {
            const snapped = snapToEdges(clampToViewport(position.left, position.top));
            setPosition(snapped);
            mvLeft.set(snapped.left);
            mvTop.set(snapped.top);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [position.left, position.top]);

    const IconButton = (
        <motion.div
            ref={containerRef}
            className={`!pointer-events-auto !select-none !fixed !z-[50000] !transition-opacity ${hovered ? '!opacity-100' : '!opacity-70'}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            drag
            dragMomentum={false}
            dragElastic={0}
            onDragStart={onDragStart}
            onDrag={onDrag as any}
            onDragEnd={onDragEnd as any}
            // Important: reset transform after drag so subsequent left/top math isn't compounded
            onUpdate={(latest) => {
                // If framer applied a transform via x/y, keep motion left/top as source of truth
                if (typeof (latest as any).x === 'number' || typeof (latest as any).y === 'number') {
                    // no-op, but hook ensures we can extend if needed
                }
            }}
            onClickCapture={(e) => {
                if (isDragging || dragMovedRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
            animate={controls}
            style={{ left: mvLeft, top: mvTop, cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' as any }}
        >
            <div className="!relative">
                <img
                    src={iconUrl}
                    alt="stupid-neko"
                    className="!h-[40px] !w-[40px] !rounded-full !border-2 !border-black !shadow-[4px_4px_0_0_#000] !bg-white"
                    draggable={false}
                    onDragStart={(e) => { e.preventDefault(); }}
                    style={{ userSelect: 'none' as any }}
                />
                <span className="!absolute !right-[10px] !top-[10px] !inline-flex !items-center !justify-center">


                    <span className="!absolute -!translate-x-1/2 -!translate-y-1/2 !h-[8px] !w-[8px] !rounded-full !bg-red-500" />

                    <span className="!absolute -!translate-x-1/2 -!translate-y-1/2 !h-[20px] !w-[20px] !rounded-full !bg-red-500/40" />


                </span>
            </div>
        </motion.div>
    );

    return (
        <Popover open={expanded} onOpenChange={setExpanded}>
            <PopoverTrigger asChild>
                {IconButton}
            </PopoverTrigger>
            <PopoverContent className="!p-[16px]">
                <div className="!flex !items-center !font-display !gap-2" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
                    <div className="!flex !items-center !gap-2 !font-semibold">
                        <span className="!text-inherit">Tracking</span>
                        <LanguageFlagSVG language={(props.languageCode as any) || 'ja'} className="!h-4 !w-6" />
                    </div>
                    <button
                        onClick={() => setExpanded(false)}
                        className="!ml-auto !inline-flex !items-center !rounded-md !border-2 !border-black !bg-white !px-[8px] !py-[4px] !text-[12px] hover:!bg-black hover:!text-white !transition-colors"
                        aria-label="Close"
                    >
                        <span className="!leading-none">Close</span>
                    </button>
                </div>

                <div className="!mt-3 !text-[24px] !font-bold !leading-snug">
                    Hey <span className="!font-black">{me?.name || userName}</span>! <span className="!opacity-80 !font-semibold">{encouragement}</span>
                </div>

                <div className="!mt-4">
                    <div className="!flex !items-center !gap-2 !text-[14px] !font-medium">
                        <span className="!text-inherit">Daily Streak</span>
                        <span className="!inline-flex !items-center !gap-1 !font-bold">
                            <span role="img" aria-label="fire">🔥</span>
                            <span className="!font-black">{dailyStreak}</span>
                        </span>
                        <span className="!ml-auto !rounded-full !border-2 !border-black !bg-white !px-[8px] !py-[4px] !text-[10px] !font-bold">
                            <span className="!font-black">{xpBonusPercent}%</span> XP Bonus
                        </span>
                    </div>
                    <div className="!mt-2">
                        <HeatmapProgress value={progressPercent} />
                    </div>
                </div>

                <div className="!mt-4 !text-[14px] !leading-relaxed">
                    <span className="!font-black">{nekos.toLocaleString()}</span> nekos watched <span className="!font-semibold !italic">{contentLabel}</span> to learn
                    {' '}<span className="!font-black">Japanese</span>! Totaling <span className="!font-black">{hours.toLocaleString()}</span> tracked hours. And
                    {' '}<span className="!font-black">{experienceMillions.toFixed(2)} million</span> experience!
                </div>
            </PopoverContent>
        </Popover>
    );
}


