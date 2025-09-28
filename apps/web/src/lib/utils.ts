import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: Array<ClassValue>) {
	return twMerge(clsx(inputs));
}

export function formatSeconds(totalSeconds: number): string {
	const sec = Math.max(0, Math.floor(totalSeconds || 0));
	const hours = Math.floor(sec / 3600);
	const minutes = Math.floor((sec % 3600) / 60);
	const seconds = sec % 60;

	const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
	const ss = String(seconds).padStart(2, '0');
	return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
