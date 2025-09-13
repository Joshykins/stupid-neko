import type { CSSProperties, FC } from "react";
import { useEffect, useState } from "react";

// Local helper for safe class concatenation without external deps
function cx(...classes: Array<string | undefined | false>): string {
    return classes.filter(Boolean).join(" ");
}

// Configuration (editable)
export const MAX_BIRD_INCLINATION_DEG = 30; // Limit tilt from horizontal
export const GROUP_COUNT_RANGE: Readonly<[number, number]> = [1, 6]; // number of traveling groups
export const BIRDS_PER_GROUP_RANGE: Readonly<[number, number]> = [1, 3]; // birds in each group
export const MIN_GROUP_SEPARATION_VH = 6; // min vertical spacing between group paths (vh)
export const GROUP_OFFSET_RANGE_VW: Readonly<[number, number]> = [-2, 2]; // lateral spread per bird in group
export const GROUP_OFFSET_RANGE_VH: Readonly<[number, number]> = [-2, 2]; // vertical spread per bird in group
export const FLAP_DURATION_RANGE_SEC: Readonly<[number, number]> = [0.8, 1];
export const FLAP_DELAY_RANGE_SEC: Readonly<[number, number]> = [0, 1.5];
export const SPEED_RANGE_SEC: Readonly<[number, number]> = [30, 50]; // travel time across screen
export const SCALE_RANGE: Readonly<[number, number]> = [0.1, 0.18];
export const SCALE_VARIATION_WITHIN_GROUP = 0.35; // ±35%
export const SPAWN_MARGIN_VW = 5; // offscreen margin for spawn/exit
export const FADE_DURATION_SEC_RANGE: Readonly<[number, number]> = [5, 6];
export const FADE_DELAY_SEC_RANGE: Readonly<[number, number]> = [0, 6.0];

export type BirdProps = {
    className?: string;
    style?: CSSProperties;
    flapDurationSec?: number; // Duration per flap cycle
    orientationDeg?: number; // Heading in degrees (0 = right)
    animationDelaySec?: number; // Delay before flap starts
    randomizeDelay?: boolean; // If true and delay not provided, randomize
    scale?: number; // Visual scale of the bird (default 0.15)
};

export const Bird: FC<BirdProps> = ({
    className,
    style,
    flapDurationSec = 1.2,
    orientationDeg = 0,
    animationDelaySec,
    randomizeDelay = false,
    scale = 0.15,
}) => {
    const delaySeconds =
        animationDelaySec !== undefined
            ? animationDelaySec
            : randomizeDelay
                ? Math.random() * 2
                : 0;

    // Base silhouette points left (180°). Always rotate to (heading - 180) so it faces the heading.
    // Optionally mirror for rightward headings to keep the original mirrored style.
    const normalized = ((orientationDeg % 360) + 360) % 360;
    const isRightward = normalized <= 90 || normalized >= 270;
    let baseRotation = orientationDeg - 180;
    if (isRightward) {
        baseRotation = orientationDeg * -1;
    }
    const containerTransform = `${isRightward ? "scaleX(-1) " : ""}rotate(${baseRotation}deg) scale(${scale})`;
    const wingAnimation = `bird-flap ${flapDurationSec}s ease-in-out ${delaySeconds}s infinite alternate`;

    const mergedStyle: CSSProperties = {
        transform: containerTransform,
        ...style,
    };

    return (
        <div
            className={cx(
                "absolute origin-top-left will-change-transform",
                className,
            )}
            style={mergedStyle}
        >
            {/* Body */}
            <div
                className={cx(
                    "w-[150px] h-10 bg-[#0E1B34]",
                    "[clip-path:polygon(0_100%,20%_20%,40%_0,100%_100%,20%_80%)]",
                )}
            />

            {/* Wing group */}
            <div
                className={cx(
                    "relative left-10 -top-5 w-10 h-[50px] bg-[#0E1B34]",
                    "[transform:skew(10deg)] [transform-origin:0_0]",
                )}
                style={{ animation: wingAnimation }}
            >
                <div className="absolute -bottom-[25px] left-[13px] [transform:rotate(-5deg)]">
                    <div className="w-10 h-[30px] bg-[#0E1B34] [transform:skew(40deg)]" />
                </div>
            </div>
        </div>
    );
};

// Helpers for randomized groups
function randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

type Side = "left" | "right";
function pickHorizontalSide(): Side {
    return Math.random() < 0.5 ? "left" : "right";
}
function opposite(side: Side): Side {
    return side === "left" ? "right" : "left";
}

type GroupSpec = {
    startXvw: number;
    startYvh: number;
    endXvw: number;
    endYvh: number;
    angleDeg: number;
    durationSec: number;
    delaySec: number;
    fadeDelaySec: number;
    birds: Array<{
        offsetXvw: number;
        offsetYvh: number;
        scale: number;
        flapDurationSec: number;
        flapDelaySec: number;
    }>;
};

