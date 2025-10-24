import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { languageCodeToLabel } from '../../../../../lib/languages';
import { useAuth } from '../hooks/useAuth';
import { useUserProgress } from '../hooks/useUserProgress';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useMemo, useState, useEffect } from 'react';

// Universal encouragements (work for all languages)
const universalEncouragements = [
	// Cat-themed encouragements
	'Keep it up, nya!',
	"You're doing great, kitty!",
	'Purr-fect progress!',
	'Meow-velous work!',
	'Paws-itively amazing!',
	'Claw-some dedication!',
	'Fur-tastic effort!',
	'Cat-ching up nicely!',
	'Whisker-licking good!',
	'Tail-wagging progress!',

	// Language learning themed
	'Keep learning!',
	"You're getting better!",
	'Amazing progress!',
	'Stay consistent!',
	'Every day counts!',
	"You're on fire!",
	'Keep the momentum!',
	'Fantastic work!',
	"Don't give up!",
	"You've got this!",

	// Playful mixed
	'Learning like a pro!',
	'Crushing it!',
	'On fire today!',
	'Absolutely killing it!',
	'Unstoppable!',
	'Rocking it!',
	'Slaying the game!',
	'Boss mode activated!',
	'Legendary effort!',
	'Champion status!',
];

// Japanese-specific encouragements
const japaneseEncouragements = [
	'Ganbatte!',
	'Sugoi!',
	'Yoku yatta!',
	'Tsuzukete!',
	'Otsukaresama!',
	'Keep it up, neko!',
	'Yatta!',
	'Subarashii!',
	'Keep going, nya!',
	'Omedetou!',
];

// Various content labels for different learning activities
const contentLabels = [
	// Reading activities
	'Read to learn',
	'Study with books',
	'Read articles',
	'Practice reading',
	'Dive into texts',
	'Explore literature',
	'Read manga',
	'Study newspapers',
	'Read blogs',
	'Practice kanji',

	// Watching activities
	'Watch videos',
	'Watch anime',
	'Watch shows',
	'Watch movies',
	'Watch tutorials',
	'Watch documentaries',
	'Watch streams',
	'Watch lessons',
	'Watch content',
	'Study with videos',

	// Listening activities
	'Listen to music',
	'Listen to podcasts',
	'Listen to audiobooks',
	'Listen to radio',
	'Practice listening',
	'Listen to conversations',
	'Study with audio',
	'Listen to news',
	'Practice pronunciation',
	'Listen to stories',

	// Interactive activities
	'Play games',
	'Use flashcards',
	'Practice speaking',
	'Chat with natives',
	'Join conversations',
	'Practice writing',
	'Take quizzes',
	'Solve puzzles',
	'Practice grammar',
	'Use language apps',

	// General learning
	'Learn actively',
	'Study daily',
	'Practice regularly',
	'Immerse yourself',
	'Keep learning',
	'Stay consistent',
	'Build habits',
	'Track progress',
	'Stay motivated',
	'Enjoy the journey',
];

interface MainViewProps {
	onOpenSettings?: () => void;
}

export function MainView({ onOpenSettings }: MainViewProps) {
	const auth = useAuth();
	const { progress, loading: progressLoading } = useUserProgress();
	const [isMounted, setIsMounted] = useState(false);

	const languageLabel = auth.me?.languageCode
		? languageCodeToLabel(auth.me.languageCode)
		: 'Language';

	// Progress bar animation setup (similar to UserProgressCard)
	useEffect(() => {
		const timer = setTimeout(() => setIsMounted(true), 0);
		return () => clearTimeout(timer);
	}, []);

	// Calculate XP progress
	const experienceTowardsNextLevel = progress?.experienceTowardsNextLevel || 0;
	const nextLevelXp = progress?.nextLevelXp || 1;
	const xpPercent = Math.min(
		100,
		Math.round((experienceTowardsNextLevel / nextLevelXp) * 100)
	);
	const displayedXpPercent = isMounted ? xpPercent : 0;
	const xpString = `${experienceTowardsNextLevel?.toLocaleString() || 0} / ${nextLevelXp?.toLocaleString() || 0} XP`;

	// Get a random encouragement that changes on each render
	const encouragement = useMemo(() => {
		const isJapanese = auth.me?.languageCode === 'ja';
		const availableEncouragements = isJapanese
			? [...universalEncouragements, ...japaneseEncouragements]
			: universalEncouragements;

		return availableEncouragements[
			Math.floor(Math.random() * availableEncouragements.length)
		];
	}, [auth.me?.languageCode]);

	// Get a random content label that changes on each render
	const contentLabel = useMemo(() => {
		return contentLabels[Math.floor(Math.random() * contentLabels.length)];
	}, []);

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			transition={{ duration: 0.18 }}
			className="snbex:flex snbex:flex-col snbex:items-start snbex:w-full snbex:px-2"
		>
			{!auth.isAuthed && (
				<div className="snbex:mt-4 snbex:w-full snbex:flex snbex:flex-col snbex:items-start snbex:gap-3">
					<p className="snbex:text-xs snbex:text-gray-500 snbex:text-left">
						Connect your integration key to start tracking your learning
						activity.
					</p>
					{onOpenSettings && (
						<Button onClick={onOpenSettings} size="sm" className="snbex:gap-2">
							<Settings className="snbex:w-4 snbex:h-4" />
							Connect Integration Key
						</Button>
					)}
				</div>
			)}
			{auth.isAuthed && (
				<div className="snbex:w-full snbex:flex snbex:flex-col snbex:items-start snbex:gap-3">
					<div className="snbex:text-xl snbex:font-bold snbex:leading-snug">
						Hey <span className="snbex:font-black">{auth.me?.name}</span>!{' '}
						<span className="snbex:opacity-80 snbex:font-semibold">
							{encouragement}
						</span>
					</div>

					{/* Progress Display */}
					{progress && !progressLoading && (
						<div className="snbex:w-full snbex:flex snbex:gap-4 snbex:items-baseline">
							<div className="snbex:shadow-shadow snbex:border-border snbex:border-2 snbex:rounded-base snbex:mt-2 snbex:p-2">
								<div className="snbex:font-semibold snbex:text-xs">
									Tracked Hours
								</div>
								<div className="snbex:text-2xl snbex:font-bold snbex:text-main-foreground">
									{Math.floor(
										((progress.totalMsLearning || 0) / 1000 / 60 / 60) * 10
									) / 10}{' '}
									hrs
								</div>
							</div>
							<div className="snbex:flex-1">
								<div className="snbex:flex snbex:items-center snbex:justify-between snbex:text-sm snbex:font-medium">
									<span className="snbex:text-right snbex:justify-end snbex:w-full snbex:flex snbex:items-center snbex:gap-2">
										{xpString}
									</span>
								</div>
								<div className="snbex:mt-2">
									<Progress
										value={displayedXpPercent}
										indicatorColor={'var(--level-progress)'}
									/>
								</div>
							</div>
						</div>
					)}

					<div className="snbex:text-sm snbex:leading-relaxed">
						<span className="snbex:font-semibold snbex:italic">
							{contentLabel}
						</span>{' '}
						to learn{' '}
						<span className="snbex:font-black">
							{languageLabel || 'Japanese'}
						</span>
						!
					</div>
				</div>
			)}
		</motion.div>
	);
}
