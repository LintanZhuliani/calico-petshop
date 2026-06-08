import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PROD 
    ? window.location.origin
    : "http://localhost:3001",
});