function makeGroup(existingStartY: Array<number>): GroupSpec {
    const enter = pickHorizontalSide();
    const exit = opposite(enter);

    const startXvw = enter === "left" ? -SPAWN_MARGIN_VW : 100 + SPAWN_MARGIN_VW;
    const endXvw = exit === "right" ? 100 + SPAWN_MARGIN_VW : -SPAWN_MARGIN_VW;

    // Choose startY with minimum separation from other groups
    let startYvh = randomBetween(0, 100);
    let guard = 0;
    while (existingStartY.some((y) => Math.abs(y - startYvh) < MIN_GROUP_SEPARATION_VH) && guard < 50) {
        startYvh = randomBetween(0, 100);
        guard += 1;
    }

    // Constrain path inclination
    const dx = endXvw - startXvw;
    const maxSlope = Math.tan((MAX_BIRD_INCLINATION_DEG * Math.PI) / 180);
    const maxDy = Math.abs(dx) * maxSlope;
    const dy = randomBetween(-maxDy, maxDy);
    const endYvh = Math.max(-SPAWN_MARGIN_VW, Math.min(100 + SPAWN_MARGIN_VW, startYvh + dy));

    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const durationSec = randomBetween(SPEED_RANGE_SEC[0], SPEED_RANGE_SEC[1]);
    // Start mid-flight by using a negative delay up to one full duration
    const delaySec = -randomBetween(0, durationSec);
    const fadeDelaySec = randomBetween(FADE_DELAY_SEC_RANGE[0], FADE_DELAY_SEC_RANGE[1]);

    // Generate birds within this group, enforcing some minimum spacing
    const count = Math.round(randomBetween(BIRDS_PER_GROUP_RANGE[0], BIRDS_PER_GROUP_RANGE[1] + 0.49));
    const baseScale = randomBetween(SCALE_RANGE[0], SCALE_RANGE[1]);
    const birds: GroupSpec["birds"] = [];
    for (let i = 0; i < count; i += 1) {
        let ox = randomBetween(GROUP_OFFSET_RANGE_VW[0], GROUP_OFFSET_RANGE_VW[1]);
        let oy = randomBetween(GROUP_OFFSET_RANGE_VH[0], GROUP_OFFSET_RANGE_VH[1]);
        let tries = 0;
        while (birds.some((b) => Math.hypot(b.offsetXvw - ox, b.offsetYvh - oy) < 1.5) && tries < 20) {
            ox = randomBetween(GROUP_OFFSET_RANGE_VW[0], GROUP_OFFSET_RANGE_VW[1]);
            oy = randomBetween(GROUP_OFFSET_RANGE_VH[0], GROUP_OFFSET_RANGE_VH[1]);
            tries += 1;
        }
        const scaleVariation = 1 + randomBetween(-SCALE_VARIATION_WITHIN_GROUP, SCALE_VARIATION_WITHIN_GROUP);
        const scale = Math.max(SCALE_RANGE[0], Math.min(SCALE_RANGE[1], baseScale * scaleVariation));
        const flapDurationSec = randomBetween(FLAP_DURATION_RANGE_SEC[0], FLAP_DURATION_RANGE_SEC[1]);
        const flapDelaySec = -randomBetween(0, flapDurationSec); // start mid-cycle so it's already flapping during fade-in
        birds.push({
            offsetXvw: ox,
            offsetYvh: oy,
            scale,
            flapDurationSec,
            flapDelaySec,
        });
    }

    return { startXvw, startYvh, endXvw, endYvh, angleDeg, durationSec, delaySec, fadeDelaySec, birds };
}

export const BackgroundBirds: FC<{ className?: string; enabled?: boolean; }> = ({
    className,
    enabled = true,
}) => {
    const [groups, setGroups] = useState<Array<GroupSpec>>([]);

    useEffect(() => {
        if (!enabled) return;
        const [minGroups, maxGroups] = GROUP_COUNT_RANGE;
        const total = Math.round(randomBetween(minGroups, maxGroups + 0.49));
        const built: Array<GroupSpec> = [];
        const existingStartY: Array<number> = [];
        for (let i = 0; i < total; i += 1) {
            const g = makeGroup(existingStartY);
            built.push(g);
            existingStartY.push(g.startYvh);
        }
        setGroups(built);
    }, [enabled]);

    if (!enabled || groups.length === 0) return null;

    return (
        <div className={cx("absolute inset-0 pointer-events-none select-none z-[1]", className)}>
            <style>{`
@keyframes bird-flap {
  0% { transform: skew(10deg) rotateX(50deg); }
  100% { transform: skew(15deg) rotateX(120deg); }
}
@keyframes bird-fade-in {
  0% { opacity: 0;  }
  100% { opacity: 1; }
}
            `}</style>
            {groups.map((g, gi) => (
                <div key={gi} className="absolute" style={{ left: `${g.startXvw}vw`, top: `${g.startYvh}vh` }}>
                    <style>{`
@keyframes bird-group-${gi}-travel {
  0% { transform: translate(0, 0); }
  100% { transform: translate(${g.endXvw - g.startXvw}vw, ${g.endYvh - g.startYvh}vh); }
}
                    `}</style>
                    <div className="absolute" style={{ opacity: 0, willChange: "opacity, transform", animation: `bird-fade-in ${Math.max(FADE_DURATION_SEC_RANGE[0], Math.min(FADE_DURATION_SEC_RANGE[1], g.durationSec * 0.04)).toFixed(2)}s ease-out ${g.fadeDelaySec.toFixed(2)}s 1 forwards` }}>
                        <div className="absolute" style={{ willChange: "transform", animation: `bird-group-${gi}-travel ${g.durationSec}s linear ${g.delaySec}s infinite` }}>
                            {g.birds.map((b, bi) => (
                                <Bird
                                    key={`${gi}-${bi}`}
                                    className="absolute z-[10]"
                                    orientationDeg={g.angleDeg}
                                    flapDurationSec={b.flapDurationSec}
                                    animationDelaySec={b.flapDelaySec}
                                    scale={b.scale}
                                    style={{ left: `${b.offsetXvw}vw`, top: `${b.offsetYvh}vh` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BackgroundBirds;
