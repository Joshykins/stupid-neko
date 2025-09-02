"use client";
import * as React from "react";

export type StepRenderProps<State> = {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    next: () => void;
    back: () => void;
    goTo: (index: number) => void;
    index: number;
};

export type StepDef<State> = {
    id: string;
    title: string;
    subtitle: string;
    render: (props: StepRenderProps<State>) => React.ReactNode;
};

export function Stepper<State>({
    steps,
    initialState,
    className,
    onStepChange,
    onControlsChange,
    onStateChange,
}: {
    steps: Array<StepDef<State>>;
    initialState: State;
    className?: string;
    onStepChange?: (index: number) => void;
    onControlsChange?: (controls: { next: () => void; back: () => void; goTo: (index: number) => void; }) => void;
    onStateChange?: (state: State) => void;
}) {
    const [index, setIndex] = React.useState(0);
    const [state, setState] = React.useState<State>(initialState);

    const back = React.useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
    const next = React.useCallback(() => setIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);
    const goTo = React.useCallback((i: number) => setIndex(() => Math.min(Math.max(0, i), steps.length - 1)), [steps.length]);

    const Active = steps[index];

    React.useEffect(() => {
        onStepChange?.(index);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index]);

    React.useEffect(() => {
        onControlsChange?.({ next, back, goTo });
    }, [onControlsChange, next, back, goTo]);

    React.useEffect(() => {
        onStateChange?.(state);
    }, [onStateChange, state]);

    return (
        <div className={className}>
            {Active?.render({ state, setState, next, back, goTo, index })}
        </div>
    );
}

export default Stepper;


