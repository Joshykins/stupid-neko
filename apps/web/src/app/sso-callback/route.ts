import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // Clerk completes OAuth on the client; just send users to the homepage.
    // If you need server-side checks later, extend this handler.
    return NextResponse.redirect(new URL("/", request.url));
}


