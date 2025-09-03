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
import type * as experienceFunctions from "../experienceFunctions.js";
import type * as http from "../http.js";
import type * as languageActivityFunctions from "../languageActivityFunctions.js";
import type * as meFunctions from "../meFunctions.js";
import type * as onboardingFunctions from "../onboardingFunctions.js";
import type * as streakFunctions from "../streakFunctions.js";

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
  experienceFunctions: typeof experienceFunctions;
  http: typeof http;
  languageActivityFunctions: typeof languageActivityFunctions;
  meFunctions: typeof meFunctions;
  onboardingFunctions: typeof onboardingFunctions;
  streakFunctions: typeof streakFunctions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
