import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { addExtensionRoutes } from "./extensionHTTP";

const http = httpRouter();


auth.addHttpRoutes(http);
addExtensionRoutes(http);


export default http;


