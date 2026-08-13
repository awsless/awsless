export type SendEmailProps = {
    /** The verified sender address. */
    from: string;
    /** The recipient addresses. */
    to: string[];
    /** The subject line. */
    subject: string;
    /** The html body. */
    html: string;
};
export declare const Email: {
    send(props: SendEmailProps): Promise<void>;
};
