import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    nextjsMiddlewareRedirect,
  } from "@convex-dev/auth/nextjs/server";
   
  const isSignInPage = createRouteMatcher(["/sign-in"]);
  const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/account(.*)"]);
  const isGetStartedPage = createRouteMatcher(["/get-started(.*)"]);
  const isRootPage = createRouteMatcher(["/"]);
   
  export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    const isAuthenticated = await convexAuth.isAuthenticated();
    const url = new URL(request.url);
    const pathname = url.pathname;
    const oauthError = url.searchParams.get("oauthError");

    // Handle sign-in page redirects
    if (isSignInPage(request) && isAuthenticated) {
      // Allow visiting sign-in while authenticated if we need to show an OAuth error
      if (!oauthError) {
        return nextjsMiddlewareRedirect(request, "/dashboard");
      }
    }

    // Handle protected routes
    if (isProtectedRoute(request) && !isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/");
    }

    // Handle get-started page
    if (isGetStartedPage(request) && !isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/");
    }

    // Redirect root to dashboard if authenticated
    if (isRootPage(request) && isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }

    // Otherwise, let server components handle onboarding redirects.
  });
   
  export const config = {
    // The following matcher runs middleware on all routes
    // except static assets.
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
  };