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

    // Handle sign-in page redirects
    if (isSignInPage(request) && isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/product");
    }

    // Handle protected routes
    if (isProtectedRoute(request) && !isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/sign-in");
    }

    // For authenticated users, check onboarding status from cookie
    let needsOnboarding = true;
    if (isAuthenticated) {
      const cookies = request.headers.get("cookie");
      const onboardingCookie = cookies?.split(";").find(c => c.trim().startsWith("onboarding="));
      
      if (onboardingCookie) {
        const status = onboardingCookie.split("=")[1];
        needsOnboarding = status === "true";
      }
      // If no cookie exists, assume onboarding is needed (will be set by client component)
    }

    // Handle get-started page
    if (isGetStartedPage(request)) {
      if (!isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/");
      }
      
      if (needsOnboarding === false) {
        return nextjsMiddlewareRedirect(request, "/dashboard");
      }
    }

    // Handle root page redirects for authenticated users
    if (isRootPage(request) && isAuthenticated) {
      if (needsOnboarding === true) {
        return nextjsMiddlewareRedirect(request, "/get-started");
      } else {
        return nextjsMiddlewareRedirect(request, "/dashboard");
      }
    }

    // Handle protected routes that require completed onboarding
    if (isProtectedRoute(request) && isAuthenticated && needsOnboarding === true) {
      return nextjsMiddlewareRedirect(request, "/get-started");
    }
  });
   
  export const config = {
    // The following matcher runs middleware on all routes
    // except static assets.
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
  };