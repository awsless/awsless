
# app ----------------------------
name app-name
region eu-west-1

domain example.com {

}

defaults {
	function {
		memory
	}
}

services {
	./services/name.tf
}


# stack ----------------------------
name stack-name

func get {
	file ./file.ts
}

table posts {
	hash userId
	sort id
}

cache stats {

}

queue posts {
	func -> get
}

cron 1 minute {
	func -> get
}

domain example.com {
	http {
		GET {
			/posts/:id { func -> get }
			/posts { func -> list  }
			/live/bets { task -> live-bets list }
		}
	}

	upload ./file {

	}
}

domain api.example.com {
	graphql ./schema.gql {
		Query {
			get { func -> get }
		}

		Mutation {

		}
	}
}

container live-bet {
	file ./docker-file
	memory 1 GB
	tasks {
		list
	}
}

# resource lol {

# }
