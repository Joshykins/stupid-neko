import { BackgroundSVGs } from "./BackgroundSVGs";

export const Background = () => {
    return (
        <div className="fixed inset-0 flex flex-col items-center -z-1 bg-mountain-tier-3">

            <div className="flex justify-center w-full bg-mountain-sky pt-[8vh]">
                <BackgroundSVGs type="bg-mountain-1" className="w-screen translate-y-[1.2vh] translate-x-[16vw] min-w-7xl max-w-[2000px]" />
            </div>

            <div className="flex justify-center w-full bg-mountain-tier-1 pt-4">
                <BackgroundSVGs type="bg-mountain-2" className="w-screen  translate-y-[1.2vh] min-w-7xl max-w-[2000px]" />
            </div>
            <div className="flex justify-center w-full bg-mountain-tier-2 pt-4">
                <BackgroundSVGs type="bg-mountain-3" className="w-screen translate-y-[1.2vh] min-w-7xl max-w-[2000px]" />
            </div>
        </div>
    );
};