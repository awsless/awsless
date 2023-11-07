const WEEK_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const padTime = (time: number) => {
	return time < 10 ? '0' + time : time
}

export const createTimestamp = () => {
	const now = new Date()
	const weekDay = WEEK_NAMES[now.getUTCDay()]
	const month = MONTH_NAMES[now.getUTCMonth()]
	const day = now.getUTCDate()
	const hours = padTime(now.getUTCHours())
	const minutes = padTime(now.getUTCMinutes())
	const seconds = padTime(now.getUTCSeconds())
	const year = now.getUTCFullYear()
	const dateNow = `${weekDay} ${month} ${day} ${hours}:${minutes}:${seconds} UTC ${year}` // ddd MMM D HH:mm:ss UTC YYYY
	return dateNow
}
