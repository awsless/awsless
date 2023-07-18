
import { z } from "zod";

export const ResourceIdSchema = z.string().min(3).max(24).regex(/[a-z\-]+/, 'Invalid resource ID')
