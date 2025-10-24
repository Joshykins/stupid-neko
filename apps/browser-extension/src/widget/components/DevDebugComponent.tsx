import { Wrench } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import type { WidgetState } from '../../pages/background/providers/types';
import { getWidgetStateConfig } from '../config/widgetStates';

interface DevDebugComponentProps {
	widgetState: WidgetState;
	userInfo: {
		userName: string;
		languageCode: string;
	};
	currentTime: number;
}

export function DevDebugComponent({
	widgetState,
	userInfo,
	currentTime,
}: DevDebugComponentProps) {
	const sessionDuration = widgetState.startTime
		? Math.floor((currentTime - widgetState.startTime) / 1000)
		: 0;

	// Get state configuration for color coding
	const stateConfig = getWidgetStateConfig(widgetState.state);

	// Color coding for different states and providers
	const getStateColor = (state: WidgetState['state']) => {
		const config = getWidgetStateConfig(state);
		return `${config.visibility === 'visible' ? 'snbex:bg-green-500/20 snbex:text-green-200 snbex:border-green-400/30' : 'snbex:bg-yellow-500/20 snbex:text-yellow-200 snbex:border-yellow-400/30'}`;
	};

	const getProviderColor = (provider?: string) => {
		if (provider === 'youtube')
			return 'snbex:bg-red-500/20 snbex:text-red-200 snbex:border-red-400/30';
		if (provider === 'website-provider')
			return 'snbex:bg-blue-500/20 snbex:text-blue-200 snbex:border-blue-400/30';
		return 'snbex:bg-gray-500/20 snbex:text-gray-200 snbex:border-gray-400/30';
	};

	return (
		<div className="snbex:absolute snbex:pt-4 snbex:right-0 snbex:left-0 snbex:bottom-0 snbex:h-4 snbex:translate-y-full">
			<Card className="snbex:backdrop-blur-lg snbex:bg-black/40 snbex:border-white/10">
				<CardContent className="snbex:p-3">
					<div className="snbex:mb-3 snbex:text-xs snbex:font-bold snbex:text-white snbex:flex snbex:items-center snbex:gap-2">
						<Wrench className="snbex:size-4 snbex:text-white" />
						DEBUG MODE PANEL
					</div>

					<div className="snbex:space-y-2 snbex:text-xs">
						{/* Widget State */}
						<div className="snbex:space-y-1">
							<div className="snbex:flex snbex:items-center snbex:gap-2">
								<span className="snbex:font-medium snbex:text-white">
									State:
								</span>
								<Badge
									className={`snbex:px-2 snbex:py-1 snbex:rounded snbex:border ${getStateColor(widgetState.state)}`}
								>
									{widgetState.state}
								</Badge>
							</div>

							{/* State Configuration Details */}
							<div className="snbex:ml-2 snbex:space-y-1">
								<div className="snbex:flex snbex:items-center snbex:gap-2">
									<span className="snbex:text-white/70">Visibility:</span>
									<Badge
										className={`snbex:px-1.5 snbex:py-0.5 snbex:rounded snbex:text-xs ${stateConfig.visibility === 'visible' ? 'snbex:bg-green-500/20 snbex:text-green-200 snbex:border-green-400/30' : 'snbex:bg-yellow-500/20 snbex:text-yellow-200 snbex:border-yellow-400/30'}`}
									>
										{stateConfig.visibility}
									</Badge>
								</div>

								<div className="snbex:flex snbex:items-center snbex:gap-2">
									<span className="snbex:text-white/70">Open On Load:</span>
									<Badge
										className={`snbex:px-1.5 snbex:py-0.5 snbex:rounded snbex:text-xs ${stateConfig.openOnLoad ? 'snbex:bg-green-500/20 snbex:text-green-200 snbex:border-green-400/30' : 'snbex:bg-gray-500/20 snbex:text-gray-200 snbex:border-gray-400/30'}`}
									>
										{stateConfig.openOnLoad ? 'Yes' : 'No'}
									</Badge>
								</div>

								<div className="snbex:flex snbex:items-center snbex:gap-2">
									<span className="snbex:text-white/70">
										Force Always Expanded:
									</span>
									<Badge
										className={`snbex:px-1.5 snbex:py-0.5 snbex:rounded snbex:text-xs ${stateConfig.forceAlwaysExpanded ? 'snbex:bg-red-500/20 snbex:text-red-200 snbex:border-red-400/30' : 'snbex:bg-gray-500/20 snbex:text-gray-200 snbex:border-gray-400/30'}`}
									>
										{stateConfig.forceAlwaysExpanded ? 'Yes' : 'No'}
									</Badge>
								</div>
							</div>
						</div>

						{/* Provider */}
						{widgetState.provider && (
							<div className="snbex:flex snbex:items-center snbex:gap-2">
								<span className="snbex:font-medium snbex:text-white">
									Provider:
								</span>
								<Badge
									className={`snbex:px-2 snbex:py-1 snbex:rounded snbex:border ${getProviderColor(widgetState.provider)}`}
								>
									{widgetState.provider}
								</Badge>
							</div>
						)}

						{/* Domain */}
						{widgetState.domain && (
							<div className="snbex:flex snbex:items-center snbex:gap-2">
								<span className="snbex:font-medium snbex:text-white">
									Domain:
								</span>
								<span className="snbex:font-mono snbex:text-white/80 snbex:bg-white/10 snbex:px-2 snbex:py-1 snbex:rounded">
									{widgetState.domain}
								</span>
							</div>
						)}

						{/* Detected Language */}
						{widgetState.detectedLanguage && (
							<div className="snbex:flex snbex:items-center snbex:gap-2">
								<span className="snbex:font-medium snbex:text-white">
									Detected Lang:
								</span>
								<Badge className="snbex:bg-purple-500/20 snbex:text-purple-200 snbex:border-purple-400/30 snbex:px-2 snbex:py-1 snbex:rounded">
									{widgetState.detectedLanguage}
								</Badge>
							</div>
						)}

						{/* User Info */}
						<div className="snbex:flex snbex:items-center snbex:gap-2">
							<span className="snbex:font-medium snbex:text-white">User:</span>
							<span className="snbex:font-mono snbex:text-white/80 snbex:bg-white/10 snbex:px-2 snbex:py-1 snbex:rounded">
								{userInfo.userName} ({userInfo.languageCode})
							</span>
						</div>

						{/* Session Duration */}
						{widgetState.startTime && (
							<div className="snbex:flex snbex:items-center snbex:gap-2">
								<span className="snbex:font-medium snbex:text-white">
									Session:
								</span>
								<span className="snbex:font-mono snbex:text-white/80 snbex:bg-white/10 snbex:px-2 snbex:py-1 snbex:rounded">
									{sessionDuration}s
								</span>
							</div>
						)}

						{/* Error */}
						{widgetState.error && (
							<div className="snbex:flex snbex:items-center snbex:gap-2">
								<span className="snbex:font-medium snbex:text-white">
									Error:
								</span>
								<span className="snbex:font-mono snbex:text-red-200 snbex:bg-red-500/20 snbex:px-2 snbex:py-1 snbex:rounded snbex:break-all">
									{widgetState.error}
								</span>
							</div>
						)}

						{/* Metadata */}
						{widgetState.metadata && (
							<div className="snbex:space-y-1">
								<span className="snbex:font-medium snbex:text-white">
									Metadata:
								</span>
								<div className="snbex:ml-2 snbex:space-y-1">
									{widgetState.metadata.title && (
										<div className="snbex:flex snbex:items-center snbex:gap-2">
											<span className="snbex:text-white/70">Title:</span>
											<span className="snbex:font-mono snbex:text-xs snbex:text-white/80 snbex:bg-white/10 snbex:px-2 snbex:py-1 snbex:rounded snbex:truncate">
												{widgetState.metadata.title}
											</span>
										</div>
									)}
									{widgetState.metadata.duration && (
										<div className="snbex:flex snbex:items-center snbex:gap-2">
											<span className="snbex:text-white/70">Duration:</span>
											<span className="snbex:font-mono snbex:text-xs snbex:text-white/80 snbex:bg-white/10 snbex:px-2 snbex:py-1 snbex:rounded">
												{Math.floor(widgetState.metadata.duration / 60)}m{' '}
												{widgetState.metadata.duration % 60}s
											</span>
										</div>
									)}
									{typeof widgetState.metadata.language === 'string' &&
										widgetState.metadata.language && (
											<div className="snbex:flex snbex:items-center snbex:gap-2">
												<span className="snbex:text-white/70">
													Content Lang:
												</span>
												<span className="snbex:font-mono snbex:text-xs snbex:text-white/80 snbex:bg-white/10 snbex:px-2 snbex:py-1 snbex:rounded">
													{widgetState.metadata.language}
												</span>
											</div>
										)}
									{typeof widgetState.metadata.url === 'string' &&
										widgetState.metadata.url && (
											<div className="snbex:flex snbex:items-center snbex:gap-2">
												<span className="snbex:text-white/70">URL:</span>
												<span className="snbex:font-mono snbex:text-xs snbex:text-white/80 snbex:bg-white/10 snbex:px-2 snbex:py-1 snbex:rounded snbex:truncate">
													{widgetState.metadata.url}
												</span>
											</div>
										)}
									{typeof widgetState.metadata.videoId === 'string' &&
										widgetState.metadata.videoId && (
											<div className="snbex:flex snbex:items-center snbex:gap-2">
												<span className="snbex:text-white/70">Video ID:</span>
												<span className="snbex:font-mono snbex:text-xs snbex:text-white/80 snbex:bg-white/10 snbex:px-2 snbex:py-1 snbex:rounded">
													{widgetState.metadata.videoId}
												</span>
											</div>
										)}
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
