export declare const MCP_DESCRIBE_PROPERTY = "$awsless-mcp-describe";
export type ToolContract = {
    inputSchema: Record<string, unknown>;
};
export declare const isMcpDescribeRequest: (payload: unknown) => payload is object & Record<"$awsless-mcp-describe", unknown>;
export declare const describeHandle: (handle: unknown) => ToolContract;
