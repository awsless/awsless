type AnyFunction = (...args: any[]) => any;
export interface TestMockFunction<F extends AnyFunction = AnyFunction> {
    (...args: Parameters<F>): ReturnType<F>;
    readonly mock: {
        readonly calls: Parameters<F>[];
        readonly results: {
            type: 'return' | 'throw' | 'incomplete';
            value: any;
        }[];
        readonly invocationCallOrder: number[];
        readonly lastCall: Parameters<F> | undefined;
    };
    getMockName(): string;
    mockName(name: string): this;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): void;
    mockImplementation(fn: F): this;
    mockImplementationOnce(fn: F): this;
    mockReturnValue(value: ReturnType<F>): this;
    mockReturnValueOnce(value: ReturnType<F>): this;
    mockResolvedValue(value: Awaited<ReturnType<F>>): this;
    mockResolvedValueOnce(value: Awaited<ReturnType<F>>): this;
    mockRejectedValue(error: unknown): this;
    mockRejectedValueOnce(error: unknown): this;
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
