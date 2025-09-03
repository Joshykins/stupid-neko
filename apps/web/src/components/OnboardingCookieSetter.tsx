"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function OnboardingCookieSetter() {
    const needsOnboarding = useQuery(api.onboardingFunctions.needsOnboarding, {});

    useEffect(() => {
        if (needsOnboarding === false) {
            // User has completed onboarding, set cookie for middleware
            document.cookie = `onboarding=false; path=/; max-age=${60 * 60 * 24 * 365}`; // 365 days
        } else if (needsOnboarding === true) {
            // User needs onboarding, set cookie for middleware
            document.cookie = `onboarding=true; path=/; max-age=${60 * 60 * 24 * 365}`; // 365 days
        }
    }, [needsOnboarding]);

    return null;
}
