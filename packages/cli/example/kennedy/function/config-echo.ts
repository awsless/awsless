import { Config } from 'awsless'

export default async () => {
	return { secret: Config.secret }
}
