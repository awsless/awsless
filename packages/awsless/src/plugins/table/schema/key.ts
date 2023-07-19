import { z } from "zod"

export const KeySchema = z.string().min(1).max(255)
