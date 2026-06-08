import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PROD 
    ? "https://calico-petshop-backend.vercel.app" 
    : "http://localhost:3001",
});
