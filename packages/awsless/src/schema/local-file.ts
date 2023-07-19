import { access, constants } from "fs/promises";
import { z } from "zod";

export const LocalFileSchema = z.string().refine(async (path) => {
	// check if the file exists on disk...
	try {
		await access(path, constants.R_OK)
	} catch(error) {
		return false
	}

	return true
}, `File doesn't exist`)
