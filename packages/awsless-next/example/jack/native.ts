import { hash } from '@node-rs/bcrypt'

export default async () => {
	return hash('pass', 1)
}
