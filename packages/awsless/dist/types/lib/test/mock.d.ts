import type { Mock } from 'vitest';
export interface TestMock {
    readonly email: {
        /** Every email sent through Email.send, recorded for assertions & overridable like any mock. */
        readonly send: Mock<(email: {
            from?: string;
            to?: string[];
            subject?: string;
            html?: string;
        }) => unknown>;
    };
}
export declare const mock: TestMock;
