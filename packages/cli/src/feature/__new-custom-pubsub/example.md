APP: {
	pubsub: {
		casino: {
			"auth": "./auth.ts"
		}
	}
}

STACK: {
	pubsub: {
		casino: {
			connected: "./"
			disconnected: "./"
			subscribed: "./"
			unsubscribed: "./"
		}
	}
}

publish

path -> router -> load-balancer -> fargate

/ws
