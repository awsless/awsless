import { z } from "zod";

export const DomainNameSchema = z.string().regex(/[a-z\-\_\.]/g, 'Invalid domain name')
