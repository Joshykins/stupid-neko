import { useEffect, useRef, useState } from "react";
import { useAnimation, useMotionValue } from "framer-motion";

type Position = { left: number; top: number };

const ICON_PX = 40;
const H_PAD = 32; // horizontal padding from screen edges
const V_PAD = 64; // vertical padding from screen edges
const SNAP_THRESHOLD = 32; // px

function clampToViewport(left: number, top: number): Position {
	const maxLeft = Math.max(H_PAD, window.innerWidth - ICON_PX - H_PAD);
	const maxTop = Math.max(V_PAD, window.innerHeight - ICON_PX - V_PAD);
	return {
		left: Math.min(Math.max(H_PAD, left), maxLeft),
		top: Math.min(Math.max(V_PAD, top), maxTop),
	};
}

function snapToEdges(p: Position): Position {
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

function savePosition(p: Position) {
	try {
		chrome.storage.sync.set({ trackingWidgetPos: p });
	} catch {}
	try {
		localStorage.setItem("trackingWidgetPos", JSON.stringify(p));
	} catch {}
}

export function useWidgetPosition() {
	const [position, setPosition] = useState<Position>(() => ({
		left: 18,
		top: 100,
	}));
	const dragMovedRef = useRef(false);
	const startRef = useRef<Position | null>(null);
	const positionRef = useRef<Position>(position);
	const controls = useAnimation();
	const mvLeft = useMotionValue<number>(position.left);
	const mvTop = useMotionValue<number>(position.top);

	useEffect(() => {
		positionRef.current = position;
	}, [position]);

	// Load persisted position (chrome.storage.sync with localStorage fallback)
	useEffect(() => {
		(async () => {
			try {
				const data = await new Promise<Record<string, any>>((resolve) => {
					try {
						chrome.storage.sync.get(["trackingWidgetPos"], (items) =>
							resolve(items || {}),
						);
					} catch {
						resolve({});
					}
				});
				const p = data?.trackingWidgetPos;
				if (p && typeof p.left === "number" && typeof p.top === "number") {
					setPosition({ left: p.left, top: p.top });
					return;
				}
			} catch {}
			try {
				const raw = localStorage.getItem("trackingWidgetPos");
				if (raw) {
					const parsed = JSON.parse(raw);
					if (
						parsed &&
						typeof parsed.left === "number" &&
						typeof parsed.top === "number"
					)
						setPosition(parsed);
				}
			} catch {}
		})();
	}, []);

	// Ensure initial position is clamped and snapped to an edge
	useEffect(() => {
		const snapped = snapToEdges(clampToViewport(position.left, position.top));
		setPosition(snapped);
		mvLeft.set(snapped.left);
		mvTop.set(snapped.top);
		savePosition(snapped);
	}, [position.left, position.top, mvLeft, mvTop]);

	// Re-clamp and keep against edge on resize
	useEffect(() => {
		const onResize = () => {
			const snapped = snapToEdges(clampToViewport(position.left, position.top));
			setPosition(snapped);
			mvLeft.set(snapped.left);
			mvTop.set(snapped.top);
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [position.left, position.top, mvLeft, mvTop]);

	const onDragStart = () => {
		dragMovedRef.current = false;
		startRef.current = { left: mvLeft.get(), top: mvTop.get() };
	};

	const onDrag = (_e: any, info: { offset: { x: number; y: number } }) => {
		const dx = Math.abs(info?.offset?.x || 0);
		const dy = Math.abs(info?.offset?.y || 0);
		if (dx > 2 || dy > 2) {
			dragMovedRef.current = true;
		}
	};

	const onDragEnd = async (
		_e: any,
		info: { offset: { x: number; y: number } },
	) => {
		const start = startRef.current || {
			left: position.left,
			top: position.top,
		};
		const nextLeft = start.left + (info?.offset?.x || 0);
		const nextTop = start.top + (info?.offset?.y || 0);
		const clamped = clampToViewport(nextLeft, nextTop);
		const snapped = snapToEdges(clamped);

		// Animate left/top while resetting transform x/y to 0 to avoid additive jumps
		await controls.start({
			x: 0,
			y: 0,
			left: snapped.left,
			top: snapped.top,
			transition: { type: "spring", stiffness: 500, damping: 40 },
		});
		setPosition(snapped);
		mvLeft.set(snapped.left);
		mvTop.set(snapped.top);
		savePosition(snapped);
		startRef.current = null;
		// Allow subsequent clicks to open popover
		dragMovedRef.current = false;
	};

	return {
		position,
		mvLeft,
		mvTop,
		controls,
		dragMovedRef,
		onDragStart,
		onDrag,
		onDragEnd,
	};
}
