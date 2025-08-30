import * as React from "react";

type UseCountUpOptions = {
    duration?: number;
    decimalPlaces?: number;
    prefix?: string;
    suffix?: string;
};

export function useCountUp(value: number, options: UseCountUpOptions = {}) {
    const { duration = 1.2, decimalPlaces = 0, prefix, suffix } = options;
    const ref = React.useRef<HTMLSpanElement | null>(null);
    const last = React.useRef<number>(0);

    React.useEffect(() => {
        const node = ref.current;
        if (!node || Number.isNaN(value)) return;

        let cancelled = false;
        let cleanup: (() => void) | undefined;

        (async () => {
            try {
                const mod: any = await import("countup.js").catch(() => null);
                const CountUpCtor = mod?.CountUp;
                if (CountUpCtor) {
                    const cu = new CountUpCtor(node, value, {
                        startVal: last.current,
                        duration,
                        decimalPlaces,
                        useEasing: true,
                        useGrouping: true,
                        separator: ",",
                        prefix,
                        suffix,
                    });
                    if (!cu.error) {
                        cu.start(() => {
                            if (cancelled) return;
                            last.current = value;
                        });
                        cleanup = () => cu.reset();
                        return;
                    }
                }
            } catch {}

            // Fallback animation
            const start = performance.now();
            const startVal = last.current;
            const delta = value - startVal;
            const durationMs = Math.max(0, duration) * 1000;

            function step(now: number) {
                if (cancelled) return;
                const t = Math.min(1, (now - start) / durationMs);
                // easeOutExpo
                const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
                const current = startVal + delta * eased;
                node.textContent = `${prefix ?? ""}${current.toLocaleString(undefined, { maximumFractionDigits: decimalPlaces })}${suffix ?? ""}`;
                if (t < 1) requestAnimationFrame(step);
                else last.current = value;
            }
            requestAnimationFrame(step);
            cleanup = () => {};
        })();

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [value, duration, decimalPlaces, prefix, suffix]);

    return ref;
}


