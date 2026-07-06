export const filterPattern = `{${[
	`$.level = "WARN"`,
	`$.level = "ERROR"`,
	`$.level = "FATAL"`,
	`($.type = "platform.report" && $.record.status = "timeout")`,
	`($.type = "platform.report" && $.record.status = "error")`,
	`($.type = "platform.report" && $.record.status = "failure")`,
].join(' || ')}}`
