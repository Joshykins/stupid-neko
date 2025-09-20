import { CountUp } from "countup.js";
import * as React from "react";

type UseCountUpOptions = {
	duration?: number;
	decimalPlaces?: number;
	prefix?: string;
	suffix?: string;
};

export function useCountUp(value: number, options: UseCountUpOptions = {}) {
	const {
		duration = 1.2,
		decimalPlaces = 0,
		prefix = "",
		suffix = "",
	} = options;
	const ref = React.useRef<HTMLSpanElement | null>(null);
	const last = React.useRef<number>(0);

	React.useEffect(() => {
		const node = ref.current;
		if (!node || Number.isNaN(value)) return;

		const cu = new CountUp(node, value, {
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
				last.current = value;
			});
		} else {
			node.textContent = `${prefix ?? ""}${value.toLocaleString(undefined, { maximumFractionDigits: decimalPlaces })}${suffix ?? ""}`;
			last.current = value;
		}
		return () => cu.reset();
	}, [value, duration, decimalPlaces, prefix, suffix]);

	return ref;
}
