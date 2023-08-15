import { z } from "zod";

export const RetryAttempts = z.number().int().min(0).max(2)
