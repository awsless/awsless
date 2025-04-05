import { UUID } from "node:crypto";
import { v5 } from "uuid";
import { URN } from "../resource.ts";
import { ResourceOperation } from "./operation.ts";

export const createIdempotantToken = (
  appToken: UUID,
  urn: URN,
  operation: ResourceOperation
) => {
  return v5(`${urn}-${operation}`, appToken);
};
