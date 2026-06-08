import { createAuthClient } from "better-auth/react";

  baseURL: import.meta.env.PROD 
    ? "https://calico-petshop-backend.vercel.app" 
    : "http://localhost:3001",
});
