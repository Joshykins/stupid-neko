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
} from "convex/server";
import type * as auth from "../auth.js";
import type * as contentActivities from "../contentActivities.js";
import type * as contentLabeling from "../contentLabeling.js";
import type * as contentLabels from "../contentLabels.js";
import type * as contentYoutubeLabeling from "../contentYoutubeLabeling.js";
import type * as crons from "../crons.js";
import type * as devOnlyFunctions from "../devOnlyFunctions.js";
import type * as experienceFunctions from "../experienceFunctions.js";
import type * as extensionFunctions from "../extensionFunctions.js";
import type * as http from "../http.js";
import type * as integrationsKeyFunctions from "../integrationsKeyFunctions.js";
import type * as languageActivitiyFromContentActivitiesFunctions from "../languageActivitiyFromContentActivitiesFunctions.js";
import type * as languageActivityFunctions from "../languageActivityFunctions.js";
import type * as meFunctions from "../meFunctions.js";
import type * as onboardingFunctions from "../onboardingFunctions.js";
import type * as streakFunctions from "../streakFunctions.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

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
  contentActivities: typeof contentActivities;
  contentLabeling: typeof contentLabeling;
  contentLabels: typeof contentLabels;
  contentYoutubeLabeling: typeof contentYoutubeLabeling;
  crons: typeof crons;
  devOnlyFunctions: typeof devOnlyFunctions;
  experienceFunctions: typeof experienceFunctions;
  extensionFunctions: typeof extensionFunctions;
  http: typeof http;
  integrationsKeyFunctions: typeof integrationsKeyFunctions;
  languageActivitiyFromContentActivitiesFunctions: typeof languageActivitiyFromContentActivitiesFunctions;
  languageActivityFunctions: typeof languageActivityFunctions;
  meFunctions: typeof meFunctions;
  onboardingFunctions: typeof onboardingFunctions;
  streakFunctions: typeof streakFunctions;
  users: typeof users;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
