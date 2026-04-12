import { Handler, lambda, Loggers } from '@awsless/lambda'
import { BaseSchema } from '@awsless/validate'

export type CronProps<H extends Handler<S>, S extends BaseSchema> = {
	handle: H
	schema?: S
	logger?: Loggers
}

export const cron = <H extends Handler<S>, S extends BaseSchema>(props: CronProps<H, S>) => {
	return lambda({
		...props,
		logViewableErrors: true,
	})
}
