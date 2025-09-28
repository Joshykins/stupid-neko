/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
	ApiFromModules,
	FilterApi,
	FunctionReference,
} from 'convex/server';
import type * as auth from '../auth.js';
import type * as browserExtensionFunctions from '../browserExtensionFunctions.js';
import type * as contentActivityFunctions from '../contentActivityFunctions.js';
import type * as contentLabelActions from '../contentLabelActions.js';
import type * as contentLabelFunctions from '../contentLabelFunctions.js';
import type * as contentLabelYouTubeActions from '../contentLabelYouTubeActions.js';
import type * as crons from '../crons.js';
import type * as devOnlyFunctions from '../devOnlyFunctions.js';
import type * as http from '../http.js';
import type * as integrationKeyFunctions from '../integrationKeyFunctions.js';
import type * as onboardingFunctions from '../onboardingFunctions.js';
import type * as preReleaseCodeFunctions from '../preReleaseCodeFunctions.js';
import type * as spotifyActions from '../spotifyActions.js';
import type * as spotifyFunctions from '../spotifyFunctions.js';
import type * as userFunctions from '../userFunctions.js';
import type * as userStreakFunctions from '../userStreakFunctions.js';
import type * as userTargetLanguageActivitiesFromContentActivitiesFunctions from '../userTargetLanguageActivitiesFromContentActivitiesFunctions.js';
import type * as userTargetLanguageActivityFunctions from '../userTargetLanguageActivityFunctions.js';
import type * as userTargetLanguageExperienceFunctions from '../userTargetLanguageExperienceFunctions.js';
import type * as userTargetLanguageFavoriteActivityFunctions from '../userTargetLanguageFavoriteActivityFunctions.js';
import type * as userXPChartFunctions from '../userXPChartFunctions.js';
import type * as utils from '../utils.js';

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
	auth: typeof auth;
	browserExtensionFunctions: typeof browserExtensionFunctions;
	contentActivityFunctions: typeof contentActivityFunctions;
	contentLabelActions: typeof contentLabelActions;
	contentLabelFunctions: typeof contentLabelFunctions;
	contentLabelYouTubeActions: typeof contentLabelYouTubeActions;
	crons: typeof crons;
	devOnlyFunctions: typeof devOnlyFunctions;
	http: typeof http;
	integrationKeyFunctions: typeof integrationKeyFunctions;
	onboardingFunctions: typeof onboardingFunctions;
	preReleaseCodeFunctions: typeof preReleaseCodeFunctions;
	spotifyActions: typeof spotifyActions;
	spotifyFunctions: typeof spotifyFunctions;
	userFunctions: typeof userFunctions;
	userStreakFunctions: typeof userStreakFunctions;
	userTargetLanguageActivitiesFromContentActivitiesFunctions: typeof userTargetLanguageActivitiesFromContentActivitiesFunctions;
	userTargetLanguageActivityFunctions: typeof userTargetLanguageActivityFunctions;
	userTargetLanguageExperienceFunctions: typeof userTargetLanguageExperienceFunctions;
	userTargetLanguageFavoriteActivityFunctions: typeof userTargetLanguageFavoriteActivityFunctions;
	userXPChartFunctions: typeof userXPChartFunctions;
	utils: typeof utils;
}>;
export declare const api: FilterApi<
	typeof fullApi,
	FunctionReference<any, 'public'>
>;
export declare const internal: FilterApi<
	typeof fullApi,
	FunctionReference<any, 'internal'>
>;
