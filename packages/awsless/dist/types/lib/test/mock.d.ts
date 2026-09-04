type AnyFunction = (...args: any[]) => any;
type MockResult<R> = {
    type: 'return';
    value: R;
} | {
    type: 'throw';
    value: any;
} | {
    type: 'incomplete';
    value: undefined;
};
type MockSettledResult<R> = {
    type: 'fulfilled';
    value: R;
} | {
    type: 'rejected';
    value: any;
} | {
    type: 'incomplete';
    value: undefined;
};
export interface TestMockFunction<F extends AnyFunction = AnyFunction> {
    (...args: Parameters<F>): ReturnType<F>;
    mock: {
        calls: Parameters<F>[];
        instances: ThisParameterType<F>[];
        contexts: ThisParameterType<F>[];
        invocationCallOrder: number[];
        results: MockResult<ReturnType<F>>[];
        settledResults: MockSettledResult<Awaited<ReturnType<F>>>[];
        lastCall: Parameters<F> | undefined;
    };
    getMockName(): string;
    mockName(name: string): this;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): void;
    getMockImplementation(): F | undefined;
    mockImplementation(fn: F): this;
    mockImplementationOnce(fn: F): this;
    withImplementation(fn: F, cb: () => Promise<unknown>): Promise<this>;
    withImplementation(fn: F, cb: () => unknown): this;
    mockReturnThis(): this;
    mockReturnValue(value: ReturnType<F>): this;
    mockReturnValueOnce(value: ReturnType<F>): this;
    mockThrow(value: unknown): this;
    mockThrowOnce(value: unknown): this;
    mockResolvedValue(value: Awaited<ReturnType<F>>): this;
    mockResolvedValueOnce(value: Awaited<ReturnType<F>>): this;
    mockRejectedValue(error: unknown): this;
    mockRejectedValueOnce(error: unknown): this;
    [Symbol.dispose](): void;
}
export interface TestMock {
    readonly email: {
        /** Every email sent through Email.send, recorded for assertions & overridable like any mock. */
        readonly send: TestMockFunction<(email: {
            from?: string;
            to?: string[];
            subject?: string;
            html?: string;
        }) => unknown>;
    };
}
export declare const mock: TestMock;
export {};
