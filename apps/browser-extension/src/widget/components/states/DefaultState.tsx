import React from 'react';
import HeatmapProgress from '../../../components/ui/heatmap-progress';
import { LanguageCode } from '../../../../../../convex/schema';
import { calculateStreakBonusPercent } from '../../../../../../lib/streakBonus';

interface DefaultStateProps {
    userName?: string;
    targetLanguage?: LanguageCode;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultState: React.FC<DefaultStateProps> = ({
    userName,
    targetLanguage,
    renderDebugInfo,
}) => {
    // Mock data for now - these would come from props or hooks in real implementation
    const me = { name: userName };
    const dailyStreak = 7;
    const progressPercent = 65;
    const xpBonusPercent = calculateStreakBonusPercent(dailyStreak);
    const encouragement = "Keep it up!";
    const contentLabel = "Watch videos";

    return (
        <>
            <div className="snbex:mt-3 snbex:text-2xl snbex:font-bold snbex:leading-snug">
                Hey{' '}
                <span className="snbex:font-black">
                    {me?.name || userName}
                </span>
                !{' '}
                <span className="snbex:opacity-80 snbex:font-semibold">
                    {encouragement}
                </span>
            </div>

            <div className="snbex:mt-4">
                <div className="snbex:flex snbex:items-center snbex:gap-2 snbex:text-sm snbex:font-medium">
                    <span>Daily Streak</span>
                    <span className="snbex:inline-flex snbex:items-center snbex:gap-1 snbex:font-bold">
                        <span role="img" aria-label="fire">
                            🔥
                        </span>
                        <span className="snbex:font-black">{dailyStreak}</span>
                    </span>
                    <span className="snbex:ml-auto snbex:rounded-full snbex:border-2 snbex:border-black snbex:bg-white snbex:px-2 snbex:py-1 snbex:text-xs snbex:font-bold">
                        <span className="snbex:font-black">{xpBonusPercent}%</span> XP
                        Bonus
                    </span>
                </div>
                <div className="snbex:mt-2">
                    <HeatmapProgress value={progressPercent} />
                </div>
            </div>

            <div className="snbex:mt-4 snbex:text-sm snbex:leading-relaxed">
                <span className="snbex:font-semibold snbex:italic">
                    {contentLabel}
                </span>{' '}
                to learn <span className="snbex:font-black">{targetLanguage || 'Japanese'}</span>!

            </div>
            {renderDebugInfo?.()}
        </>
    );
};
