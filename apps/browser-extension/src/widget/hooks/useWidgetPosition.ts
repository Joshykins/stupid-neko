import { useAnimation } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createLogger } from '../../lib/logger';
const log = createLogger('content', 'widget:ui');

const ICON_PX = 40;
const H_PAD = 32;
const V_PAD = 32;
const SNAP_THRESHOLD = 32;

type Position = { left: number; top: number; };

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
	} catch {
		/* noop */
	}
}

export function useWidgetPosition() {
	const [position, setPosition] = useState<Position>(() => ({
		left: 18,
		top: 100,
	}));

	const controls = useAnimation();
	const startRef = useRef<Position | null>(null);
	const dragMovedRef = useRef(false);

	// Load saved position on mount
	useEffect(() => {
		(async () => {
			try {
				const result = await chrome.storage.sync.get(['trackingWidgetPos']);
				if (result.trackingWidgetPos) {
					const saved = result.trackingWidgetPos as Position;
					const clamped = clampToViewport(saved.left, saved.top);
					const snapped = snapToEdges(clamped);
					setPosition(snapped);
				}
			} catch {
				/* noop */
			}
		})();
	}, []);

	// Re-clamp and keep against edge on resize
	useEffect(() => {
		const onResize = () => {
			const snapped = snapToEdges(clampToViewport(position.left, position.top));
			setPosition(snapped);
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, [position.left, position.top]);

	const onDragStart = () => {
		dragMovedRef.current = false;
		startRef.current = { left: position.left, top: position.top };
		// Ensure framer takes control only while pointer is down
		// (Framer handles this internally; we just reset our flags here)
	};

	const onDrag = (_e: unknown, info: { offset: { x: number; y: number; }; }) => {
		const dx = Math.abs(info?.offset?.x || 0);
		const dy = Math.abs(info?.offset?.y || 0);
		if (dx > 2 || dy > 2) {
			dragMovedRef.current = true;
		}
	};

	const onDragEnd = async (
		_e: unknown,
		info: { offset: { x: number; y: number; }; }
	) => {
		const start = startRef.current || {
			left: position.left,
			top: position.top,
		};
		const nextLeft = start.left + (info?.offset?.x || 0);
		const nextTop = start.top + (info?.offset?.y || 0);
		const clamped = clampToViewport(nextLeft, nextTop);
		const snapped = snapToEdges(clamped);

		log.debug('=== DRAG END DEBUG ===');
		log.debug('1. Start position:', start);
		log.debug('2. Drag offset:', { x: info?.offset?.x || 0, y: info?.offset?.y || 0 });
		log.debug('3. Let-go position:', { left: nextLeft, top: nextTop });
		log.debug('4. Snapped position:', snapped);

		// Clear drag flag after a tick so pointerUp can detect drag state properly
		setTimeout(() => {
			dragMovedRef.current = false;
		}, 0);

		// Animate absolute left/top; reset transforms to zero to avoid additive jumps
		await controls.start({
			x: 0,
			y: 0,
			left: snapped.left,
			top: snapped.top,
			transition: { type: 'spring', stiffness: 500, damping: 40 },
		});

		setPosition(snapped);
		savePosition(snapped);

		startRef.current = null;
		log.debug('=== END DRAG DEBUG ===');
	};

	return {
		position,
		controls,
		onDragStart,
		onDrag,
		onDragEnd,
		dragMovedRef,
	};
}