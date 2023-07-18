import { z } from "zod";

export const LocalFileSchema = z.string().refine(async () => {
	// check if the file exists on disk...
	return true
}, `File doesn't exist`)
