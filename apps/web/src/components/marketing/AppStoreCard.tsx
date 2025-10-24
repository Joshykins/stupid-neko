'use client';
import { cn } from '../../lib/utils';

export default function AppStoreCard({ className }: { className?: string }) {
	return (
		<div className={cn('flex gap-3', className)}>
			{/* <a
                href="https://apps.apple.com/app/idXXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-black text-white px-3.5 py-2.5 hover:opacity-90"
                aria-label="Download on the App Store"
            >
                <Image src="/brands/apple.svg" alt="" width={18} height={18} className="shrink-0" />
                <span className="ml-2 flex flex-col text-left leading-none">
                    <span className="text-[10px]">Download on the</span>
                    <span className="text-sm font-semibold -mt-0.5">App Store</span>
                </span>
            </a>
            <a
                href="https://play.google.com/store/apps/details?id=com.example"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-black text-white px-3.5 py-2.5 hover:opacity-90"
                aria-label="Get it on Google Play"
            >
                <Image src="/brands/google-play-store.svg" alt="" width={18} height={18} className="shrink-0" />
                <span className="ml-2 flex flex-col text-left leading-none">
                    <span className="text-[10px]">Get it on</span>
                    <span className="text-sm font-semibold -mt-0.5">Google Play</span>
                </span>
            </a> */}
		</div>
	);
}
