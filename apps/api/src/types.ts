import type { ApiUser } from "@policy-brain/shared";

export type AppEnv = {
  Variables: {
    correlationId: string;
    user?: ApiUser;
    sessionToken?: string;
  };
};
