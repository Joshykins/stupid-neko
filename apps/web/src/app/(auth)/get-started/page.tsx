import { redirect } from "next/navigation";
import { isAuthenticatedNextjs, convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import GetStartedClient from "./GetStartedClient";

export default async function GetStartedPage() {
    const isAuthenticated = await isAuthenticatedNextjs();
    if (!isAuthenticated) {
        redirect("/");
    }

    const token = await convexAuthNextjsToken();
    const needsOnboarding = await fetchQuery(api.myFunctions.needsOnboarding, {}, { token });
    console.log("needsOnboarding", needsOnboarding);
    if (needsOnboarding === false) {
        redirect("/dashboard");
    }

    return <GetStartedClient />;
}
