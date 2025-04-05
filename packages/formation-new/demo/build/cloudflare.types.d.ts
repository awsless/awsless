import { Input, Output, ResourceClass } from './base.ts'

type CloudflareWorkersDeploymentProps = {

	/** Identifier */
	account_id: Input<string>
	annotations?: Input<{

		/** Human-readable message about the deployment. Truncated to 100 bytes. */
		workers_message?: Input<string | undefined>
	} | undefined>

	/** Name of the script. */
	script_name: Input<string>

	/** Available values: "percentage". */
	strategy: Input<string>
	versions: Input<{
		percentage: Input<number>
		version_id: Input<string>
	}>
}

type CloudflareWorkersDeployment = Readonly<{

	/** Identifier */
	account_id: Output<string>
	annotations: Output<Readonly<{

		/** Human-readable message about the deployment. Truncated to 100 bytes. */
		workers_message: string
	}>>
	author_email: Output<string>
	created_on: Output<string>
	deployments: Output<Readonly<{
		annotations: Readonly<{

			/** Human-readable message about the deployment. Truncated to 100 bytes. */
			workers_message: string
		}>
		author_email: string
		created_on: string
		id: string
		source: string

		/** Available values: "percentage". */
		strategy: string
		versions: Readonly<{
			percentage: number
			version_id: string
		}>
	}>>
	id: Output<string>

	/** Name of the script. */
	script_name: Output<string>
	source: Output<string>

	/** Available values: "percentage". */
	strategy: Output<string>
	versions: Output<Readonly<{
		percentage: number
		version_id: string
	}>>
}>

type CloudflareZoneSettingProps = {

	/** ID of the zone setting.
Available values: "0rtt". */
	id?: Input<string | undefined>

	/** Setting name */
	setting_id: Input<string>

	/** Current value of the zone setting. */
	value: Input<unknown>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareZoneSetting = Readonly<{

	/** Whether or not this setting can be modified for this zone (based on your Cloudflare plan level). */
	editable: Output<boolean>

	/** ID of the zone setting.
Available values: "0rtt". */
	id: Output<string | undefined>

	/** last time this setting was modified. */
	modified_on: Output<string>

	/** Setting name */
	setting_id: Output<string>

	/** Value of the zone setting.
Notes: The interval (in seconds) from when development mode expires (positive integer) or last expired (negative integer) for the domain. If development mode has never been enabled, this value is false. */
	time_remaining: Output<number>

	/** Current value of the zone setting. */
	value: Output<unknown>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustAccessCustomPageProps = {

	/** Identifier */
	account_id: Input<string>

	/** Number of apps the custom page is assigned to. */
	app_count?: Input<number | undefined>

	/** Custom page HTML. */
	custom_html: Input<string>

	/** Custom page name. */
	name: Input<string>

	/** Custom page type.
Available values: "identity_denied", "forbidden". */
	type: Input<string>
}

type CloudflareZeroTrustAccessCustomPage = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Number of apps the custom page is assigned to. */
	app_count: Output<number | undefined>
	created_at: Output<string>

	/** Custom page HTML. */
	custom_html: Output<string>

	/** UUID */
	id: Output<string>

	/** Custom page name. */
	name: Output<string>

	/** Custom page type.
Available values: "identity_denied", "forbidden". */
	type: Output<string>

	/** UUID */
	uid: Output<string>
	updated_at: Output<string>
}>

type CloudflareApiShieldOperationProps = {

	/** The endpoint which can contain path parameter templates in curly braces, each will be replaced from left to right with {varN}, starting with {var1}, during insertion. This will further be Cloudflare-normalized upon insertion. See: https://developers.cloudflare.com/rules/normalization/how-it-works/. */
	endpoint: Input<string>

	/** RFC3986-compliant host. */
	host: Input<string>

	/** The HTTP method used to access the endpoint.
Available values: "GET", "POST", "HEAD", "OPTIONS", "PUT", "DELETE", "CONNECT", "PATCH", "TRACE". */
	method: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareApiShieldOperation = Readonly<{

	/** The endpoint which can contain path parameter templates in curly braces, each will be replaced from left to right with {varN}, starting with {var1}, during insertion. This will further be Cloudflare-normalized upon insertion. See: https://developers.cloudflare.com/rules/normalization/how-it-works/. */
	endpoint: Output<string>
	features: Output<Readonly<{
		api_routing: Readonly<{
			last_updated: string

			/** Target route. */
			route: string
		}>
		confidence_intervals: Readonly<{
			last_updated: string
			suggested_threshold: Readonly<{
				confidence_intervals: Readonly<{
					p90: Readonly<{

						/** Lower bound for percentile estimate */
						lower: number

						/** Upper bound for percentile estimate */
						upper: number
					}>
					p95: Readonly<{

						/** Lower bound for percentile estimate */
						lower: number

						/** Upper bound for percentile estimate */
						upper: number
					}>
					p99: Readonly<{

						/** Lower bound for percentile estimate */
						lower: number

						/** Upper bound for percentile estimate */
						upper: number
					}>
				}>

				/** Suggested threshold. */
				mean: number
			}>
		}>
		parameter_schemas: Readonly<{
			last_updated: string
			parameter_schemas: Readonly<{

				/** An array containing the learned parameter schemas. */
				parameters: ReadonlyArray<string>

				/** An empty response object. This field is required to yield a valid operation schema. */
				responses: string
			}>
		}>
		schema_info: Readonly<{
			active_schema: Readonly<{
				created_at: string

				/** UUID */
				id: string

				/** True if schema is Cloudflare-provided. */
				is_learned: boolean

				/** Schema file name. */
				name: string
			}>

			/** True if a Cloudflare-provided learned schema is available for this endpoint. */
			learned_available: boolean

			/** Action taken on requests failing validation.
Available values: "none", "log", "block". */
			mitigation_action: string
		}>
		thresholds: Readonly<{

			/** The total number of auth-ids seen across this calculation. */
			auth_id_tokens: number

			/** The number of data points used for the threshold suggestion calculation. */
			data_points: number
			last_updated: string

			/** The p50 quantile of requests (in period_seconds). */
			p50: number

			/** The p90 quantile of requests (in period_seconds). */
			p90: number

			/** The p99 quantile of requests (in period_seconds). */
			p99: number

			/** The period over which this threshold is suggested. */
			period_seconds: number

			/** The estimated number of requests covered by these calculations. */
			requests: number

			/** The suggested threshold in requests done by the same auth_id or period_seconds. */
			suggested_threshold: number
		}>
	}>>

	/** RFC3986-compliant host. */
	host: Output<string>

	/** UUID */
	id: Output<string>
	last_updated: Output<string>

	/** The HTTP method used to access the endpoint.
Available values: "GET", "POST", "HEAD", "OPTIONS", "PUT", "DELETE", "CONNECT", "PATCH", "TRACE". */
	method: Output<string>

	/** UUID */
	operation_id: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareApiShieldSchemaValidationSettingsProps = {

	/** The default mitigation action used when there is no mitigation action defined on the operation

Mitigation actions are as follows:

  * `log` - log request when request does not conform to schema
  * `block` - deny access to the site when request does not conform to schema

A special value of of `none` will skip running schema validation entirely for the request when there is no mitigation action defined on the operation
Available values: "none", "log", "block". */
	validation_default_mitigation_action: Input<string>

	/** When set, this overrides both zone level and operation level mitigation actions.

  - `none` will skip running schema validation entirely for the request
  - `null` indicates that no override is in place

To clear any override, use the special value `disable_override` or `null`
Available values: "none", "disable_override". */
	validation_override_mitigation_action?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareApiShieldSchemaValidationSettings = Readonly<{

	/** Identifier */
	id: Output<string>

	/** The default mitigation action used when there is no mitigation action defined on the operation

Mitigation actions are as follows:

  * `log` - log request when request does not conform to schema
  * `block` - deny access to the site when request does not conform to schema

A special value of of `none` will skip running schema validation entirely for the request when there is no mitigation action defined on the operation
Available values: "none", "log", "block". */
	validation_default_mitigation_action: Output<string>

	/** When set, this overrides both zone level and operation level mitigation actions.

  - `none` will skip running schema validation entirely for the request
  - `null` indicates that no override is in place

To clear any override, use the special value `disable_override` or `null`
Available values: "none", "disable_override". */
	validation_override_mitigation_action: Output<string | undefined>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareWaitingRoomSettingsProps = {

	/** Whether to allow verified search engine crawlers to bypass all waiting rooms on this zone.
Verified search engine crawlers will not be tracked or counted by the waiting room system,
and will not appear in waiting room analytics. */
	search_engine_crawler_bypass?: Input<boolean | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareWaitingRoomSettings = Readonly<{

	/** Identifier */
	id: Output<string>

	/** Whether to allow verified search engine crawlers to bypass all waiting rooms on this zone.
Verified search engine crawlers will not be tracked or counted by the waiting room system,
and will not appear in waiting room analytics. */
	search_engine_crawler_bypass: Output<boolean>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustDeviceCustomProfileProps = {
	account_id: Input<string>

	/** Whether to allow the user to switch WARP between modes. */
	allow_mode_switch?: Input<boolean | undefined>

	/** Whether to receive update notifications when a new version of the client is available. */
	allow_updates?: Input<boolean | undefined>

	/** Whether to allow devices to leave the organization. */
	allowed_to_leave?: Input<boolean | undefined>

	/** The amount of time in seconds to reconnect after having been disabled. */
	auto_connect?: Input<number | undefined>

	/** Turn on the captive portal after the specified amount of time. */
	captive_portal?: Input<number | undefined>

	/** A description of the policy. */
	description?: Input<string | undefined>

	/** If the `dns_server` field of a fallback domain is not present, the client will fall back to a best guess of the default/system DNS resolvers unless this policy option is set to `true`. */
	disable_auto_fallback?: Input<boolean | undefined>

	/** Whether the policy will be applied to matching devices. */
	enabled?: Input<boolean | undefined>
	exclude?: Input<{

		/** The address in CIDR format to exclude from the tunnel. If `address` is present, `host` must not be present. */
		address: Input<string>

		/** A description of the Split Tunnel item, displayed in the client UI. */
		description: Input<string>

		/** The domain name to exclude from the tunnel. If `host` is present, `address` must not be present. */
		host?: Input<string | undefined>
	} | undefined>

	/** Whether to add Microsoft IPs to Split Tunnel exclusions. */
	exclude_office_ips?: Input<boolean | undefined>
	include?: Input<{

		/** The address in CIDR format to exclude from the tunnel. If `address` is present, `host` must not be present. */
		address: Input<string>

		/** A description of the Split Tunnel item, displayed in the client UI. */
		description: Input<string>

		/** The domain name to exclude from the tunnel. If `host` is present, `address` must not be present. */
		host?: Input<string | undefined>
	} | undefined>

	/** The amount of time in minutes a user is allowed access to their LAN. A value of 0 will allow LAN access until the next WARP reconnection, such as a reboot or a laptop waking from sleep. Note that this field is omitted from the response if null or unset. */
	lan_allow_minutes?: Input<number | undefined>

	/** The size of the subnet for the local access network. Note that this field is omitted from the response if null or unset. */
	lan_allow_subnet_size?: Input<number | undefined>

	/** The wirefilter expression to match devices. */
	match: Input<string>

	/** The name of the device settings profile. */
	name: Input<string>

	/** The precedence of the policy. Lower values indicate higher precedence. Policies will be evaluated in ascending order of this field. */
	precedence: Input<number>

	/** Determines if the operating system will register WARP's local interface IP with your on-premises DNS server. */
	register_interface_ip_with_dns?: Input<boolean | undefined>
	service_mode_v2?: Input<{

		/** The mode to run the WARP client under. */
		mode?: Input<string | undefined>

		/** The port number when used with proxy mode. */
		port?: Input<number | undefined>
	} | undefined>

	/** The URL to launch when the Send Feedback button is clicked. */
	support_url?: Input<string | undefined>

	/** Whether to allow the user to turn off the WARP switch and disconnect the client. */
	switch_locked?: Input<boolean | undefined>

	/** Determines which tunnel protocol to use. */
	tunnel_protocol?: Input<string | undefined>
}

type CloudflareZeroTrustDeviceCustomProfile = Readonly<{
	account_id: Output<string>

	/** Whether to allow the user to switch WARP between modes. */
	allow_mode_switch: Output<boolean | undefined>

	/** Whether to receive update notifications when a new version of the client is available. */
	allow_updates: Output<boolean | undefined>

	/** Whether to allow devices to leave the organization. */
	allowed_to_leave: Output<boolean | undefined>

	/** The amount of time in seconds to reconnect after having been disabled. */
	auto_connect: Output<number | undefined>

	/** Turn on the captive portal after the specified amount of time. */
	captive_portal: Output<number | undefined>

	/** Whether the policy is the default policy for an account. */
	default: Output<boolean>

	/** A description of the policy. */
	description: Output<string | undefined>

	/** If the `dns_server` field of a fallback domain is not present, the client will fall back to a best guess of the default/system DNS resolvers unless this policy option is set to `true`. */
	disable_auto_fallback: Output<boolean | undefined>

	/** Whether the policy will be applied to matching devices. */
	enabled: Output<boolean | undefined>
	exclude: Output<Readonly<{

		/** The address in CIDR format to exclude from the tunnel. If `address` is present, `host` must not be present. */
		address: string

		/** A description of the Split Tunnel item, displayed in the client UI. */
		description: string

		/** The domain name to exclude from the tunnel. If `host` is present, `address` must not be present. */
		host: string
	}>>

	/** Whether to add Microsoft IPs to Split Tunnel exclusions. */
	exclude_office_ips: Output<boolean | undefined>
	fallback_domains: Output<Readonly<{

		/** A description of the fallback domain, displayed in the client UI. */
		description: string

		/** A list of IP addresses to handle domain resolution. */
		dns_server: ReadonlyArray<string>

		/** The domain suffix to match when resolving locally. */
		suffix: string
	}>>
	gateway_unique_id: Output<string>

	/** Device ID. */
	id: Output<string>
	include: Output<Readonly<{

		/** The address in CIDR format to exclude from the tunnel. If `address` is present, `host` must not be present. */
		address: string

		/** A description of the Split Tunnel item, displayed in the client UI. */
		description: string

		/** The domain name to exclude from the tunnel. If `host` is present, `address` must not be present. */
		host: string
	}>>

	/** The amount of time in minutes a user is allowed access to their LAN. A value of 0 will allow LAN access until the next WARP reconnection, such as a reboot or a laptop waking from sleep. Note that this field is omitted from the response if null or unset. */
	lan_allow_minutes: Output<number | undefined>

	/** The size of the subnet for the local access network. Note that this field is omitted from the response if null or unset. */
	lan_allow_subnet_size: Output<number | undefined>

	/** The wirefilter expression to match devices. */
	match: Output<string>

	/** The name of the device settings profile. */
	name: Output<string>

	/** Device ID. */
	policy_id: Output<string>

	/** The precedence of the policy. Lower values indicate higher precedence. Policies will be evaluated in ascending order of this field. */
	precedence: Output<number>

	/** Determines if the operating system will register WARP's local interface IP with your on-premises DNS server. */
	register_interface_ip_with_dns: Output<boolean | undefined>
	service_mode_v2: Output<Readonly<{

		/** The mode to run the WARP client under. */
		mode: string

		/** The port number when used with proxy mode. */
		port: number
	}>>

	/** The URL to launch when the Send Feedback button is clicked. */
	support_url: Output<string | undefined>

	/** Whether to allow the user to turn off the WARP switch and disconnect the client. */
	switch_locked: Output<boolean | undefined>
	target_tests: Output<Readonly<{

		/** The id of the DEX test targeting this policy */
		id: string

		/** The name of the DEX test targeting this policy */
		name: string
	}>>

	/** Determines which tunnel protocol to use. */
	tunnel_protocol: Output<string | undefined>
}>

type CloudflareEmailRoutingSettingsProps = {

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareEmailRoutingSettings = Readonly<{

	/** The date and time the settings have been created. */
	created: Output<string>

	/** State of the zone settings for Email Routing. */
	enabled: Output<boolean>

	/** Email Routing settings identifier. */
	id: Output<string>

	/** The date and time the settings have been modified. */
	modified: Output<string>

	/** Domain of your zone. */
	name: Output<string>

	/** Flag to check if the user skipped the configuration wizard. */
	skip_wizard: Output<boolean>

	/** Show the state of your account, and the type or configuration error.
Available values: "ready", "unconfigured", "misconfigured", "misconfigured/locked", "unlocked". */
	status: Output<string>

	/** Email Routing settings tag. (Deprecated, replaced by Email Routing settings identifier) */
	tag: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareNotificationPolicyWebhooksProps = {

	/** The account id */
	account_id: Input<string>

	/** The name of the webhook destination. This will be included in the request body when you receive a webhook notification. */
	name: Input<string>

	/** Optional secret that will be passed in the `cf-webhook-auth` header when dispatching generic webhook notifications or formatted for supported destinations. Secrets are not returned in any API response body. */
	secret?: Input<string | undefined>

	/** The POST endpoint to call when dispatching a notification. */
	url: Input<string>
}

type CloudflareNotificationPolicyWebhooks = Readonly<{

	/** The account id */
	account_id: Output<string>

	/** Timestamp of when the webhook destination was created. */
	created_at: Output<string>

	/** UUID */
	id: Output<string>

	/** Timestamp of the last time an attempt to dispatch a notification to this webhook failed. */
	last_failure: Output<string>

	/** Timestamp of the last time Cloudflare was able to successfully dispatch a notification using this webhook. */
	last_success: Output<string>

	/** The name of the webhook destination. This will be included in the request body when you receive a webhook notification. */
	name: Output<string>

	/** Optional secret that will be passed in the `cf-webhook-auth` header when dispatching generic webhook notifications or formatted for supported destinations. Secrets are not returned in any API response body. */
	secret: Output<string | undefined>

	/** Type of webhook endpoint.
Available values: "slack", "generic", "gchat". */
	type: Output<string>

	/** The POST endpoint to call when dispatching a notification. */
	url: Output<string>
}>

type CloudflareQueueProps = {

	/** A Resource identifier. */
	account_id: Input<string>
	queue_name: Input<string>
	settings?: Input<{

		/** Number of seconds to delay delivery of all messages to consumers. */
		delivery_delay?: Input<number | undefined>

		/** Number of seconds after which an unconsumed message will be delayed. */
		message_retention_period?: Input<number | undefined>
	} | undefined>
}

type CloudflareQueue = Readonly<{

	/** A Resource identifier. */
	account_id: Output<string>
	consumers: Output<Readonly<{

		/** A Resource identifier. */
		consumer_id: string
		created_on: string

		/** A Resource identifier. */
		queue_id: string

		/** Name of a Worker */
		script: string

		/** Name of a Worker */
		script_name: string
		settings: Readonly<{

			/** The maximum number of messages to include in a batch. */
			batch_size: number

			/** Maximum number of concurrent consumers that may consume from this Queue. Set to `null` to automatically opt in to the platform's maximum (recommended). */
			max_concurrency: number

			/** The maximum number of retries */
			max_retries: number

			/** The number of milliseconds to wait for a batch to fill up before attempting to deliver it */
			max_wait_time_ms: number

			/** The number of seconds to delay before making the message available for another attempt. */
			retry_delay: number

			/** The number of milliseconds that a message is exclusively leased. After the timeout, the message becomes available for another attempt. */
			visibility_timeout_ms: number
		}>

		/** Available values: "worker". */
		type: string
	}>>
	consumers_total_count: Output<number>
	created_on: Output<string>
	id: Output<string>
	modified_on: Output<string>
	producers: Output<Readonly<{
		bucket_name: string
		script: string

		/** Available values: "worker". */
		type: string
	}>>
	producers_total_count: Output<number>
	queue_id: Output<string>
	queue_name: Output<string>
	settings: Output<Readonly<{

		/** Number of seconds to delay delivery of all messages to consumers. */
		delivery_delay: number

		/** Number of seconds after which an unconsumed message will be delayed. */
		message_retention_period: number
	}>>
}>

type CloudflareRegionalTieredCacheProps = {

	/** Value of the Regional Tiered Cache zone setting.
Available values: "on", "off". */
	value?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareRegionalTieredCache = Readonly<{

	/** Whether the setting is editable */
	editable: Output<boolean>

	/** Identifier */
	id: Output<string>

	/** Last time this setting was modified. */
	modified_on: Output<string>

	/** Value of the Regional Tiered Cache zone setting.
Available values: "on", "off". */
	value: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareAccessRuleProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>
	configuration: Input<{

		/** The configuration target. You must set the target to `ip` when specifying an IP address in the rule.
Available values: "ip". */
		target?: Input<string | undefined>

		/** The IP address to match. This address will be compared to the IP address of incoming requests. */
		value?: Input<string | undefined>
	}>

	/** The action to apply to a matched request.
Available values: "block", "challenge", "whitelist", "js_challenge", "managed_challenge". */
	mode: Input<string>

	/** An informative summary of the rule, typically used as a reminder or explanation. */
	notes?: Input<string | undefined>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareAccessRule = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** The available actions that a rule can apply to a matched request. */
	allowed_modes: ReadonlyArray<string>
	configuration: Output<Readonly<{

		/** The configuration target. You must set the target to `ip` when specifying an IP address in the rule.
Available values: "ip". */
		target: string

		/** The IP address to match. This address will be compared to the IP address of incoming requests. */
		value: string
	}>>

	/** The timestamp of when the rule was created. */
	created_on: Output<string>

	/** The unique identifier of the IP Access rule. */
	id: Output<string>

	/** The action to apply to a matched request.
Available values: "block", "challenge", "whitelist", "js_challenge", "managed_challenge". */
	mode: Output<string>

	/** The timestamp of when the rule was last modified. */
	modified_on: Output<string>

	/** An informative summary of the rule, typically used as a reminder or explanation. */
	notes: Output<string | undefined>
	scope: Output<Readonly<{

		/** The contact email address of the user. */
		email: string

		/** Identifier */
		id: string

		/** The scope of the rule.
Available values: "user", "organization". */
		type: string
	}>>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareZeroTrustAccessInfrastructureTargetProps = {

	/** Account identifier */
	account_id: Input<string>

	/** A non-unique field that refers to a target. Case insensitive, maximum
length of 255 characters, supports the use of special characters dash
and period, does not support spaces, and must start and end with an
alphanumeric character. */
	hostname: Input<string>
	ip: Input<{
		ipv4?: Input<{

			/** IP address of the target */
			ip_addr?: Input<string | undefined>

			/** (optional) Private virtual network identifier for the target. If omitted, the default virtual network ID will be used. */
			virtual_network_id?: Input<string | undefined>
		} | undefined>
		ipv6?: Input<{

			/** IP address of the target */
			ip_addr?: Input<string | undefined>

			/** (optional) Private virtual network identifier for the target. If omitted, the default virtual network ID will be used. */
			virtual_network_id?: Input<string | undefined>
		} | undefined>
	}>
}

type CloudflareZeroTrustAccessInfrastructureTarget = Readonly<{

	/** Account identifier */
	account_id: Output<string>

	/** Date and time at which the target was created */
	created_at: Output<string>

	/** A non-unique field that refers to a target. Case insensitive, maximum
length of 255 characters, supports the use of special characters dash
and period, does not support spaces, and must start and end with an
alphanumeric character. */
	hostname: Output<string>

	/** Target identifier */
	id: Output<string>
	ip: Output<Readonly<{
		ipv4: Readonly<{

			/** IP address of the target */
			ip_addr?: string

			/** (optional) Private virtual network identifier for the target. If omitted, the default virtual network ID will be used. */
			virtual_network_id?: string
		}>
		ipv6: Readonly<{

			/** IP address of the target */
			ip_addr?: string

			/** (optional) Private virtual network identifier for the target. If omitted, the default virtual network ID will be used. */
			virtual_network_id?: string
		}>
	}>>

	/** Date and time at which the target was modified */
	modified_at: Output<string>
}>

type CloudflareMagicTransitSiteAclProps = {

	/** Identifier */
	account_id: Input<string>

	/** Description for the ACL. */
	description?: Input<string | undefined>

	/** The desired forwarding action for this ACL policy. If set to "false", the policy will forward traffic to Cloudflare. If set to "true", the policy will forward traffic locally on the Magic Connector. If not included in request, will default to false. */
	forward_locally?: Input<boolean | undefined>
	lan_1: Input<{

		/** The identifier for the LAN you want to create an ACL policy with. */
		lan_id: Input<string>

		/** The name of the LAN based on the provided lan_id. */
		lan_name?: Input<string | undefined>

		/** Array of port ranges on the provided LAN that will be included in the ACL. If no ports or port rangess are provided, communication on any port on this LAN is allowed. */
		port_ranges?: Input<Array<Input<string>> | undefined>

		/** Array of ports on the provided LAN that will be included in the ACL. If no ports or port ranges are provided, communication on any port on this LAN is allowed. */
		ports?: Input<Array<Input<number>> | undefined>

		/** Array of subnet IPs within the LAN that will be included in the ACL. If no subnets are provided, communication on any subnets on this LAN are allowed. */
		subnets?: Input<Array<Input<string>> | undefined>
	}>
	lan_2: Input<{

		/** The identifier for the LAN you want to create an ACL policy with. */
		lan_id: Input<string>

		/** The name of the LAN based on the provided lan_id. */
		lan_name?: Input<string | undefined>

		/** Array of port ranges on the provided LAN that will be included in the ACL. If no ports or port rangess are provided, communication on any port on this LAN is allowed. */
		port_ranges?: Input<Array<Input<string>> | undefined>

		/** Array of ports on the provided LAN that will be included in the ACL. If no ports or port ranges are provided, communication on any port on this LAN is allowed. */
		ports?: Input<Array<Input<number>> | undefined>

		/** Array of subnet IPs within the LAN that will be included in the ACL. If no subnets are provided, communication on any subnets on this LAN are allowed. */
		subnets?: Input<Array<Input<string>> | undefined>
	}>

	/** The name of the ACL. */
	name: Input<string>
	protocols?: Input<Array<Input<string>> | undefined>

	/** Identifier */
	site_id: Input<string>

	/** The desired traffic direction for this ACL policy. If set to "false", the policy will allow bidirectional traffic. If set to "true", the policy will only allow traffic in one direction. If not included in request, will default to false. */
	unidirectional?: Input<boolean | undefined>
}

type CloudflareMagicTransitSiteAcl = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Description for the ACL. */
	description: Output<string | undefined>

	/** The desired forwarding action for this ACL policy. If set to "false", the policy will forward traffic to Cloudflare. If set to "true", the policy will forward traffic locally on the Magic Connector. If not included in request, will default to false. */
	forward_locally: Output<boolean | undefined>

	/** Identifier */
	id: Output<string>
	lan_1: Output<Readonly<{

		/** The identifier for the LAN you want to create an ACL policy with. */
		lan_id: string

		/** The name of the LAN based on the provided lan_id. */
		lan_name: string

		/** Array of port ranges on the provided LAN that will be included in the ACL. If no ports or port rangess are provided, communication on any port on this LAN is allowed. */
		port_ranges: ReadonlyArray<string>

		/** Array of ports on the provided LAN that will be included in the ACL. If no ports or port ranges are provided, communication on any port on this LAN is allowed. */
		ports: ReadonlyArray<number>

		/** Array of subnet IPs within the LAN that will be included in the ACL. If no subnets are provided, communication on any subnets on this LAN are allowed. */
		subnets: ReadonlyArray<string>
	}>>
	lan_2: Output<Readonly<{

		/** The identifier for the LAN you want to create an ACL policy with. */
		lan_id: string

		/** The name of the LAN based on the provided lan_id. */
		lan_name: string

		/** Array of port ranges on the provided LAN that will be included in the ACL. If no ports or port rangess are provided, communication on any port on this LAN is allowed. */
		port_ranges: ReadonlyArray<string>

		/** Array of ports on the provided LAN that will be included in the ACL. If no ports or port ranges are provided, communication on any port on this LAN is allowed. */
		ports: ReadonlyArray<number>

		/** Array of subnet IPs within the LAN that will be included in the ACL. If no subnets are provided, communication on any subnets on this LAN are allowed. */
		subnets: ReadonlyArray<string>
	}>>

	/** The name of the ACL. */
	name: Output<string>
	protocols: ReadonlyArray<string>

	/** Identifier */
	site_id: Output<string>

	/** The desired traffic direction for this ACL policy. If set to "false", the policy will allow bidirectional traffic. If set to "true", the policy will only allow traffic in one direction. If not included in request, will default to false. */
	unidirectional: Output<boolean | undefined>
}>

type CloudflareZeroTrustAccessApplicationProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** When set to true, users can authenticate to this application using their WARP session.  When set to false this application will always require direct IdP authentication. This setting always overrides the organization setting for WARP authentication. */
	allow_authenticate_via_warp?: Input<boolean | undefined>

	/** The identity providers your users can select when connecting to this application. Defaults to all IdPs configured in your account. */
	allowed_idps?: Input<Array<Input<string>> | undefined>

	/** The image URL of the logo shown in the App Launcher header. */
	app_launcher_logo_url?: Input<string | undefined>

	/** Displays the application in the App Launcher. */
	app_launcher_visible?: Input<boolean | undefined>

	/** When set to `true`, users skip the identity provider selection step during login. You must specify only one identity provider in allowed_idps. */
	auto_redirect_to_identity?: Input<boolean | undefined>

	/** The background color of the App Launcher page. */
	bg_color?: Input<string | undefined>
	cors_headers?: Input<{

		/** Allows all HTTP request headers. */
		allow_all_headers?: Input<boolean | undefined>

		/** Allows all HTTP request methods. */
		allow_all_methods?: Input<boolean | undefined>

		/** Allows all origins. */
		allow_all_origins?: Input<boolean | undefined>

		/** When set to `true`, includes credentials (cookies, authorization headers, or TLS client certificates) with requests. */
		allow_credentials?: Input<boolean | undefined>

		/** Allowed HTTP request headers. */
		allowed_headers?: Input<Array<Input<string>> | undefined>

		/** Allowed HTTP request methods. */
		allowed_methods?: Input<Array<Input<string>> | undefined>

		/** Allowed origins. */
		allowed_origins?: Input<Array<Input<string>> | undefined>

		/** The maximum number of seconds the results of a preflight request can be cached. */
		max_age?: Input<number | undefined>
	} | undefined>

	/** The custom error message shown to a user when they are denied access to the application. */
	custom_deny_message?: Input<string | undefined>

	/** The custom URL a user is redirected to when they are denied access to the application when failing identity-based rules. */
	custom_deny_url?: Input<string | undefined>

	/** The custom URL a user is redirected to when they are denied access to the application when failing non-identity rules. */
	custom_non_identity_deny_url?: Input<string | undefined>

	/** The custom pages that will be displayed when applicable for this application */
	custom_pages?: Input<Array<Input<string>> | undefined>
	destinations?: Input<{

		/** The CIDR range of the destination. Single IPs will be computed as /32. */
		cidr?: Input<string | undefined>

		/** The hostname of the destination. Matches a valid SNI served by an HTTPS origin. */
		hostname?: Input<string | undefined>

		/** The L4 protocol of the destination. When omitted, both UDP and TCP traffic will match.
Available values: "tcp", "udp". */
		l4_protocol?: Input<string | undefined>

		/** The port range of the destination. Can be a single port or a range of ports. When omitted, all ports will match. */
		port_range?: Input<string | undefined>

		/** Available values: "public". */
		type?: Input<string | undefined>

		/** The URI of the destination. Public destinations' URIs can include a domain and path with [wildcards](https://developers.cloudflare.com/cloudflare-one/policies/access/app-paths/). */
		uri?: Input<string | undefined>

		/** The VNET ID to match the destination. When omitted, all VNETs will match. */
		vnet_id?: Input<string | undefined>
	} | undefined>

	/** The primary hostname and path secured by Access. This domain will be displayed if the app is visible in the App Launcher. */
	domain?: Input<string | undefined>

	/** Enables the binding cookie, which increases security against compromised authorization tokens and CSRF attacks. */
	enable_binding_cookie?: Input<boolean | undefined>
	footer_links?: Input<{

		/** The hypertext in the footer link. */
		name: Input<string>

		/** the hyperlink in the footer link. */
		url: Input<string>
	} | undefined>

	/** The background color of the App Launcher header. */
	header_bg_color?: Input<string | undefined>

	/** Enables the HttpOnly cookie attribute, which increases security against XSS attacks. */
	http_only_cookie_attribute?: Input<boolean | undefined>
	landing_page_design?: Input<{

		/** The background color of the log in button on the landing page. */
		button_color?: Input<string | undefined>

		/** The color of the text in the log in button on the landing page. */
		button_text_color?: Input<string | undefined>

		/** The URL of the image shown on the landing page. */
		image_url?: Input<string | undefined>

		/** The message shown on the landing page. */
		message?: Input<string | undefined>

		/** The title shown on the landing page. */
		title?: Input<string | undefined>
	} | undefined>

	/** The image URL for the logo shown in the App Launcher dashboard. */
	logo_url?: Input<string | undefined>

	/** The name of the application. */
	name?: Input<string | undefined>

	/** Allows options preflight requests to bypass Access authentication and go directly to the origin. Cannot turn on if cors_headers is set. */
	options_preflight_bypass?: Input<boolean | undefined>

	/** Enables cookie paths to scope an application's JWT to the application path. If disabled, the JWT will scope to the hostname by default */
	path_cookie_attribute?: Input<boolean | undefined>
	policies?: Input<{
		connection_rules?: Input<{
			ssh?: Input<{

				/** Enables using Identity Provider email alias as SSH username. */
				allow_email_alias?: Input<boolean | undefined>

				/** Contains the Unix usernames that may be used when connecting over SSH. */
				usernames: Input<Array<Input<string>>>
			} | undefined>
		} | undefined>

		/** The action Access will take if a user matches this policy. Infrastructure application policies can only use the Allow action.
Available values: "allow", "deny", "non_identity", "bypass". */
		decision?: Input<string | undefined>
		exclude?: Input<{
			any_valid_service_token?: Input<{

			} | undefined>
			auth_context?: Input<{

				/** The ACID of an Authentication context. */
				ac_id: Input<string>

				/** The ID of an Authentication context. */
				id: Input<string>

				/** The ID of your Azure identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			auth_method?: Input<{

				/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
				auth_method: Input<string>
			} | undefined>
			azure_ad?: Input<{

				/** The ID of an Azure group. */
				id: Input<string>

				/** The ID of your Azure identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			certificate?: Input<{

			} | undefined>
			common_name?: Input<{

				/** The common name to match. */
				common_name: Input<string>
			} | undefined>
			device_posture?: Input<{

				/** The ID of a device posture integration. */
				integration_uid: Input<string>
			} | undefined>
			email?: Input<{

				/** The email of the user. */
				email: Input<string>
			} | undefined>
			email_domain?: Input<{

				/** The email domain to match. */
				domain: Input<string>
			} | undefined>
			email_list?: Input<{

				/** The ID of a previously created email list. */
				id: Input<string>
			} | undefined>
			everyone?: Input<{

			} | undefined>
			external_evaluation?: Input<{

				/** The API endpoint containing your business logic. */
				evaluate_url: Input<string>

				/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
				keys_url: Input<string>
			} | undefined>
			geo?: Input<{

				/** The country code that should be matched. */
				country_code: Input<string>
			} | undefined>
			github_organization?: Input<{

				/** The ID of your Github identity provider. */
				identity_provider_id: Input<string>

				/** The name of the organization. */
				name: Input<string>

				/** The name of the team */
				team?: Input<string | undefined>
			} | undefined>
			group?: Input<{

				/** The ID of a previously created Access group. */
				id: Input<string>
			} | undefined>
			gsuite?: Input<{

				/** The email of the Google Workspace group. */
				email: Input<string>

				/** The ID of your Google Workspace identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			ip?: Input<{

				/** An IPv4 or IPv6 CIDR block. */
				ip: Input<string>
			} | undefined>
			ip_list?: Input<{

				/** The ID of a previously created IP list. */
				id: Input<string>
			} | undefined>
			login_method?: Input<{

				/** The ID of an identity provider. */
				id: Input<string>
			} | undefined>
			okta?: Input<{

				/** The ID of your Okta identity provider. */
				identity_provider_id: Input<string>

				/** The name of the Okta group. */
				name: Input<string>
			} | undefined>
			saml?: Input<{

				/** The name of the SAML attribute. */
				attribute_name: Input<string>

				/** The SAML attribute value to look for. */
				attribute_value: Input<string>

				/** The ID of your SAML identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			service_token?: Input<{

				/** The ID of a Service Token. */
				token_id: Input<string>
			} | undefined>
		} | undefined>

		/** The UUID of the policy */
		id?: Input<string | undefined>
		include?: Input<{
			any_valid_service_token?: Input<{

			} | undefined>
			auth_context?: Input<{

				/** The ACID of an Authentication context. */
				ac_id: Input<string>

				/** The ID of an Authentication context. */
				id: Input<string>

				/** The ID of your Azure identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			auth_method?: Input<{

				/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
				auth_method: Input<string>
			} | undefined>
			azure_ad?: Input<{

				/** The ID of an Azure group. */
				id: Input<string>

				/** The ID of your Azure identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			certificate?: Input<{

			} | undefined>
			common_name?: Input<{

				/** The common name to match. */
				common_name: Input<string>
			} | undefined>
			device_posture?: Input<{

				/** The ID of a device posture integration. */
				integration_uid: Input<string>
			} | undefined>
			email?: Input<{

				/** The email of the user. */
				email: Input<string>
			} | undefined>
			email_domain?: Input<{

				/** The email domain to match. */
				domain: Input<string>
			} | undefined>
			email_list?: Input<{

				/** The ID of a previously created email list. */
				id: Input<string>
			} | undefined>
			everyone?: Input<{

			} | undefined>
			external_evaluation?: Input<{

				/** The API endpoint containing your business logic. */
				evaluate_url: Input<string>

				/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
				keys_url: Input<string>
			} | undefined>
			geo?: Input<{

				/** The country code that should be matched. */
				country_code: Input<string>
			} | undefined>
			github_organization?: Input<{

				/** The ID of your Github identity provider. */
				identity_provider_id: Input<string>

				/** The name of the organization. */
				name: Input<string>

				/** The name of the team */
				team?: Input<string | undefined>
			} | undefined>
			group?: Input<{

				/** The ID of a previously created Access group. */
				id: Input<string>
			} | undefined>
			gsuite?: Input<{

				/** The email of the Google Workspace group. */
				email: Input<string>

				/** The ID of your Google Workspace identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			ip?: Input<{

				/** An IPv4 or IPv6 CIDR block. */
				ip: Input<string>
			} | undefined>
			ip_list?: Input<{

				/** The ID of a previously created IP list. */
				id: Input<string>
			} | undefined>
			login_method?: Input<{

				/** The ID of an identity provider. */
				id: Input<string>
			} | undefined>
			okta?: Input<{

				/** The ID of your Okta identity provider. */
				identity_provider_id: Input<string>

				/** The name of the Okta group. */
				name: Input<string>
			} | undefined>
			saml?: Input<{

				/** The name of the SAML attribute. */
				attribute_name: Input<string>

				/** The SAML attribute value to look for. */
				attribute_value: Input<string>

				/** The ID of your SAML identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			service_token?: Input<{

				/** The ID of a Service Token. */
				token_id: Input<string>
			} | undefined>
		} | undefined>

		/** The name of the Access policy. */
		name?: Input<string | undefined>

		/** The order of execution for this policy. Must be unique for each policy within an app. */
		precedence?: Input<number | undefined>
		require?: Input<{
			any_valid_service_token?: Input<{

			} | undefined>
			auth_context?: Input<{

				/** The ACID of an Authentication context. */
				ac_id: Input<string>

				/** The ID of an Authentication context. */
				id: Input<string>

				/** The ID of your Azure identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			auth_method?: Input<{

				/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
				auth_method: Input<string>
			} | undefined>
			azure_ad?: Input<{

				/** The ID of an Azure group. */
				id: Input<string>

				/** The ID of your Azure identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			certificate?: Input<{

			} | undefined>
			common_name?: Input<{

				/** The common name to match. */
				common_name: Input<string>
			} | undefined>
			device_posture?: Input<{

				/** The ID of a device posture integration. */
				integration_uid: Input<string>
			} | undefined>
			email?: Input<{

				/** The email of the user. */
				email: Input<string>
			} | undefined>
			email_domain?: Input<{

				/** The email domain to match. */
				domain: Input<string>
			} | undefined>
			email_list?: Input<{

				/** The ID of a previously created email list. */
				id: Input<string>
			} | undefined>
			everyone?: Input<{

			} | undefined>
			external_evaluation?: Input<{

				/** The API endpoint containing your business logic. */
				evaluate_url: Input<string>

				/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
				keys_url: Input<string>
			} | undefined>
			geo?: Input<{

				/** The country code that should be matched. */
				country_code: Input<string>
			} | undefined>
			github_organization?: Input<{

				/** The ID of your Github identity provider. */
				identity_provider_id: Input<string>

				/** The name of the organization. */
				name: Input<string>

				/** The name of the team */
				team?: Input<string | undefined>
			} | undefined>
			group?: Input<{

				/** The ID of a previously created Access group. */
				id: Input<string>
			} | undefined>
			gsuite?: Input<{

				/** The email of the Google Workspace group. */
				email: Input<string>

				/** The ID of your Google Workspace identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			ip?: Input<{

				/** An IPv4 or IPv6 CIDR block. */
				ip: Input<string>
			} | undefined>
			ip_list?: Input<{

				/** The ID of a previously created IP list. */
				id: Input<string>
			} | undefined>
			login_method?: Input<{

				/** The ID of an identity provider. */
				id: Input<string>
			} | undefined>
			okta?: Input<{

				/** The ID of your Okta identity provider. */
				identity_provider_id: Input<string>

				/** The name of the Okta group. */
				name: Input<string>
			} | undefined>
			saml?: Input<{

				/** The name of the SAML attribute. */
				attribute_name: Input<string>

				/** The SAML attribute value to look for. */
				attribute_value: Input<string>

				/** The ID of your SAML identity provider. */
				identity_provider_id: Input<string>
			} | undefined>
			service_token?: Input<{

				/** The ID of a Service Token. */
				token_id: Input<string>
			} | undefined>
		} | undefined>
	} | undefined>
	saas_app?: Input<{

		/** The lifetime of the OIDC Access Token after creation. Valid units are m,h. Must be greater than or equal to 1m and less than or equal to 24h. */
		access_token_lifetime?: Input<string | undefined>

		/** If client secret should be required on the token endpoint when authorization_code_with_pkce grant is used. */
		allow_pkce_without_client_secret?: Input<boolean | undefined>

		/** The URL where this applications tile redirects users */
		app_launcher_url?: Input<string | undefined>

		/** Optional identifier indicating the authentication protocol used for the saas app. Required for OIDC. Default if unset is "saml"
Available values: "saml", "oidc". */
		auth_type?: Input<string | undefined>

		/** The application client id */
		client_id?: Input<string | undefined>

		/** The application client secret, only returned on POST request. */
		client_secret?: Input<string | undefined>

		/** The service provider's endpoint that is responsible for receiving and parsing a SAML assertion. */
		consumer_service_url?: Input<string | undefined>
		custom_attributes?: Input<{

			/** The SAML FriendlyName of the attribute. */
			friendly_name?: Input<string | undefined>

			/** The name of the attribute. */
			name?: Input<string | undefined>

			/** A globally unique name for an identity or service provider.
Available values: "urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified", "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", "urn:oasis:names:tc:SAML:2.0:attrname-format:uri". */
			name_format?: Input<string | undefined>

			/** If the attribute is required when building a SAML assertion. */
			required?: Input<boolean | undefined>
			source?: Input<{

				/** The name of the IdP attribute. */
				name?: Input<string | undefined>
				name_by_idp?: Input<{

					/** The UID of the IdP. */
					idp_id?: Input<string | undefined>

					/** The name of the IdP provided attribute. */
					source_name?: Input<string | undefined>
				} | undefined>
			} | undefined>
		} | undefined>
		custom_claims?: Input<{

			/** The name of the claim. */
			name?: Input<string | undefined>

			/** If the claim is required when building an OIDC token. */
			required?: Input<boolean | undefined>

			/** The scope of the claim.
Available values: "groups", "profile", "email", "openid". */
			scope?: Input<string | undefined>
			source?: Input<{

				/** The name of the IdP claim. */
				name?: Input<string | undefined>

				/** A mapping from IdP ID to claim name. */
				name_by_idp?: Input<Record<string, Input<string>> | undefined>
			} | undefined>
		} | undefined>

		/** The URL that the user will be redirected to after a successful login for IDP initiated logins. */
		default_relay_state?: Input<string | undefined>

		/** The OIDC flows supported by this application */
		grant_types?: Input<Array<Input<string>> | undefined>

		/** A regex to filter Cloudflare groups returned in ID token and userinfo endpoint */
		group_filter_regex?: Input<string | undefined>
		hybrid_and_implicit_options?: Input<{

			/** If an Access Token should be returned from the OIDC Authorization endpoint */
			return_access_token_from_authorization_endpoint?: Input<boolean | undefined>

			/** If an ID Token should be returned from the OIDC Authorization endpoint */
			return_id_token_from_authorization_endpoint?: Input<boolean | undefined>
		} | undefined>

		/** The unique identifier for your SaaS application. */
		idp_entity_id?: Input<string | undefined>

		/** The format of the name identifier sent to the SaaS application.
Available values: "id", "email". */
		name_id_format?: Input<string | undefined>

		/** A [JSONata](https://jsonata.org/) expression that transforms an application's user identities into a NameID value for its SAML assertion. This expression should evaluate to a singular string. The output of this expression can override the `name_id_format` setting. */
		name_id_transform_jsonata?: Input<string | undefined>

		/** The Access public certificate that will be used to verify your identity. */
		public_key?: Input<string | undefined>

		/** The permitted URL's for Cloudflare to return Authorization codes and Access/ID tokens */
		redirect_uris?: Input<Array<Input<string>> | undefined>
		refresh_token_options?: Input<{

			/** How long a refresh token will be valid for after creation. Valid units are m,h,d. Must be longer than 1m. */
			lifetime?: Input<string | undefined>
		} | undefined>

		/** A [JSONata] (https://jsonata.org/) expression that transforms an application's user identities into attribute assertions in the SAML response. The expression can transform id, email, name, and groups values. It can also transform fields listed in the saml_attributes or oidc_fields of the identity provider used to authenticate. The output of this expression must be a JSON object. */
		saml_attribute_transform_jsonata?: Input<string | undefined>

		/** Define the user information shared with access, "offline_access" scope will be automatically enabled if refresh tokens are enabled */
		scopes?: Input<Array<Input<string>> | undefined>

		/** A globally unique name for an identity or service provider. */
		sp_entity_id?: Input<string | undefined>

		/** The endpoint where your SaaS application will send login requests. */
		sso_endpoint?: Input<string | undefined>
	} | undefined>

	/** Sets the SameSite cookie setting, which provides increased security against CSRF attacks. */
	same_site_cookie_attribute?: Input<string | undefined>
	scim_config?: Input<{
		authentication?: Input<{

			/** URL used to generate the auth code used during token generation. */
			authorization_url?: Input<string | undefined>

			/** Client ID used to authenticate when generating a token for authenticating with the remote SCIM service. */
			client_id?: Input<string | undefined>

			/** Secret used to authenticate when generating a token for authenticating with the remove SCIM service. */
			client_secret?: Input<string | undefined>

			/** Password used to authenticate with the remote SCIM service. */
			password?: Input<string | undefined>

			/** The authentication scheme to use when making SCIM requests to this application.
Available values: "httpbasic". */
			scheme: Input<string>

			/** The authorization scopes to request when generating the token used to authenticate with the remove SCIM service. */
			scopes?: Input<Array<Input<string>> | undefined>

			/** Token used to authenticate with the remote SCIM service. */
			token?: Input<string | undefined>

			/** URL used to generate the token used to authenticate with the remote SCIM service. */
			token_url?: Input<string | undefined>

			/** User name used to authenticate with the remote SCIM service. */
			user?: Input<string | undefined>
		} | undefined>

		/** If false, propagates DELETE requests to the target application for SCIM resources. If true, sets 'active' to false on the SCIM resource. Note: Some targets do not support DELETE operations. */
		deactivate_on_delete?: Input<boolean | undefined>

		/** Whether SCIM provisioning is turned on for this application. */
		enabled?: Input<boolean | undefined>

		/** The UID of the IdP to use as the source for SCIM resources to provision to this application. */
		idp_uid: Input<string>
		mappings?: Input<{

			/** Whether or not this mapping is enabled. */
			enabled?: Input<boolean | undefined>

			/** A [SCIM filter expression](https://datatracker.ietf.org/doc/html/rfc7644#section-3.4.2.2) that matches resources that should be provisioned to this application. */
			filter?: Input<string | undefined>
			operations?: Input<{

				/** Whether or not this mapping applies to create (POST) operations. */
				create?: Input<boolean | undefined>

				/** Whether or not this mapping applies to DELETE operations. */
				delete?: Input<boolean | undefined>

				/** Whether or not this mapping applies to update (PATCH/PUT) operations. */
				update?: Input<boolean | undefined>
			} | undefined>

			/** Which SCIM resource type this mapping applies to. */
			schema: Input<string>

			/** The level of adherence to outbound resource schemas when provisioning to this mapping. ‘Strict’ removes unknown values, while ‘passthrough’ passes unknown values to the target.
Available values: "strict", "passthrough". */
			strictness?: Input<string | undefined>

			/** A [JSONata](https://jsonata.org/) expression that transforms the resource before provisioning it in the application. */
			transform_jsonata?: Input<string | undefined>
		} | undefined>

		/** The base URI for the application's SCIM-compatible API. */
		remote_uri: Input<string>
	} | undefined>

	/** List of public domains that Access will secure. This field is deprecated in favor of `destinations` and will be supported until **November 21, 2025.** If `destinations` are provided, then `self_hosted_domains` will be ignored. */
	self_hosted_domains?: Input<Array<Input<string>> | undefined>

	/** Returns a 401 status code when the request is blocked by a Service Auth policy. */
	service_auth_401_redirect?: Input<boolean | undefined>

	/** The amount of time that tokens issued for this application will be valid. Must be in the format `300ms` or `2h45m`. Valid time units are: ns, us (or µs), ms, s, m, h. */
	session_duration?: Input<string | undefined>

	/** Determines when to skip the App Launcher landing page. */
	skip_app_launcher_login_page?: Input<boolean | undefined>

	/** Enables automatic authentication through cloudflared. */
	skip_interstitial?: Input<boolean | undefined>

	/** The tags you want assigned to an application. Tags are used to filter applications in the App Launcher dashboard. */
	tags?: Input<Array<Input<string>> | undefined>
	target_criteria?: Input<{

		/** The port that the targets use for the chosen communication protocol. A port cannot be assigned to multiple protocols. */
		port: Input<number>

		/** The communication protocol your application secures.
Available values: "ssh". */
		protocol: Input<string>

		/** Contains a map of target attribute keys to target attribute values. */
		target_attributes: Input<Record<string, Input<Array<Input<string>>>>>
	} | undefined>

	/** The application type. */
	type?: Input<string | undefined>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareZeroTrustAccessApplication = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** When set to true, users can authenticate to this application using their WARP session.  When set to false this application will always require direct IdP authentication. This setting always overrides the organization setting for WARP authentication. */
	allow_authenticate_via_warp: Output<boolean | undefined>

	/** The identity providers your users can select when connecting to this application. Defaults to all IdPs configured in your account. */
	allowed_idps: ReadonlyArray<string>

	/** The image URL of the logo shown in the App Launcher header. */
	app_launcher_logo_url: Output<string | undefined>

	/** Displays the application in the App Launcher. */
	app_launcher_visible: Output<boolean>

	/** Audience tag. */
	aud: Output<string>

	/** When set to `true`, users skip the identity provider selection step during login. You must specify only one identity provider in allowed_idps. */
	auto_redirect_to_identity: Output<boolean>

	/** The background color of the App Launcher page. */
	bg_color: Output<string | undefined>
	cors_headers: Output<Readonly<{

		/** Allows all HTTP request headers. */
		allow_all_headers: boolean

		/** Allows all HTTP request methods. */
		allow_all_methods: boolean

		/** Allows all origins. */
		allow_all_origins: boolean

		/** When set to `true`, includes credentials (cookies, authorization headers, or TLS client certificates) with requests. */
		allow_credentials: boolean

		/** Allowed HTTP request headers. */
		allowed_headers: ReadonlyArray<string>

		/** Allowed HTTP request methods. */
		allowed_methods: ReadonlyArray<string>

		/** Allowed origins. */
		allowed_origins: ReadonlyArray<string>

		/** The maximum number of seconds the results of a preflight request can be cached. */
		max_age: number
	}>>
	created_at: Output<string>

	/** The custom error message shown to a user when they are denied access to the application. */
	custom_deny_message: Output<string | undefined>

	/** The custom URL a user is redirected to when they are denied access to the application when failing identity-based rules. */
	custom_deny_url: Output<string | undefined>

	/** The custom URL a user is redirected to when they are denied access to the application when failing non-identity rules. */
	custom_non_identity_deny_url: Output<string | undefined>

	/** The custom pages that will be displayed when applicable for this application */
	custom_pages: ReadonlyArray<string>
	destinations: Output<Readonly<{

		/** The CIDR range of the destination. Single IPs will be computed as /32. */
		cidr: string

		/** The hostname of the destination. Matches a valid SNI served by an HTTPS origin. */
		hostname: string

		/** The L4 protocol of the destination. When omitted, both UDP and TCP traffic will match.
Available values: "tcp", "udp". */
		l4_protocol: string

		/** The port range of the destination. Can be a single port or a range of ports. When omitted, all ports will match. */
		port_range: string

		/** Available values: "public". */
		type: string

		/** The URI of the destination. Public destinations' URIs can include a domain and path with [wildcards](https://developers.cloudflare.com/cloudflare-one/policies/access/app-paths/). */
		uri: string

		/** The VNET ID to match the destination. When omitted, all VNETs will match. */
		vnet_id: string
	}>>

	/** The primary hostname and path secured by Access. This domain will be displayed if the app is visible in the App Launcher. */
	domain: Output<string | undefined>

	/** Enables the binding cookie, which increases security against compromised authorization tokens and CSRF attacks. */
	enable_binding_cookie: Output<boolean>
	footer_links: Output<Readonly<{

		/** The hypertext in the footer link. */
		name: string

		/** the hyperlink in the footer link. */
		url: string
	}>>

	/** The background color of the App Launcher header. */
	header_bg_color: Output<string | undefined>

	/** Enables the HttpOnly cookie attribute, which increases security against XSS attacks. */
	http_only_cookie_attribute: Output<boolean>

	/** UUID */
	id: Output<string>
	landing_page_design: Output<Readonly<{

		/** The background color of the log in button on the landing page. */
		button_color: string

		/** The color of the text in the log in button on the landing page. */
		button_text_color: string

		/** The URL of the image shown on the landing page. */
		image_url: string

		/** The message shown on the landing page. */
		message: string

		/** The title shown on the landing page. */
		title: string
	}>>

	/** The image URL for the logo shown in the App Launcher dashboard. */
	logo_url: Output<string | undefined>

	/** The name of the application. */
	name: Output<string | undefined>

	/** Allows options preflight requests to bypass Access authentication and go directly to the origin. Cannot turn on if cors_headers is set. */
	options_preflight_bypass: Output<boolean | undefined>

	/** Enables cookie paths to scope an application's JWT to the application path. If disabled, the JWT will scope to the hostname by default */
	path_cookie_attribute: Output<boolean>
	policies: Output<Readonly<{
		connection_rules: Readonly<{
			ssh: Readonly<{

				/** Enables using Identity Provider email alias as SSH username. */
				allow_email_alias?: boolean

				/** Contains the Unix usernames that may be used when connecting over SSH. */
				usernames: ReadonlyArray<string>
			}>
		}>

		/** The action Access will take if a user matches this policy. Infrastructure application policies can only use the Allow action.
Available values: "allow", "deny", "non_identity", "bypass". */
		decision: string
		exclude: Readonly<{
			any_valid_service_token?: Readonly<{

			}>
			auth_context: Readonly<{

				/** The ACID of an Authentication context. */
				ac_id: string

				/** The ID of an Authentication context. */
				id: string

				/** The ID of your Azure identity provider. */
				identity_provider_id: string
			}>
			auth_method: Readonly<{

				/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
				auth_method: string
			}>
			azure_ad: Readonly<{

				/** The ID of an Azure group. */
				id: string

				/** The ID of your Azure identity provider. */
				identity_provider_id: string
			}>
			certificate?: Readonly<{

			}>
			common_name: Readonly<{

				/** The common name to match. */
				common_name: string
			}>
			device_posture: Readonly<{

				/** The ID of a device posture integration. */
				integration_uid: string
			}>
			email: Readonly<{

				/** The email of the user. */
				email: string
			}>
			email_domain: Readonly<{

				/** The email domain to match. */
				domain: string
			}>
			email_list: Readonly<{

				/** The ID of a previously created email list. */
				id: string
			}>
			everyone?: Readonly<{

			}>
			external_evaluation: Readonly<{

				/** The API endpoint containing your business logic. */
				evaluate_url: string

				/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
				keys_url: string
			}>
			geo: Readonly<{

				/** The country code that should be matched. */
				country_code: string
			}>
			github_organization: Readonly<{

				/** The ID of your Github identity provider. */
				identity_provider_id: string

				/** The name of the organization. */
				name: string

				/** The name of the team */
				team?: string
			}>
			group: Readonly<{

				/** The ID of a previously created Access group. */
				id: string
			}>
			gsuite: Readonly<{

				/** The email of the Google Workspace group. */
				email: string

				/** The ID of your Google Workspace identity provider. */
				identity_provider_id: string
			}>
			ip: Readonly<{

				/** An IPv4 or IPv6 CIDR block. */
				ip: string
			}>
			ip_list: Readonly<{

				/** The ID of a previously created IP list. */
				id: string
			}>
			login_method: Readonly<{

				/** The ID of an identity provider. */
				id: string
			}>
			okta: Readonly<{

				/** The ID of your Okta identity provider. */
				identity_provider_id: string

				/** The name of the Okta group. */
				name: string
			}>
			saml: Readonly<{

				/** The name of the SAML attribute. */
				attribute_name: string

				/** The SAML attribute value to look for. */
				attribute_value: string

				/** The ID of your SAML identity provider. */
				identity_provider_id: string
			}>
			service_token: Readonly<{

				/** The ID of a Service Token. */
				token_id: string
			}>
		}>

		/** The UUID of the policy */
		id: string
		include: Readonly<{
			any_valid_service_token?: Readonly<{

			}>
			auth_context: Readonly<{

				/** The ACID of an Authentication context. */
				ac_id: string

				/** The ID of an Authentication context. */
				id: string

				/** The ID of your Azure identity provider. */
				identity_provider_id: string
			}>
			auth_method: Readonly<{

				/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
				auth_method: string
			}>
			azure_ad: Readonly<{

				/** The ID of an Azure group. */
				id: string

				/** The ID of your Azure identity provider. */
				identity_provider_id: string
			}>
			certificate?: Readonly<{

			}>
			common_name: Readonly<{

				/** The common name to match. */
				common_name: string
			}>
			device_posture: Readonly<{

				/** The ID of a device posture integration. */
				integration_uid: string
			}>
			email: Readonly<{

				/** The email of the user. */
				email: string
			}>
			email_domain: Readonly<{

				/** The email domain to match. */
				domain: string
			}>
			email_list: Readonly<{

				/** The ID of a previously created email list. */
				id: string
			}>
			everyone?: Readonly<{

			}>
			external_evaluation: Readonly<{

				/** The API endpoint containing your business logic. */
				evaluate_url: string

				/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
				keys_url: string
			}>
			geo: Readonly<{

				/** The country code that should be matched. */
				country_code: string
			}>
			github_organization: Readonly<{

				/** The ID of your Github identity provider. */
				identity_provider_id: string

				/** The name of the organization. */
				name: string

				/** The name of the team */
				team?: string
			}>
			group: Readonly<{

				/** The ID of a previously created Access group. */
				id: string
			}>
			gsuite: Readonly<{

				/** The email of the Google Workspace group. */
				email: string

				/** The ID of your Google Workspace identity provider. */
				identity_provider_id: string
			}>
			ip: Readonly<{

				/** An IPv4 or IPv6 CIDR block. */
				ip: string
			}>
			ip_list: Readonly<{

				/** The ID of a previously created IP list. */
				id: string
			}>
			login_method: Readonly<{

				/** The ID of an identity provider. */
				id: string
			}>
			okta: Readonly<{

				/** The ID of your Okta identity provider. */
				identity_provider_id: string

				/** The name of the Okta group. */
				name: string
			}>
			saml: Readonly<{

				/** The name of the SAML attribute. */
				attribute_name: string

				/** The SAML attribute value to look for. */
				attribute_value: string

				/** The ID of your SAML identity provider. */
				identity_provider_id: string
			}>
			service_token: Readonly<{

				/** The ID of a Service Token. */
				token_id: string
			}>
		}>

		/** The name of the Access policy. */
		name: string

		/** The order of execution for this policy. Must be unique for each policy within an app. */
		precedence: number
		require: Readonly<{
			any_valid_service_token?: Readonly<{

			}>
			auth_context: Readonly<{

				/** The ACID of an Authentication context. */
				ac_id: string

				/** The ID of an Authentication context. */
				id: string

				/** The ID of your Azure identity provider. */
				identity_provider_id: string
			}>
			auth_method: Readonly<{

				/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
				auth_method: string
			}>
			azure_ad: Readonly<{

				/** The ID of an Azure group. */
				id: string

				/** The ID of your Azure identity provider. */
				identity_provider_id: string
			}>
			certificate?: Readonly<{

			}>
			common_name: Readonly<{

				/** The common name to match. */
				common_name: string
			}>
			device_posture: Readonly<{

				/** The ID of a device posture integration. */
				integration_uid: string
			}>
			email: Readonly<{

				/** The email of the user. */
				email: string
			}>
			email_domain: Readonly<{

				/** The email domain to match. */
				domain: string
			}>
			email_list: Readonly<{

				/** The ID of a previously created email list. */
				id: string
			}>
			everyone?: Readonly<{

			}>
			external_evaluation: Readonly<{

				/** The API endpoint containing your business logic. */
				evaluate_url: string

				/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
				keys_url: string
			}>
			geo: Readonly<{

				/** The country code that should be matched. */
				country_code: string
			}>
			github_organization: Readonly<{

				/** The ID of your Github identity provider. */
				identity_provider_id: string

				/** The name of the organization. */
				name: string

				/** The name of the team */
				team?: string
			}>
			group: Readonly<{

				/** The ID of a previously created Access group. */
				id: string
			}>
			gsuite: Readonly<{

				/** The email of the Google Workspace group. */
				email: string

				/** The ID of your Google Workspace identity provider. */
				identity_provider_id: string
			}>
			ip: Readonly<{

				/** An IPv4 or IPv6 CIDR block. */
				ip: string
			}>
			ip_list: Readonly<{

				/** The ID of a previously created IP list. */
				id: string
			}>
			login_method: Readonly<{

				/** The ID of an identity provider. */
				id: string
			}>
			okta: Readonly<{

				/** The ID of your Okta identity provider. */
				identity_provider_id: string

				/** The name of the Okta group. */
				name: string
			}>
			saml: Readonly<{

				/** The name of the SAML attribute. */
				attribute_name: string

				/** The SAML attribute value to look for. */
				attribute_value: string

				/** The ID of your SAML identity provider. */
				identity_provider_id: string
			}>
			service_token: Readonly<{

				/** The ID of a Service Token. */
				token_id: string
			}>
		}>
	}>>
	saas_app: Output<Readonly<{

		/** The lifetime of the OIDC Access Token after creation. Valid units are m,h. Must be greater than or equal to 1m and less than or equal to 24h. */
		access_token_lifetime: string

		/** If client secret should be required on the token endpoint when authorization_code_with_pkce grant is used. */
		allow_pkce_without_client_secret: boolean

		/** The URL where this applications tile redirects users */
		app_launcher_url: string

		/** Optional identifier indicating the authentication protocol used for the saas app. Required for OIDC. Default if unset is "saml"
Available values: "saml", "oidc". */
		auth_type: string

		/** The application client id */
		client_id: string

		/** The application client secret, only returned on POST request. */
		client_secret: string

		/** The service provider's endpoint that is responsible for receiving and parsing a SAML assertion. */
		consumer_service_url: string
		created_at: string
		custom_attributes: Readonly<{

			/** The SAML FriendlyName of the attribute. */
			friendly_name?: string

			/** The name of the attribute. */
			name?: string

			/** A globally unique name for an identity or service provider.
Available values: "urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified", "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", "urn:oasis:names:tc:SAML:2.0:attrname-format:uri". */
			name_format?: string

			/** If the attribute is required when building a SAML assertion. */
			required?: boolean
			source: Readonly<{

				/** The name of the IdP attribute. */
				name?: string
				name_by_idp: Readonly<{

					/** The UID of the IdP. */
					idp_id?: string

					/** The name of the IdP provided attribute. */
					source_name?: string
				}>
			}>
		}>
		custom_claims: Readonly<{

			/** The name of the claim. */
			name?: string

			/** If the claim is required when building an OIDC token. */
			required?: boolean

			/** The scope of the claim.
Available values: "groups", "profile", "email", "openid". */
			scope?: string
			source: Readonly<{

				/** The name of the IdP claim. */
				name?: string

				/** A mapping from IdP ID to claim name. */
				name_by_idp?: Readonly<Record<string, string>>
			}>
		}>

		/** The URL that the user will be redirected to after a successful login for IDP initiated logins. */
		default_relay_state: string

		/** The OIDC flows supported by this application */
		grant_types: ReadonlyArray<string>

		/** A regex to filter Cloudflare groups returned in ID token and userinfo endpoint */
		group_filter_regex: string
		hybrid_and_implicit_options: Readonly<{

			/** If an Access Token should be returned from the OIDC Authorization endpoint */
			return_access_token_from_authorization_endpoint?: boolean

			/** If an ID Token should be returned from the OIDC Authorization endpoint */
			return_id_token_from_authorization_endpoint?: boolean
		}>

		/** The unique identifier for your SaaS application. */
		idp_entity_id: string

		/** The format of the name identifier sent to the SaaS application.
Available values: "id", "email". */
		name_id_format: string

		/** A [JSONata](https://jsonata.org/) expression that transforms an application's user identities into a NameID value for its SAML assertion. This expression should evaluate to a singular string. The output of this expression can override the `name_id_format` setting. */
		name_id_transform_jsonata: string

		/** The Access public certificate that will be used to verify your identity. */
		public_key: string

		/** The permitted URL's for Cloudflare to return Authorization codes and Access/ID tokens */
		redirect_uris: ReadonlyArray<string>
		refresh_token_options: Readonly<{

			/** How long a refresh token will be valid for after creation. Valid units are m,h,d. Must be longer than 1m. */
			lifetime?: string
		}>

		/** A [JSONata] (https://jsonata.org/) expression that transforms an application's user identities into attribute assertions in the SAML response. The expression can transform id, email, name, and groups values. It can also transform fields listed in the saml_attributes or oidc_fields of the identity provider used to authenticate. The output of this expression must be a JSON object. */
		saml_attribute_transform_jsonata: string

		/** Define the user information shared with access, "offline_access" scope will be automatically enabled if refresh tokens are enabled */
		scopes: ReadonlyArray<string>

		/** A globally unique name for an identity or service provider. */
		sp_entity_id: string

		/** The endpoint where your SaaS application will send login requests. */
		sso_endpoint: string
		updated_at: string
	}>>

	/** Sets the SameSite cookie setting, which provides increased security against CSRF attacks. */
	same_site_cookie_attribute: Output<string | undefined>
	scim_config: Output<Readonly<{
		authentication: Readonly<{

			/** URL used to generate the auth code used during token generation. */
			authorization_url?: string

			/** Client ID used to authenticate when generating a token for authenticating with the remote SCIM service. */
			client_id?: string

			/** Secret used to authenticate when generating a token for authenticating with the remove SCIM service. */
			client_secret?: string

			/** Password used to authenticate with the remote SCIM service. */
			password?: string

			/** The authentication scheme to use when making SCIM requests to this application.
Available values: "httpbasic". */
			scheme: string

			/** The authorization scopes to request when generating the token used to authenticate with the remove SCIM service. */
			scopes?: ReadonlyArray<string>

			/** Token used to authenticate with the remote SCIM service. */
			token?: string

			/** URL used to generate the token used to authenticate with the remote SCIM service. */
			token_url?: string

			/** User name used to authenticate with the remote SCIM service. */
			user?: string
		}>

		/** If false, propagates DELETE requests to the target application for SCIM resources. If true, sets 'active' to false on the SCIM resource. Note: Some targets do not support DELETE operations. */
		deactivate_on_delete: boolean

		/** Whether SCIM provisioning is turned on for this application. */
		enabled: boolean

		/** The UID of the IdP to use as the source for SCIM resources to provision to this application. */
		idp_uid: string
		mappings: Readonly<{

			/** Whether or not this mapping is enabled. */
			enabled?: boolean

			/** A [SCIM filter expression](https://datatracker.ietf.org/doc/html/rfc7644#section-3.4.2.2) that matches resources that should be provisioned to this application. */
			filter?: string
			operations: Readonly<{

				/** Whether or not this mapping applies to create (POST) operations. */
				create?: boolean

				/** Whether or not this mapping applies to DELETE operations. */
				delete?: boolean

				/** Whether or not this mapping applies to update (PATCH/PUT) operations. */
				update?: boolean
			}>

			/** Which SCIM resource type this mapping applies to. */
			schema: string

			/** The level of adherence to outbound resource schemas when provisioning to this mapping. ‘Strict’ removes unknown values, while ‘passthrough’ passes unknown values to the target.
Available values: "strict", "passthrough". */
			strictness?: string

			/** A [JSONata](https://jsonata.org/) expression that transforms the resource before provisioning it in the application. */
			transform_jsonata?: string
		}>

		/** The base URI for the application's SCIM-compatible API. */
		remote_uri: string
	}>>

	/** List of public domains that Access will secure. This field is deprecated in favor of `destinations` and will be supported until **November 21, 2025.** If `destinations` are provided, then `self_hosted_domains` will be ignored. */
	self_hosted_domains: ReadonlyArray<string>

	/** Returns a 401 status code when the request is blocked by a Service Auth policy. */
	service_auth_401_redirect: Output<boolean | undefined>

	/** The amount of time that tokens issued for this application will be valid. Must be in the format `300ms` or `2h45m`. Valid time units are: ns, us (or µs), ms, s, m, h. */
	session_duration: Output<string>

	/** Determines when to skip the App Launcher landing page. */
	skip_app_launcher_login_page: Output<boolean>

	/** Enables automatic authentication through cloudflared. */
	skip_interstitial: Output<boolean | undefined>

	/** The tags you want assigned to an application. Tags are used to filter applications in the App Launcher dashboard. */
	tags: ReadonlyArray<string>
	target_criteria: Output<Readonly<{

		/** The port that the targets use for the chosen communication protocol. A port cannot be assigned to multiple protocols. */
		port: number

		/** The communication protocol your application secures.
Available values: "ssh". */
		protocol: string

		/** Contains a map of target attribute keys to target attribute values. */
		target_attributes: Readonly<Record<string, ReadonlyArray<string>>>
	}>>

	/** The application type. */
	type: Output<string | undefined>
	updated_at: Output<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareArgoSmartRoutingProps = {

	/** Enables Argo Smart Routing.
Available values: "on", "off". */
	value: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareArgoSmartRouting = Readonly<{

	/** Identifier */
	id: Output<string>

	/** Enables Argo Smart Routing.
Available values: "on", "off". */
	value: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareMagicTransitSiteLanProps = {

	/** Identifier */
	account_id: Input<string>

	/** mark true to use this LAN for HA probing. only works for site with HA turned on. only one LAN can be set as the ha_link. */
	ha_link?: Input<boolean | undefined>
	name?: Input<string | undefined>
	nat?: Input<{

		/** A valid CIDR notation representing an IP range. */
		static_prefix?: Input<string | undefined>
	} | undefined>
	physport: Input<number>
	routed_subnets?: Input<{
		nat?: Input<{

			/** A valid CIDR notation representing an IP range. */
			static_prefix?: Input<string | undefined>
		} | undefined>

		/** A valid IPv4 address. */
		next_hop: Input<string>

		/** A valid CIDR notation representing an IP range. */
		prefix: Input<string>
	} | undefined>

	/** Identifier */
	site_id: Input<string>
	static_addressing?: Input<{

		/** A valid CIDR notation representing an IP range. */
		address: Input<string>
		dhcp_relay?: Input<{

			/** List of DHCP server IPs. */
			server_addresses?: Input<Array<Input<string>> | undefined>
		} | undefined>
		dhcp_server?: Input<{

			/** A valid IPv4 address. */
			dhcp_pool_end?: Input<string | undefined>

			/** A valid IPv4 address. */
			dhcp_pool_start?: Input<string | undefined>

			/** A valid IPv4 address. */
			dns_server?: Input<string | undefined>
			dns_servers?: Input<Array<Input<string>> | undefined>

			/** Mapping of MAC addresses to IP addresses */
			reservations?: Input<Record<string, Input<string>> | undefined>
		} | undefined>

		/** A valid CIDR notation representing an IP range. */
		secondary_address?: Input<string | undefined>

		/** A valid CIDR notation representing an IP range. */
		virtual_address?: Input<string | undefined>
	} | undefined>

	/** VLAN port number. */
	vlan_tag: Input<number>
}

type CloudflareMagicTransitSiteLan = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** mark true to use this LAN for HA probing. only works for site with HA turned on. only one LAN can be set as the ha_link. */
	ha_link: Output<boolean | undefined>

	/** Identifier */
	id: Output<string>
	name: Output<string | undefined>
	nat: Output<Readonly<{

		/** A valid CIDR notation representing an IP range. */
		static_prefix: string
	}>>
	physport: Output<number>
	routed_subnets: Output<Readonly<{
		nat: Readonly<{

			/** A valid CIDR notation representing an IP range. */
			static_prefix?: string
		}>

		/** A valid IPv4 address. */
		next_hop: string

		/** A valid CIDR notation representing an IP range. */
		prefix: string
	}>>

	/** Identifier */
	site_id: Output<string>
	static_addressing: Output<Readonly<{

		/** A valid CIDR notation representing an IP range. */
		address: string
		dhcp_relay: Readonly<{

			/** List of DHCP server IPs. */
			server_addresses?: ReadonlyArray<string>
		}>
		dhcp_server: Readonly<{

			/** A valid IPv4 address. */
			dhcp_pool_end?: string

			/** A valid IPv4 address. */
			dhcp_pool_start?: string

			/** A valid IPv4 address. */
			dns_server?: string
			dns_servers?: ReadonlyArray<string>

			/** Mapping of MAC addresses to IP addresses */
			reservations?: Readonly<Record<string, string>>
		}>

		/** A valid CIDR notation representing an IP range. */
		secondary_address: string

		/** A valid CIDR notation representing an IP range. */
		virtual_address: string
	}>>

	/** VLAN port number. */
	vlan_tag: Output<number>
}>

type CloudflareWorkersSecretProps = {

	/** Identifier */
	account_id: Input<string>

	/** Name of the Workers for Platforms dispatch namespace. */
	dispatch_namespace: Input<string>

	/** The name of this secret, this is what will be used to access it inside the Worker. */
	name: Input<string>

	/** Name of the script, used in URLs and route configuration. */
	script_name: Input<string>

	/** The value of the secret. */
	text?: Input<string | undefined>

	/** The type of secret to put.
Available values: "secret_text". */
	type?: Input<string | undefined>
}

type CloudflareWorkersSecret = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Name of the Workers for Platforms dispatch namespace. */
	dispatch_namespace: Output<string>

	/** The name of this secret, this is what will be used to access it inside the Worker. */
	id: Output<string>

	/** The name of this secret, this is what will be used to access it inside the Worker. */
	name: Output<string>

	/** Name of the script, used in URLs and route configuration. */
	script_name: Output<string>

	/** The value of the secret. */
	text: Output<string | undefined>

	/** The type of secret to put.
Available values: "secret_text". */
	type: Output<string | undefined>
}>

type CloudflareR2BucketProps = {

	/** Account ID */
	account_id: Input<string>

	/** Jurisdiction of the bucket */
	jurisdiction?: Input<string | undefined>

	/** Location of the bucket
Available values: "apac", "eeur", "enam", "weur", "wnam", "oc". */
	location?: Input<string | undefined>

	/** Name of the bucket */
	name: Input<string>

	/** Storage class for newly uploaded objects, unless specified otherwise.
Available values: "Standard", "InfrequentAccess". */
	storage_class?: Input<string | undefined>
}

type CloudflareR2Bucket = Readonly<{

	/** Account ID */
	account_id: Output<string>

	/** Creation timestamp */
	creation_date: Output<string>

	/** Name of the bucket */
	id: Output<string>

	/** Jurisdiction of the bucket */
	jurisdiction: Output<string>

	/** Location of the bucket
Available values: "apac", "eeur", "enam", "weur", "wnam", "oc". */
	location: Output<string | undefined>

	/** Name of the bucket */
	name: Output<string>

	/** Storage class for newly uploaded objects, unless specified otherwise.
Available values: "Standard", "InfrequentAccess". */
	storage_class: Output<string>
}>

type CloudflarePagesDomainProps = {

	/** Identifier */
	account_id: Input<string>
	name: Input<string>

	/** Name of the project. */
	project_name: Input<string>
}

type CloudflarePagesDomain = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Available values: "google", "lets_encrypt". */
	certificate_authority: Output<string>
	created_on: Output<string>
	domain_id: Output<string>
	id: Output<string>
	name: Output<string>

	/** Name of the project. */
	project_name: Output<string>

	/** Available values: "initializing", "pending", "active", "deactivated", "blocked", "error". */
	status: Output<string>
	validation_data: Output<Readonly<{
		error_message: string

		/** Available values: "http", "txt". */
		method: string

		/** Available values: "initializing", "pending", "active", "deactivated", "error". */
		status: string
		txt_name: string
		txt_value: string
	}>>
	verification_data: Output<Readonly<{
		error_message: string

		/** Available values: "pending", "active", "deactivated", "blocked", "error". */
		status: string
	}>>
	zone_tag: Output<string>
}>

type CloudflareDnsZoneTransfersAclProps = {
	account_id: Input<string>

	/** Allowed IPv4/IPv6 address range of primary or secondary nameservers. This will be applied for the entire account. The IP range is used to allow additional NOTIFY IPs for secondary zones and IPs Cloudflare allows AXFR/IXFR requests from for primary zones. CIDRs are limited to a maximum of /24 for IPv4 and /64 for IPv6 respectively. */
	ip_range: Input<string>

	/** The name of the acl. */
	name: Input<string>
}

type CloudflareDnsZoneTransfersAcl = Readonly<{
	account_id: Output<string>
	id: Output<string>

	/** Allowed IPv4/IPv6 address range of primary or secondary nameservers. This will be applied for the entire account. The IP range is used to allow additional NOTIFY IPs for secondary zones and IPs Cloudflare allows AXFR/IXFR requests from for primary zones. CIDRs are limited to a maximum of /24 for IPv4 and /64 for IPv6 respectively. */
	ip_range: Output<string>

	/** The name of the acl. */
	name: Output<string>
}>

type CloudflareStreamLiveInputProps = {

	/** Identifier */
	account_id: Input<string>

	/** Sets the creator ID asssociated with this live input. */
	default_creator?: Input<string | undefined>

	/** Indicates the number of days after which the live inputs recordings will be deleted. When a stream completes and the recording is ready, the value is used to calculate a scheduled deletion date for that recording. Omit the field to indicate no change, or include with a `null` value to remove an existing scheduled deletion. */
	delete_recording_after_days?: Input<number | undefined>

	/** A unique identifier for a live input. */
	live_input_identifier?: Input<string | undefined>

	/** A user modifiable key-value store used to reference other systems of record for managing live inputs. */
	meta?: Input<string | undefined>
	recording?: Input<{

		/** Lists the origins allowed to display videos created with this input. Enter allowed origin domains in an array and use `*` for wildcard subdomains. An empty array allows videos to be viewed on any origin. */
		allowed_origins?: Input<Array<Input<string>> | undefined>

		/** Disables reporting the number of live viewers when this property is set to `true`. */
		hide_live_viewer_count?: Input<boolean | undefined>

		/** Specifies the recording behavior for the live input. Set this value to `off` to prevent a recording. Set the value to `automatic` to begin a recording and transition to on-demand after Stream Live stops receiving input.
Available values: "off", "automatic". */
		mode?: Input<string | undefined>

		/** Indicates if a video using the live input has the `requireSignedURLs` property set. Also enforces access controls on any video recording of the livestream with the live input. */
		require_signed_urls?: Input<boolean | undefined>

		/** Determines the amount of time a live input configured in `automatic` mode should wait before a recording transitions from live to on-demand. `0` is recommended for most use cases and indicates the platform default should be used. */
		timeout_seconds?: Input<number | undefined>
	} | undefined>
}

type CloudflareStreamLiveInput = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The date and time the live input was created. */
	created: Output<string>

	/** Sets the creator ID asssociated with this live input. */
	default_creator: Output<string | undefined>

	/** Indicates the number of days after which the live inputs recordings will be deleted. When a stream completes and the recording is ready, the value is used to calculate a scheduled deletion date for that recording. Omit the field to indicate no change, or include with a `null` value to remove an existing scheduled deletion. */
	delete_recording_after_days: Output<number | undefined>

	/** A unique identifier for a live input. */
	live_input_identifier: Output<string | undefined>

	/** A user modifiable key-value store used to reference other systems of record for managing live inputs. */
	meta: Output<string | undefined>

	/** The date and time the live input was last modified. */
	modified: Output<string>
	recording: Output<Readonly<{

		/** Lists the origins allowed to display videos created with this input. Enter allowed origin domains in an array and use `*` for wildcard subdomains. An empty array allows videos to be viewed on any origin. */
		allowed_origins: ReadonlyArray<string>

		/** Disables reporting the number of live viewers when this property is set to `true`. */
		hide_live_viewer_count: boolean

		/** Specifies the recording behavior for the live input. Set this value to `off` to prevent a recording. Set the value to `automatic` to begin a recording and transition to on-demand after Stream Live stops receiving input.
Available values: "off", "automatic". */
		mode: string

		/** Indicates if a video using the live input has the `requireSignedURLs` property set. Also enforces access controls on any video recording of the livestream with the live input. */
		require_signed_urls: boolean

		/** Determines the amount of time a live input configured in `automatic` mode should wait before a recording transitions from live to on-demand. `0` is recommended for most use cases and indicates the platform default should be used. */
		timeout_seconds: number
	}>>
	rtmps: Output<Readonly<{

		/** The secret key to use when streaming via RTMPS to a live input. */
		stream_key: string

		/** The RTMPS URL you provide to the broadcaster, which they stream live video to. */
		url: string
	}>>
	rtmps_playback: Output<Readonly<{

		/** The secret key to use for playback via RTMPS. */
		stream_key: string

		/** The URL used to play live video over RTMPS. */
		url: string
	}>>
	srt: Output<Readonly<{

		/** The secret key to use when streaming via SRT to a live input. */
		passphrase: string

		/** The identifier of the live input to use when streaming via SRT. */
		stream_id: string

		/** The SRT URL you provide to the broadcaster, which they stream live video to. */
		url: string
	}>>
	srt_playback: Output<Readonly<{

		/** The secret key to use for playback via SRT. */
		passphrase: string

		/** The identifier of the live input to use for playback via SRT. */
		stream_id: string

		/** The URL used to play live video over SRT. */
		url: string
	}>>

	/** The connection status of a live input.
Available values: "connected", "reconnected", "reconnecting", "client_disconnect", "ttl_exceeded", "failed_to_connect", "failed_to_reconnect", "new_configuration_accepted". */
	status: Output<string>

	/** A unique identifier for a live input. */
	uid: Output<string>
	web_rtc: Output<Readonly<{

		/** The WebRTC URL you provide to the broadcaster, which they stream live video to. */
		url: string
	}>>
	web_rtc_playback: Output<Readonly<{

		/** The URL used to play live video over WebRTC. */
		url: string
	}>>
}>

type CloudflareZoneLockdownProps = {
	configurations: Input<{

		/** The configuration target. You must set the target to `ip` when specifying an IP address in the Zone Lockdown rule.
Available values: "ip". */
		target?: Input<string | undefined>

		/** The IP address to match. This address will be compared to the IP address of incoming requests. */
		value?: Input<string | undefined>
	}>

	/** The URLs to include in the current WAF override. You can use wildcards. Each entered URL will be escaped before use, which means you can only use simple wildcard patterns. */
	urls: Input<Array<Input<string>>>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareZoneLockdown = Readonly<{
	configurations: Output<Readonly<{

		/** The configuration target. You must set the target to `ip` when specifying an IP address in the Zone Lockdown rule.
Available values: "ip". */
		target: string

		/** The IP address to match. This address will be compared to the IP address of incoming requests. */
		value: string
	}>>

	/** The timestamp of when the rule was created. */
	created_on: Output<string>

	/** An informative summary of the rule. */
	description: Output<string>

	/** The unique identifier of the Zone Lockdown rule. */
	id: Output<string>

	/** The timestamp of when the rule was last modified. */
	modified_on: Output<string>

	/** When true, indicates that the rule is currently paused. */
	paused: Output<boolean>

	/** The URLs to include in the current WAF override. You can use wildcards. Each entered URL will be escaped before use, which means you can only use simple wildcard patterns. */
	urls: ReadonlyArray<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareMagicWanIpsecTunnelProps = {

	/** Identifier */
	account_id: Input<string>

	/** The IP address assigned to the Cloudflare side of the IPsec tunnel. */
	cloudflare_endpoint: Input<string>

	/** The IP address assigned to the customer side of the IPsec tunnel. Not required, but must be set for proactive traceroutes to work. */
	customer_endpoint?: Input<string | undefined>

	/** An optional description forthe IPsec tunnel. */
	description?: Input<string | undefined>
	health_check?: Input<{

		/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
		direction?: Input<string | undefined>

		/** Determines whether to run healthchecks for a tunnel. */
		enabled?: Input<boolean | undefined>

		/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
		rate?: Input<string | undefined>
		target?: Input<{

			/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
			saved?: Input<string | undefined>
		} | undefined>

		/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
		type?: Input<string | undefined>
	} | undefined>

	/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
	interface_address: Input<string>

	/** Identifier */
	ipsec_tunnel_id?: Input<string | undefined>

	/** The name of the IPsec tunnel. The name cannot share a name with other tunnels. */
	name: Input<string>

	/** A randomly generated or provided string for use in the IPsec tunnel. */
	psk?: Input<string | undefined>

	/** If `true`, then IPsec replay protection will be supported in the Cloudflare-to-customer direction. */
	replay_protection?: Input<boolean | undefined>
}

type CloudflareMagicWanIpsecTunnel = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The IP address assigned to the Cloudflare side of the IPsec tunnel. */
	cloudflare_endpoint: Output<string>

	/** The IP address assigned to the customer side of the IPsec tunnel. Not required, but must be set for proactive traceroutes to work. */
	customer_endpoint: Output<string | undefined>

	/** An optional description forthe IPsec tunnel. */
	description: Output<string | undefined>
	health_check: Output<Readonly<{

		/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
		direction: string

		/** Determines whether to run healthchecks for a tunnel. */
		enabled: boolean

		/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
		rate: string
		target: Readonly<{

			/** The effective health check target. If 'saved' is empty, then this field will be populated with the calculated default value on GET requests. Ignored in POST, PUT, and PATCH requests. */
			effective: string

			/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
			saved?: string
		}>

		/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
		type: string
	}>>

	/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
	interface_address: Output<string>
	ipsec_tunnel: Output<Readonly<{

		/** When `true`, the tunnel can use a null-cipher (`ENCR_NULL`) in the ESP tunnel (Phase 2). */
		allow_null_cipher: boolean

		/** The IP address assigned to the Cloudflare side of the IPsec tunnel. */
		cloudflare_endpoint: string

		/** The date and time the tunnel was created. */
		created_on: string

		/** The IP address assigned to the customer side of the IPsec tunnel. Not required, but must be set for proactive traceroutes to work. */
		customer_endpoint: string

		/** An optional description forthe IPsec tunnel. */
		description: string
		health_check: Readonly<{

			/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
			direction: string

			/** Determines whether to run healthchecks for a tunnel. */
			enabled: boolean

			/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
			rate: string
			target: Readonly<{

				/** The effective health check target. If 'saved' is empty, then this field will be populated with the calculated default value on GET requests. Ignored in POST, PUT, and PATCH requests. */
				effective: string

				/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
				saved: string
			}>

			/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
			type: string
		}>

		/** Tunnel identifier tag. */
		id: string

		/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
		interface_address: string

		/** The date and time the tunnel was last modified. */
		modified_on: string

		/** The name of the IPsec tunnel. The name cannot share a name with other tunnels. */
		name: string
		psk_metadata: Readonly<{

			/** The date and time the tunnel was last modified. */
			last_generated_on: string
		}>

		/** If `true`, then IPsec replay protection will be supported in the Cloudflare-to-customer direction. */
		replay_protection: boolean
	}>>

	/** Identifier */
	ipsec_tunnel_id: Output<string | undefined>
	ipsec_tunnels: Output<Readonly<{

		/** When `true`, the tunnel can use a null-cipher (`ENCR_NULL`) in the ESP tunnel (Phase 2). */
		allow_null_cipher: boolean

		/** The IP address assigned to the Cloudflare side of the IPsec tunnel. */
		cloudflare_endpoint: string

		/** The date and time the tunnel was created. */
		created_on: string

		/** The IP address assigned to the customer side of the IPsec tunnel. Not required, but must be set for proactive traceroutes to work. */
		customer_endpoint: string

		/** An optional description forthe IPsec tunnel. */
		description: string
		health_check: Readonly<{

			/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
			direction: string

			/** Determines whether to run healthchecks for a tunnel. */
			enabled: boolean

			/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
			rate: string
			target: Readonly<{

				/** The effective health check target. If 'saved' is empty, then this field will be populated with the calculated default value on GET requests. Ignored in POST, PUT, and PATCH requests. */
				effective: string

				/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
				saved: string
			}>

			/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
			type: string
		}>

		/** Tunnel identifier tag. */
		id: string

		/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
		interface_address: string

		/** The date and time the tunnel was last modified. */
		modified_on: string

		/** The name of the IPsec tunnel. The name cannot share a name with other tunnels. */
		name: string
		psk_metadata: Readonly<{

			/** The date and time the tunnel was last modified. */
			last_generated_on: string
		}>

		/** If `true`, then IPsec replay protection will be supported in the Cloudflare-to-customer direction. */
		replay_protection: boolean
	}>>
	modified: Output<boolean>
	modified_ipsec_tunnel: Output<Readonly<{

		/** When `true`, the tunnel can use a null-cipher (`ENCR_NULL`) in the ESP tunnel (Phase 2). */
		allow_null_cipher: boolean

		/** The IP address assigned to the Cloudflare side of the IPsec tunnel. */
		cloudflare_endpoint: string

		/** The date and time the tunnel was created. */
		created_on: string

		/** The IP address assigned to the customer side of the IPsec tunnel. Not required, but must be set for proactive traceroutes to work. */
		customer_endpoint: string

		/** An optional description forthe IPsec tunnel. */
		description: string
		health_check: Readonly<{

			/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
			direction: string

			/** Determines whether to run healthchecks for a tunnel. */
			enabled: boolean

			/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
			rate: string
			target: Readonly<{

				/** The effective health check target. If 'saved' is empty, then this field will be populated with the calculated default value on GET requests. Ignored in POST, PUT, and PATCH requests. */
				effective: string

				/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
				saved: string
			}>

			/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
			type: string
		}>

		/** Tunnel identifier tag. */
		id: string

		/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
		interface_address: string

		/** The date and time the tunnel was last modified. */
		modified_on: string

		/** The name of the IPsec tunnel. The name cannot share a name with other tunnels. */
		name: string
		psk_metadata: Readonly<{

			/** The date and time the tunnel was last modified. */
			last_generated_on: string
		}>

		/** If `true`, then IPsec replay protection will be supported in the Cloudflare-to-customer direction. */
		replay_protection: boolean
	}>>

	/** The name of the IPsec tunnel. The name cannot share a name with other tunnels. */
	name: Output<string>

	/** A randomly generated or provided string for use in the IPsec tunnel. */
	psk: Output<string | undefined>

	/** If `true`, then IPsec replay protection will be supported in the Cloudflare-to-customer direction. */
	replay_protection: Output<boolean>
}>

type CloudflareAuthenticatedOriginPullsProps = {
	config: Input<{

		/** Certificate identifier tag. */
		cert_id?: Input<string | undefined>

		/** Indicates whether hostname-level authenticated origin pulls is enabled. A null value voids the association. */
		enabled?: Input<boolean | undefined>

		/** The hostname on the origin for which the client certificate uploaded will be used. */
		hostname?: Input<string | undefined>
	}>

	/** The hostname on the origin for which the client certificate uploaded will be used. */
	hostname?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareAuthenticatedOriginPulls = Readonly<{

	/** Identifier */
	cert_id: Output<string>

	/** Status of the certificate or the association.
Available values: "initializing", "pending_deployment", "pending_deletion", "active", "deleted", "deployment_timed_out", "deletion_timed_out". */
	cert_status: Output<string>

	/** The time when the certificate was updated. */
	cert_updated_at: Output<string>

	/** The time when the certificate was uploaded. */
	cert_uploaded_on: Output<string>

	/** The hostname certificate. */
	certificate: Output<string>
	config: Output<Readonly<{

		/** Certificate identifier tag. */
		cert_id: string

		/** Indicates whether hostname-level authenticated origin pulls is enabled. A null value voids the association. */
		enabled: boolean

		/** The hostname on the origin for which the client certificate uploaded will be used. */
		hostname: string
	}>>

	/** The time when the certificate was created. */
	created_at: Output<string>

	/** Indicates whether hostname-level authenticated origin pulls is enabled. A null value voids the association. */
	enabled: Output<boolean>

	/** The date when the certificate expires. */
	expires_on: Output<string>

	/** The hostname on the origin for which the client certificate uploaded will be used. */
	hostname: Output<string | undefined>

	/** Identifier */
	id: Output<string>

	/** The certificate authority that issued the certificate. */
	issuer: Output<string>

	/** The hostname certificate's private key. */
	private_key: Output<string>

	/** The serial number on the uploaded certificate. */
	serial_number: Output<string>

	/** The type of hash used for the certificate. */
	signature: Output<string>

	/** Status of the certificate or the association.
Available values: "initializing", "pending_deployment", "pending_deletion", "active", "deleted", "deployment_timed_out", "deletion_timed_out". */
	status: Output<string>

	/** The time when the certificate was updated. */
	updated_at: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareLeakedCredentialCheckProps = {

	/** Whether or not Leaked Credential Checks are enabled */
	enabled?: Input<boolean | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareLeakedCredentialCheck = Readonly<{

	/** Whether or not Leaked Credential Checks are enabled */
	enabled: Output<boolean | undefined>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustOrganizationProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** When set to true, users can authenticate via WARP for any application in your organization. Application settings will take precedence over this value. */
	allow_authenticate_via_warp?: Input<boolean | undefined>

	/** The unique subdomain assigned to your Zero Trust organization. */
	auth_domain?: Input<string | undefined>

	/** When set to `true`, users skip the identity provider selection step during login. */
	auto_redirect_to_identity?: Input<boolean | undefined>
	custom_pages?: Input<{

		/** The uid of the custom page to use when a user is denied access after failing a non-identity rule. */
		forbidden?: Input<string | undefined>

		/** The uid of the custom page to use when a user is denied access. */
		identity_denied?: Input<string | undefined>
	} | undefined>

	/** Lock all settings as Read-Only in the Dashboard, regardless of user permission. Updates may only be made via the API or Terraform for this account when enabled. */
	is_ui_read_only?: Input<boolean | undefined>
	login_design?: Input<{

		/** The background color on your login page. */
		background_color?: Input<string | undefined>

		/** The text at the bottom of your login page. */
		footer_text?: Input<string | undefined>

		/** The text at the top of your login page. */
		header_text?: Input<string | undefined>

		/** The URL of the logo on your login page. */
		logo_path?: Input<string | undefined>

		/** The text color on your login page. */
		text_color?: Input<string | undefined>
	} | undefined>

	/** The name of your Zero Trust organization. */
	name?: Input<string | undefined>

	/** The amount of time that tokens issued for applications will be valid. Must be in the format `300ms` or `2h45m`. Valid time units are: ns, us (or µs), ms, s, m, h. */
	session_duration?: Input<string | undefined>

	/** A description of the reason why the UI read only field is being toggled. */
	ui_read_only_toggle_reason?: Input<string | undefined>

	/** The amount of time a user seat is inactive before it expires. When the user seat exceeds the set time of inactivity, the user is removed as an active seat and no longer counts against your Teams seat count.  Minimum value for this setting is 1 month (730h). Must be in the format `300ms` or `2h45m`. Valid time units are: `ns`, `us` (or `µs`), `ms`, `s`, `m`, `h`. */
	user_seat_expiration_inactive_time?: Input<string | undefined>

	/** The amount of time that tokens issued for applications will be valid. Must be in the format `30m` or `2h45m`. Valid time units are: m, h. */
	warp_auth_session_duration?: Input<string | undefined>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareZeroTrustOrganization = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** When set to true, users can authenticate via WARP for any application in your organization. Application settings will take precedence over this value. */
	allow_authenticate_via_warp: Output<boolean | undefined>

	/** The unique subdomain assigned to your Zero Trust organization. */
	auth_domain: Output<string | undefined>

	/** When set to `true`, users skip the identity provider selection step during login. */
	auto_redirect_to_identity: Output<boolean>
	created_at: Output<string>
	custom_pages: Output<Readonly<{

		/** The uid of the custom page to use when a user is denied access after failing a non-identity rule. */
		forbidden: string

		/** The uid of the custom page to use when a user is denied access. */
		identity_denied: string
	}>>

	/** Lock all settings as Read-Only in the Dashboard, regardless of user permission. Updates may only be made via the API or Terraform for this account when enabled. */
	is_ui_read_only: Output<boolean | undefined>
	login_design: Output<Readonly<{

		/** The background color on your login page. */
		background_color: string

		/** The text at the bottom of your login page. */
		footer_text: string

		/** The text at the top of your login page. */
		header_text: string

		/** The URL of the logo on your login page. */
		logo_path: string

		/** The text color on your login page. */
		text_color: string
	}>>

	/** The name of your Zero Trust organization. */
	name: Output<string | undefined>

	/** The amount of time that tokens issued for applications will be valid. Must be in the format `300ms` or `2h45m`. Valid time units are: ns, us (or µs), ms, s, m, h. */
	session_duration: Output<string | undefined>

	/** A description of the reason why the UI read only field is being toggled. */
	ui_read_only_toggle_reason: Output<string | undefined>
	updated_at: Output<string>

	/** The amount of time a user seat is inactive before it expires. When the user seat exceeds the set time of inactivity, the user is removed as an active seat and no longer counts against your Teams seat count.  Minimum value for this setting is 1 month (730h). Must be in the format `300ms` or `2h45m`. Valid time units are: `ns`, `us` (or `µs`), `ms`, `s`, `m`, `h`. */
	user_seat_expiration_inactive_time: Output<string | undefined>

	/** The amount of time that tokens issued for applications will be valid. Must be in the format `30m` or `2h45m`. Valid time units are: m, h. */
	warp_auth_session_duration: Output<string | undefined>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareLoadBalancerProps = {
	adaptive_routing?: Input<{

		/** Extends zero-downtime failover of requests to healthy origins from alternate pools, when no healthy alternate exists in the same pool, according to the failover order defined by traffic and origin steering. When set false (the default) zero-downtime failover will only occur between origins within the same pool. See `session_affinity_attributes` for control over when sessions are broken or reassigned. */
		failover_across_pools?: Input<boolean | undefined>
	} | undefined>

	/** A mapping of country codes to a list of pool IDs (ordered by their failover priority) for the given country. Any country not explicitly defined will fall back to using the corresponding region_pool mapping if it exists else to default_pools. */
	country_pools?: Input<Record<string, Input<Array<Input<string>>>> | undefined>

	/** A list of pool IDs ordered by their failover priority. Pools defined here are used by default, or when region_pools are not configured for a given region. */
	default_pools: Input<Array<Input<string>>>

	/** Object description. */
	description?: Input<string | undefined>

	/** Whether to enable (the default) this load balancer. */
	enabled?: Input<boolean | undefined>

	/** The pool ID to use when all other pools are detected as unhealthy. */
	fallback_pool: Input<string>
	location_strategy?: Input<{

		/** Determines the authoritative location when ECS is not preferred, does not exist in the request, or its GeoIP lookup is unsuccessful.
- `"pop"`: Use the Cloudflare PoP location.
- `"resolver_ip"`: Use the DNS resolver GeoIP location. If the GeoIP lookup is unsuccessful, use the Cloudflare PoP location.
Available values: "pop", "resolver_ip". */
		mode?: Input<string | undefined>

		/** Whether the EDNS Client Subnet (ECS) GeoIP should be preferred as the authoritative location.
- `"always"`: Always prefer ECS.
- `"never"`: Never prefer ECS.
- `"proximity"`: Prefer ECS only when `steering_policy="proximity"`.
- `"geo"`: Prefer ECS only when `steering_policy="geo"`.
Available values: "always", "never", "proximity", "geo". */
		prefer_ecs?: Input<string | undefined>
	} | undefined>

	/** The DNS hostname to associate with your Load Balancer. If this hostname already exists as a DNS record in Cloudflare's DNS, the Load Balancer will take precedence and the DNS record will not be used. */
	name: Input<string>

	/** List of networks where Load Balancer or Pool is enabled. */
	networks?: Input<Array<Input<string>> | undefined>

	/** (Enterprise only): A mapping of Cloudflare PoP identifiers to a list of pool IDs (ordered by their failover priority) for the PoP (datacenter). Any PoPs not explicitly defined will fall back to using the corresponding country_pool, then region_pool mapping if it exists else to default_pools. */
	pop_pools?: Input<Record<string, Input<Array<Input<string>>>> | undefined>

	/** Whether the hostname should be gray clouded (false) or orange clouded (true). */
	proxied?: Input<boolean | undefined>
	random_steering?: Input<{

		/** The default weight for pools in the load balancer that are not specified in the pool_weights map. */
		default_weight?: Input<number | undefined>

		/** A mapping of pool IDs to custom weights. The weight is relative to other pools in the load balancer. */
		pool_weights?: Input<Record<string, Input<number>> | undefined>
	} | undefined>

	/** A mapping of region codes to a list of pool IDs (ordered by their failover priority) for the given region. Any regions not explicitly defined will fall back to using default_pools. */
	region_pools?: Input<Record<string, Input<Array<Input<string>>>> | undefined>
	rules?: Input<{

		/** The condition expressions to evaluate. If the condition evaluates to true, the overrides or fixed_response in this rule will be applied. An empty condition is always true. For more details on condition expressions, please see https://developers.cloudflare.com/load-balancing/understand-basics/load-balancing-rules/expressions. */
		condition?: Input<string | undefined>

		/** Disable this specific rule. It will no longer be evaluated by this load balancer. */
		disabled?: Input<boolean | undefined>
		fixed_response?: Input<{

			/** The http 'Content-Type' header to include in the response. */
			content_type?: Input<string | undefined>

			/** The http 'Location' header to include in the response. */
			location?: Input<string | undefined>

			/** Text to include as the http body. */
			message_body?: Input<string | undefined>

			/** The http status code to respond with. */
			status_code?: Input<number | undefined>
		} | undefined>

		/** Name of this rule. Only used for human readability. */
		name?: Input<string | undefined>
		overrides?: Input<{
			adaptive_routing?: Input<{

				/** Extends zero-downtime failover of requests to healthy origins from alternate pools, when no healthy alternate exists in the same pool, according to the failover order defined by traffic and origin steering. When set false (the default) zero-downtime failover will only occur between origins within the same pool. See `session_affinity_attributes` for control over when sessions are broken or reassigned. */
				failover_across_pools?: Input<boolean | undefined>
			} | undefined>

			/** A mapping of country codes to a list of pool IDs (ordered by their failover priority) for the given country. Any country not explicitly defined will fall back to using the corresponding region_pool mapping if it exists else to default_pools. */
			country_pools?: Input<Record<string, Input<Array<Input<string>>>> | undefined>

			/** A list of pool IDs ordered by their failover priority. Pools defined here are used by default, or when region_pools are not configured for a given region. */
			default_pools?: Input<Array<Input<string>> | undefined>

			/** The pool ID to use when all other pools are detected as unhealthy. */
			fallback_pool?: Input<string | undefined>
			location_strategy?: Input<{

				/** Determines the authoritative location when ECS is not preferred, does not exist in the request, or its GeoIP lookup is unsuccessful.
- `"pop"`: Use the Cloudflare PoP location.
- `"resolver_ip"`: Use the DNS resolver GeoIP location. If the GeoIP lookup is unsuccessful, use the Cloudflare PoP location.
Available values: "pop", "resolver_ip". */
				mode?: Input<string | undefined>

				/** Whether the EDNS Client Subnet (ECS) GeoIP should be preferred as the authoritative location.
- `"always"`: Always prefer ECS.
- `"never"`: Never prefer ECS.
- `"proximity"`: Prefer ECS only when `steering_policy="proximity"`.
- `"geo"`: Prefer ECS only when `steering_policy="geo"`.
Available values: "always", "never", "proximity", "geo". */
				prefer_ecs?: Input<string | undefined>
			} | undefined>

			/** (Enterprise only): A mapping of Cloudflare PoP identifiers to a list of pool IDs (ordered by their failover priority) for the PoP (datacenter). Any PoPs not explicitly defined will fall back to using the corresponding country_pool, then region_pool mapping if it exists else to default_pools. */
			pop_pools?: Input<Record<string, Input<Array<Input<string>>>> | undefined>
			random_steering?: Input<{

				/** The default weight for pools in the load balancer that are not specified in the pool_weights map. */
				default_weight?: Input<number | undefined>

				/** A mapping of pool IDs to custom weights. The weight is relative to other pools in the load balancer. */
				pool_weights?: Input<Record<string, Input<number>> | undefined>
			} | undefined>

			/** A mapping of region codes to a list of pool IDs (ordered by their failover priority) for the given region. Any regions not explicitly defined will fall back to using default_pools. */
			region_pools?: Input<Record<string, Input<Array<Input<string>>>> | undefined>

			/** Specifies the type of session affinity the load balancer should use unless specified as `"none"`. The supported types are:
- `"cookie"`: On the first request to a proxied load balancer, a cookie is generated, encoding information of which origin the request will be forwarded to. Subsequent requests, by the same client to the same load balancer, will be sent to the origin server the cookie encodes, for the duration of the cookie and as long as the origin server remains healthy. If the cookie has expired or the origin server is unhealthy, then a new origin server is calculated and used.
- `"ip_cookie"`: Behaves the same as `"cookie"` except the initial origin selection is stable and based on the client's ip address.
- `"header"`: On the first request to a proxied load balancer, a session key based on the configured HTTP headers (see `session_affinity_attributes.headers`) is generated, encoding the request headers used for storing in the load balancer session state which origin the request will be forwarded to. Subsequent requests to the load balancer with the same headers will be sent to the same origin server, for the duration of the session and as long as the origin server remains healthy. If the session has been idle for the duration of `session_affinity_ttl` seconds or the origin server is unhealthy, then a new origin server is calculated and used. See `headers` in `session_affinity_attributes` for additional required configuration.
Available values: "none", "cookie", "ip_cookie", "header". */
			session_affinity?: Input<string | undefined>
			session_affinity_attributes?: Input<{

				/** Configures the drain duration in seconds. This field is only used when session affinity is enabled on the load balancer. */
				drain_duration?: Input<number | undefined>

				/** Configures the names of HTTP headers to base session affinity on when header `session_affinity` is enabled. At least one HTTP header name must be provided. To specify the exact cookies to be used, include an item in the following format: `"cookie:<cookie-name-1>,<cookie-name-2>"` (example) where everything after the colon is a comma-separated list of cookie names. Providing only `"cookie"` will result in all cookies being used. The default max number of HTTP header names that can be provided depends on your plan: 5 for Enterprise, 1 for all other plans. */
				headers?: Input<Array<Input<string>> | undefined>

				/** When header `session_affinity` is enabled, this option can be used to specify how HTTP headers on load balancing requests will be used. The supported values are:
- `"true"`: Load balancing requests must contain *all* of the HTTP headers specified by the `headers` session affinity attribute, otherwise sessions aren't created.
- `"false"`: Load balancing requests must contain *at least one* of the HTTP headers specified by the `headers` session affinity attribute, otherwise sessions aren't created. */
				require_all_headers?: Input<boolean | undefined>

				/** Configures the SameSite attribute on session affinity cookie. Value "Auto" will be translated to "Lax" or "None" depending if Always Use HTTPS is enabled. Note: when using value "None", the secure attribute can not be set to "Never".
Available values: "Auto", "Lax", "None", "Strict". */
				samesite?: Input<string | undefined>

				/** Configures the Secure attribute on session affinity cookie. Value "Always" indicates the Secure attribute will be set in the Set-Cookie header, "Never" indicates the Secure attribute will not be set, and "Auto" will set the Secure attribute depending if Always Use HTTPS is enabled.
Available values: "Auto", "Always", "Never". */
				secure?: Input<string | undefined>

				/** Configures the zero-downtime failover between origins within a pool when session affinity is enabled. This feature is currently incompatible with Argo, Tiered Cache, and Bandwidth Alliance. The supported values are:
- `"none"`: No failover takes place for sessions pinned to the origin (default).
- `"temporary"`: Traffic will be sent to another other healthy origin until the originally pinned origin is available; note that this can potentially result in heavy origin flapping.
- `"sticky"`: The session affinity cookie is updated and subsequent requests are sent to the new origin. Note: Zero-downtime failover with sticky sessions is currently not supported for session affinity by header.
Available values: "none", "temporary", "sticky". */
				zero_downtime_failover?: Input<string | undefined>
			} | undefined>

			/** Time, in seconds, until a client's session expires after being created. Once the expiry time has been reached, subsequent requests may get sent to a different origin server. The accepted ranges per `session_affinity` policy are:
- `"cookie"` / `"ip_cookie"`: The current default of 23 hours will be used unless explicitly set. The accepted range of values is between [1800, 604800].
- `"header"`: The current default of 1800 seconds will be used unless explicitly set. The accepted range of values is between [30, 3600]. Note: With session affinity by header, sessions only expire after they haven't been used for the number of seconds specified. */
			session_affinity_ttl?: Input<number | undefined>

			/** Steering Policy for this load balancer.
- `"off"`: Use `default_pools`.
- `"geo"`: Use `region_pools`/`country_pools`/`pop_pools`. For non-proxied requests, the country for `country_pools` is determined by `location_strategy`.
- `"random"`: Select a pool randomly.
- `"dynamic_latency"`: Use round trip time to select the closest pool in default_pools (requires pool health checks).
- `"proximity"`: Use the pools' latitude and longitude to select the closest pool using the Cloudflare PoP location for proxied requests or the location determined by `location_strategy` for non-proxied requests.
- `"least_outstanding_requests"`: Select a pool by taking into consideration `random_steering` weights, as well as each pool's number of outstanding requests. Pools with more pending requests are weighted proportionately less relative to others.
- `"least_connections"`: Select a pool by taking into consideration `random_steering` weights, as well as each pool's number of open connections. Pools with more open connections are weighted proportionately less relative to others. Supported for HTTP/1 and HTTP/2 connections.
- `""`: Will map to `"geo"` if you use `region_pools`/`country_pools`/`pop_pools` otherwise `"off"`.
Available values: "off", "geo", "random", "dynamic_latency", "proximity", "least_outstanding_requests", "least_connections", "". */
			steering_policy?: Input<string | undefined>

			/** Time to live (TTL) of the DNS entry for the IP address returned by this load balancer. This only applies to gray-clouded (unproxied) load balancers. */
			ttl?: Input<number | undefined>
		} | undefined>

		/** The order in which rules should be executed in relation to each other. Lower values are executed first. Values do not need to be sequential. If no value is provided for any rule the array order of the rules field will be used to assign a priority. */
		priority?: Input<number | undefined>

		/** If this rule's condition is true, this causes rule evaluation to stop after processing this rule. */
		terminates?: Input<boolean | undefined>
	} | undefined>

	/** Specifies the type of session affinity the load balancer should use unless specified as `"none"`. The supported types are:
- `"cookie"`: On the first request to a proxied load balancer, a cookie is generated, encoding information of which origin the request will be forwarded to. Subsequent requests, by the same client to the same load balancer, will be sent to the origin server the cookie encodes, for the duration of the cookie and as long as the origin server remains healthy. If the cookie has expired or the origin server is unhealthy, then a new origin server is calculated and used.
- `"ip_cookie"`: Behaves the same as `"cookie"` except the initial origin selection is stable and based on the client's ip address.
- `"header"`: On the first request to a proxied load balancer, a session key based on the configured HTTP headers (see `session_affinity_attributes.headers`) is generated, encoding the request headers used for storing in the load balancer session state which origin the request will be forwarded to. Subsequent requests to the load balancer with the same headers will be sent to the same origin server, for the duration of the session and as long as the origin server remains healthy. If the session has been idle for the duration of `session_affinity_ttl` seconds or the origin server is unhealthy, then a new origin server is calculated and used. See `headers` in `session_affinity_attributes` for additional required configuration.
Available values: "none", "cookie", "ip_cookie", "header". */
	session_affinity?: Input<string | undefined>
	session_affinity_attributes?: Input<{

		/** Configures the drain duration in seconds. This field is only used when session affinity is enabled on the load balancer. */
		drain_duration?: Input<number | undefined>

		/** Configures the names of HTTP headers to base session affinity on when header `session_affinity` is enabled. At least one HTTP header name must be provided. To specify the exact cookies to be used, include an item in the following format: `"cookie:<cookie-name-1>,<cookie-name-2>"` (example) where everything after the colon is a comma-separated list of cookie names. Providing only `"cookie"` will result in all cookies being used. The default max number of HTTP header names that can be provided depends on your plan: 5 for Enterprise, 1 for all other plans. */
		headers?: Input<Array<Input<string>> | undefined>

		/** When header `session_affinity` is enabled, this option can be used to specify how HTTP headers on load balancing requests will be used. The supported values are:
- `"true"`: Load balancing requests must contain *all* of the HTTP headers specified by the `headers` session affinity attribute, otherwise sessions aren't created.
- `"false"`: Load balancing requests must contain *at least one* of the HTTP headers specified by the `headers` session affinity attribute, otherwise sessions aren't created. */
		require_all_headers?: Input<boolean | undefined>

		/** Configures the SameSite attribute on session affinity cookie. Value "Auto" will be translated to "Lax" or "None" depending if Always Use HTTPS is enabled. Note: when using value "None", the secure attribute can not be set to "Never".
Available values: "Auto", "Lax", "None", "Strict". */
		samesite?: Input<string | undefined>

		/** Configures the Secure attribute on session affinity cookie. Value "Always" indicates the Secure attribute will be set in the Set-Cookie header, "Never" indicates the Secure attribute will not be set, and "Auto" will set the Secure attribute depending if Always Use HTTPS is enabled.
Available values: "Auto", "Always", "Never". */
		secure?: Input<string | undefined>

		/** Configures the zero-downtime failover between origins within a pool when session affinity is enabled. This feature is currently incompatible with Argo, Tiered Cache, and Bandwidth Alliance. The supported values are:
- `"none"`: No failover takes place for sessions pinned to the origin (default).
- `"temporary"`: Traffic will be sent to another other healthy origin until the originally pinned origin is available; note that this can potentially result in heavy origin flapping.
- `"sticky"`: The session affinity cookie is updated and subsequent requests are sent to the new origin. Note: Zero-downtime failover with sticky sessions is currently not supported for session affinity by header.
Available values: "none", "temporary", "sticky". */
		zero_downtime_failover?: Input<string | undefined>
	} | undefined>

	/** Time, in seconds, until a client's session expires after being created. Once the expiry time has been reached, subsequent requests may get sent to a different origin server. The accepted ranges per `session_affinity` policy are:
- `"cookie"` / `"ip_cookie"`: The current default of 23 hours will be used unless explicitly set. The accepted range of values is between [1800, 604800].
- `"header"`: The current default of 1800 seconds will be used unless explicitly set. The accepted range of values is between [30, 3600]. Note: With session affinity by header, sessions only expire after they haven't been used for the number of seconds specified. */
	session_affinity_ttl?: Input<number | undefined>

	/** Steering Policy for this load balancer.
- `"off"`: Use `default_pools`.
- `"geo"`: Use `region_pools`/`country_pools`/`pop_pools`. For non-proxied requests, the country for `country_pools` is determined by `location_strategy`.
- `"random"`: Select a pool randomly.
- `"dynamic_latency"`: Use round trip time to select the closest pool in default_pools (requires pool health checks).
- `"proximity"`: Use the pools' latitude and longitude to select the closest pool using the Cloudflare PoP location for proxied requests or the location determined by `location_strategy` for non-proxied requests.
- `"least_outstanding_requests"`: Select a pool by taking into consideration `random_steering` weights, as well as each pool's number of outstanding requests. Pools with more pending requests are weighted proportionately less relative to others.
- `"least_connections"`: Select a pool by taking into consideration `random_steering` weights, as well as each pool's number of open connections. Pools with more open connections are weighted proportionately less relative to others. Supported for HTTP/1 and HTTP/2 connections.
- `""`: Will map to `"geo"` if you use `region_pools`/`country_pools`/`pop_pools` otherwise `"off"`.
Available values: "off", "geo", "random", "dynamic_latency", "proximity", "least_outstanding_requests", "least_connections", "". */
	steering_policy?: Input<string | undefined>

	/** Time to live (TTL) of the DNS entry for the IP address returned by this load balancer. This only applies to gray-clouded (unproxied) load balancers. */
	ttl?: Input<number | undefined>
	zone_id: Input<string>
}

type CloudflareLoadBalancer = Readonly<{
	adaptive_routing: Output<Readonly<{

		/** Extends zero-downtime failover of requests to healthy origins from alternate pools, when no healthy alternate exists in the same pool, according to the failover order defined by traffic and origin steering. When set false (the default) zero-downtime failover will only occur between origins within the same pool. See `session_affinity_attributes` for control over when sessions are broken or reassigned. */
		failover_across_pools: boolean
	}>>

	/** A mapping of country codes to a list of pool IDs (ordered by their failover priority) for the given country. Any country not explicitly defined will fall back to using the corresponding region_pool mapping if it exists else to default_pools. */
	country_pools: Readonly<Record<string, ReadonlyArray<string>>>
	created_on: Output<string>

	/** A list of pool IDs ordered by their failover priority. Pools defined here are used by default, or when region_pools are not configured for a given region. */
	default_pools: ReadonlyArray<string>

	/** Object description. */
	description: Output<string | undefined>

	/** Whether to enable (the default) this load balancer. */
	enabled: Output<boolean>

	/** The pool ID to use when all other pools are detected as unhealthy. */
	fallback_pool: Output<string>
	id: Output<string>
	location_strategy: Output<Readonly<{

		/** Determines the authoritative location when ECS is not preferred, does not exist in the request, or its GeoIP lookup is unsuccessful.
- `"pop"`: Use the Cloudflare PoP location.
- `"resolver_ip"`: Use the DNS resolver GeoIP location. If the GeoIP lookup is unsuccessful, use the Cloudflare PoP location.
Available values: "pop", "resolver_ip". */
		mode: string

		/** Whether the EDNS Client Subnet (ECS) GeoIP should be preferred as the authoritative location.
- `"always"`: Always prefer ECS.
- `"never"`: Never prefer ECS.
- `"proximity"`: Prefer ECS only when `steering_policy="proximity"`.
- `"geo"`: Prefer ECS only when `steering_policy="geo"`.
Available values: "always", "never", "proximity", "geo". */
		prefer_ecs: string
	}>>
	modified_on: Output<string>

	/** The DNS hostname to associate with your Load Balancer. If this hostname already exists as a DNS record in Cloudflare's DNS, the Load Balancer will take precedence and the DNS record will not be used. */
	name: Output<string>

	/** List of networks where Load Balancer or Pool is enabled. */
	networks: ReadonlyArray<string>

	/** (Enterprise only): A mapping of Cloudflare PoP identifiers to a list of pool IDs (ordered by their failover priority) for the PoP (datacenter). Any PoPs not explicitly defined will fall back to using the corresponding country_pool, then region_pool mapping if it exists else to default_pools. */
	pop_pools: Readonly<Record<string, ReadonlyArray<string>>>

	/** Whether the hostname should be gray clouded (false) or orange clouded (true). */
	proxied: Output<boolean>
	random_steering: Output<Readonly<{

		/** The default weight for pools in the load balancer that are not specified in the pool_weights map. */
		default_weight: number

		/** A mapping of pool IDs to custom weights. The weight is relative to other pools in the load balancer. */
		pool_weights: Readonly<Record<string, number>>
	}>>

	/** A mapping of region codes to a list of pool IDs (ordered by their failover priority) for the given region. Any regions not explicitly defined will fall back to using default_pools. */
	region_pools: Readonly<Record<string, ReadonlyArray<string>>>
	rules: Output<Readonly<{

		/** The condition expressions to evaluate. If the condition evaluates to true, the overrides or fixed_response in this rule will be applied. An empty condition is always true. For more details on condition expressions, please see https://developers.cloudflare.com/load-balancing/understand-basics/load-balancing-rules/expressions. */
		condition: string

		/** Disable this specific rule. It will no longer be evaluated by this load balancer. */
		disabled: boolean
		fixed_response: Readonly<{

			/** The http 'Content-Type' header to include in the response. */
			content_type?: string

			/** The http 'Location' header to include in the response. */
			location?: string

			/** Text to include as the http body. */
			message_body?: string

			/** The http status code to respond with. */
			status_code?: number
		}>

		/** Name of this rule. Only used for human readability. */
		name: string
		overrides: Readonly<{
			adaptive_routing: Readonly<{

				/** Extends zero-downtime failover of requests to healthy origins from alternate pools, when no healthy alternate exists in the same pool, according to the failover order defined by traffic and origin steering. When set false (the default) zero-downtime failover will only occur between origins within the same pool. See `session_affinity_attributes` for control over when sessions are broken or reassigned. */
				failover_across_pools: boolean
			}>

			/** A mapping of country codes to a list of pool IDs (ordered by their failover priority) for the given country. Any country not explicitly defined will fall back to using the corresponding region_pool mapping if it exists else to default_pools. */
			country_pools: Readonly<Record<string, ReadonlyArray<string>>>

			/** A list of pool IDs ordered by their failover priority. Pools defined here are used by default, or when region_pools are not configured for a given region. */
			default_pools?: ReadonlyArray<string>

			/** The pool ID to use when all other pools are detected as unhealthy. */
			fallback_pool?: string
			location_strategy: Readonly<{

				/** Determines the authoritative location when ECS is not preferred, does not exist in the request, or its GeoIP lookup is unsuccessful.
- `"pop"`: Use the Cloudflare PoP location.
- `"resolver_ip"`: Use the DNS resolver GeoIP location. If the GeoIP lookup is unsuccessful, use the Cloudflare PoP location.
Available values: "pop", "resolver_ip". */
				mode: string

				/** Whether the EDNS Client Subnet (ECS) GeoIP should be preferred as the authoritative location.
- `"always"`: Always prefer ECS.
- `"never"`: Never prefer ECS.
- `"proximity"`: Prefer ECS only when `steering_policy="proximity"`.
- `"geo"`: Prefer ECS only when `steering_policy="geo"`.
Available values: "always", "never", "proximity", "geo". */
				prefer_ecs: string
			}>

			/** (Enterprise only): A mapping of Cloudflare PoP identifiers to a list of pool IDs (ordered by their failover priority) for the PoP (datacenter). Any PoPs not explicitly defined will fall back to using the corresponding country_pool, then region_pool mapping if it exists else to default_pools. */
			pop_pools: Readonly<Record<string, ReadonlyArray<string>>>
			random_steering: Readonly<{

				/** The default weight for pools in the load balancer that are not specified in the pool_weights map. */
				default_weight: number

				/** A mapping of pool IDs to custom weights. The weight is relative to other pools in the load balancer. */
				pool_weights?: Readonly<Record<string, number>>
			}>

			/** A mapping of region codes to a list of pool IDs (ordered by their failover priority) for the given region. Any regions not explicitly defined will fall back to using default_pools. */
			region_pools: Readonly<Record<string, ReadonlyArray<string>>>

			/** Specifies the type of session affinity the load balancer should use unless specified as `"none"`. The supported types are:
- `"cookie"`: On the first request to a proxied load balancer, a cookie is generated, encoding information of which origin the request will be forwarded to. Subsequent requests, by the same client to the same load balancer, will be sent to the origin server the cookie encodes, for the duration of the cookie and as long as the origin server remains healthy. If the cookie has expired or the origin server is unhealthy, then a new origin server is calculated and used.
- `"ip_cookie"`: Behaves the same as `"cookie"` except the initial origin selection is stable and based on the client's ip address.
- `"header"`: On the first request to a proxied load balancer, a session key based on the configured HTTP headers (see `session_affinity_attributes.headers`) is generated, encoding the request headers used for storing in the load balancer session state which origin the request will be forwarded to. Subsequent requests to the load balancer with the same headers will be sent to the same origin server, for the duration of the session and as long as the origin server remains healthy. If the session has been idle for the duration of `session_affinity_ttl` seconds or the origin server is unhealthy, then a new origin server is calculated and used. See `headers` in `session_affinity_attributes` for additional required configuration.
Available values: "none", "cookie", "ip_cookie", "header". */
			session_affinity: string
			session_affinity_attributes: Readonly<{

				/** Configures the drain duration in seconds. This field is only used when session affinity is enabled on the load balancer. */
				drain_duration: number

				/** Configures the names of HTTP headers to base session affinity on when header `session_affinity` is enabled. At least one HTTP header name must be provided. To specify the exact cookies to be used, include an item in the following format: `"cookie:<cookie-name-1>,<cookie-name-2>"` (example) where everything after the colon is a comma-separated list of cookie names. Providing only `"cookie"` will result in all cookies being used. The default max number of HTTP header names that can be provided depends on your plan: 5 for Enterprise, 1 for all other plans. */
				headers?: ReadonlyArray<string>

				/** When header `session_affinity` is enabled, this option can be used to specify how HTTP headers on load balancing requests will be used. The supported values are:
- `"true"`: Load balancing requests must contain *all* of the HTTP headers specified by the `headers` session affinity attribute, otherwise sessions aren't created.
- `"false"`: Load balancing requests must contain *at least one* of the HTTP headers specified by the `headers` session affinity attribute, otherwise sessions aren't created. */
				require_all_headers: boolean

				/** Configures the SameSite attribute on session affinity cookie. Value "Auto" will be translated to "Lax" or "None" depending if Always Use HTTPS is enabled. Note: when using value "None", the secure attribute can not be set to "Never".
Available values: "Auto", "Lax", "None", "Strict". */
				samesite: string

				/** Configures the Secure attribute on session affinity cookie. Value "Always" indicates the Secure attribute will be set in the Set-Cookie header, "Never" indicates the Secure attribute will not be set, and "Auto" will set the Secure attribute depending if Always Use HTTPS is enabled.
Available values: "Auto", "Always", "Never". */
				secure: string

				/** Configures the zero-downtime failover between origins within a pool when session affinity is enabled. This feature is currently incompatible with Argo, Tiered Cache, and Bandwidth Alliance. The supported values are:
- `"none"`: No failover takes place for sessions pinned to the origin (default).
- `"temporary"`: Traffic will be sent to another other healthy origin until the originally pinned origin is available; note that this can potentially result in heavy origin flapping.
- `"sticky"`: The session affinity cookie is updated and subsequent requests are sent to the new origin. Note: Zero-downtime failover with sticky sessions is currently not supported for session affinity by header.
Available values: "none", "temporary", "sticky". */
				zero_downtime_failover: string
			}>

			/** Time, in seconds, until a client's session expires after being created. Once the expiry time has been reached, subsequent requests may get sent to a different origin server. The accepted ranges per `session_affinity` policy are:
- `"cookie"` / `"ip_cookie"`: The current default of 23 hours will be used unless explicitly set. The accepted range of values is between [1800, 604800].
- `"header"`: The current default of 1800 seconds will be used unless explicitly set. The accepted range of values is between [30, 3600]. Note: With session affinity by header, sessions only expire after they haven't been used for the number of seconds specified. */
			session_affinity_ttl: number

			/** Steering Policy for this load balancer.
- `"off"`: Use `default_pools`.
- `"geo"`: Use `region_pools`/`country_pools`/`pop_pools`. For non-proxied requests, the country for `country_pools` is determined by `location_strategy`.
- `"random"`: Select a pool randomly.
- `"dynamic_latency"`: Use round trip time to select the closest pool in default_pools (requires pool health checks).
- `"proximity"`: Use the pools' latitude and longitude to select the closest pool using the Cloudflare PoP location for proxied requests or the location determined by `location_strategy` for non-proxied requests.
- `"least_outstanding_requests"`: Select a pool by taking into consideration `random_steering` weights, as well as each pool's number of outstanding requests. Pools with more pending requests are weighted proportionately less relative to others.
- `"least_connections"`: Select a pool by taking into consideration `random_steering` weights, as well as each pool's number of open connections. Pools with more open connections are weighted proportionately less relative to others. Supported for HTTP/1 and HTTP/2 connections.
- `""`: Will map to `"geo"` if you use `region_pools`/`country_pools`/`pop_pools` otherwise `"off"`.
Available values: "off", "geo", "random", "dynamic_latency", "proximity", "least_outstanding_requests", "least_connections", "". */
			steering_policy: string

			/** Time to live (TTL) of the DNS entry for the IP address returned by this load balancer. This only applies to gray-clouded (unproxied) load balancers. */
			ttl: number
		}>

		/** The order in which rules should be executed in relation to each other. Lower values are executed first. Values do not need to be sequential. If no value is provided for any rule the array order of the rules field will be used to assign a priority. */
		priority: number

		/** If this rule's condition is true, this causes rule evaluation to stop after processing this rule. */
		terminates: boolean
	}>>

	/** Specifies the type of session affinity the load balancer should use unless specified as `"none"`. The supported types are:
- `"cookie"`: On the first request to a proxied load balancer, a cookie is generated, encoding information of which origin the request will be forwarded to. Subsequent requests, by the same client to the same load balancer, will be sent to the origin server the cookie encodes, for the duration of the cookie and as long as the origin server remains healthy. If the cookie has expired or the origin server is unhealthy, then a new origin server is calculated and used.
- `"ip_cookie"`: Behaves the same as `"cookie"` except the initial origin selection is stable and based on the client's ip address.
- `"header"`: On the first request to a proxied load balancer, a session key based on the configured HTTP headers (see `session_affinity_attributes.headers`) is generated, encoding the request headers used for storing in the load balancer session state which origin the request will be forwarded to. Subsequent requests to the load balancer with the same headers will be sent to the same origin server, for the duration of the session and as long as the origin server remains healthy. If the session has been idle for the duration of `session_affinity_ttl` seconds or the origin server is unhealthy, then a new origin server is calculated and used. See `headers` in `session_affinity_attributes` for additional required configuration.
Available values: "none", "cookie", "ip_cookie", "header". */
	session_affinity: Output<string>
	session_affinity_attributes: Output<Readonly<{

		/** Configures the drain duration in seconds. This field is only used when session affinity is enabled on the load balancer. */
		drain_duration: number

		/** Configures the names of HTTP headers to base session affinity on when header `session_affinity` is enabled. At least one HTTP header name must be provided. To specify the exact cookies to be used, include an item in the following format: `"cookie:<cookie-name-1>,<cookie-name-2>"` (example) where everything after the colon is a comma-separated list of cookie names. Providing only `"cookie"` will result in all cookies being used. The default max number of HTTP header names that can be provided depends on your plan: 5 for Enterprise, 1 for all other plans. */
		headers: ReadonlyArray<string>

		/** When header `session_affinity` is enabled, this option can be used to specify how HTTP headers on load balancing requests will be used. The supported values are:
- `"true"`: Load balancing requests must contain *all* of the HTTP headers specified by the `headers` session affinity attribute, otherwise sessions aren't created.
- `"false"`: Load balancing requests must contain *at least one* of the HTTP headers specified by the `headers` session affinity attribute, otherwise sessions aren't created. */
		require_all_headers: boolean

		/** Configures the SameSite attribute on session affinity cookie. Value "Auto" will be translated to "Lax" or "None" depending if Always Use HTTPS is enabled. Note: when using value "None", the secure attribute can not be set to "Never".
Available values: "Auto", "Lax", "None", "Strict". */
		samesite: string

		/** Configures the Secure attribute on session affinity cookie. Value "Always" indicates the Secure attribute will be set in the Set-Cookie header, "Never" indicates the Secure attribute will not be set, and "Auto" will set the Secure attribute depending if Always Use HTTPS is enabled.
Available values: "Auto", "Always", "Never". */
		secure: string

		/** Configures the zero-downtime failover between origins within a pool when session affinity is enabled. This feature is currently incompatible with Argo, Tiered Cache, and Bandwidth Alliance. The supported values are:
- `"none"`: No failover takes place for sessions pinned to the origin (default).
- `"temporary"`: Traffic will be sent to another other healthy origin until the originally pinned origin is available; note that this can potentially result in heavy origin flapping.
- `"sticky"`: The session affinity cookie is updated and subsequent requests are sent to the new origin. Note: Zero-downtime failover with sticky sessions is currently not supported for session affinity by header.
Available values: "none", "temporary", "sticky". */
		zero_downtime_failover: string
	}>>

	/** Time, in seconds, until a client's session expires after being created. Once the expiry time has been reached, subsequent requests may get sent to a different origin server. The accepted ranges per `session_affinity` policy are:
- `"cookie"` / `"ip_cookie"`: The current default of 23 hours will be used unless explicitly set. The accepted range of values is between [1800, 604800].
- `"header"`: The current default of 1800 seconds will be used unless explicitly set. The accepted range of values is between [30, 3600]. Note: With session affinity by header, sessions only expire after they haven't been used for the number of seconds specified. */
	session_affinity_ttl: Output<number>

	/** Steering Policy for this load balancer.
- `"off"`: Use `default_pools`.
- `"geo"`: Use `region_pools`/`country_pools`/`pop_pools`. For non-proxied requests, the country for `country_pools` is determined by `location_strategy`.
- `"random"`: Select a pool randomly.
- `"dynamic_latency"`: Use round trip time to select the closest pool in default_pools (requires pool health checks).
- `"proximity"`: Use the pools' latitude and longitude to select the closest pool using the Cloudflare PoP location for proxied requests or the location determined by `location_strategy` for non-proxied requests.
- `"least_outstanding_requests"`: Select a pool by taking into consideration `random_steering` weights, as well as each pool's number of outstanding requests. Pools with more pending requests are weighted proportionately less relative to others.
- `"least_connections"`: Select a pool by taking into consideration `random_steering` weights, as well as each pool's number of open connections. Pools with more open connections are weighted proportionately less relative to others. Supported for HTTP/1 and HTTP/2 connections.
- `""`: Will map to `"geo"` if you use `region_pools`/`country_pools`/`pop_pools` otherwise `"off"`.
Available values: "off", "geo", "random", "dynamic_latency", "proximity", "least_outstanding_requests", "least_connections", "". */
	steering_policy: Output<string>

	/** Time to live (TTL) of the DNS entry for the IP address returned by this load balancer. This only applies to gray-clouded (unproxied) load balancers. */
	ttl: Output<number>
	zone_id: Output<string>
	zone_name: Output<string>
}>

type CloudflareListItemProps = {

	/** Identifier */
	account_id?: Input<string | undefined>

	/** A non-negative 32 bit integer */
	asn?: Input<number | undefined>

	/** An informative summary of the list item. */
	comment?: Input<string | undefined>
	hostname?: Input<{
		url_hostname: Input<string>
	} | undefined>

	/** An IPv4 address, an IPv4 CIDR, or an IPv6 CIDR. IPv6 CIDRs are limited to a maximum of /64. */
	ip?: Input<string | undefined>

	/** The unique ID of the list. */
	list_id: Input<string>
	redirect?: Input<{
		include_subdomains?: Input<boolean | undefined>
		preserve_path_suffix?: Input<boolean | undefined>
		preserve_query_string?: Input<boolean | undefined>
		source_url: Input<string>

		/** Available values: 301, 302, 307, 308. */
		status_code?: Input<number | undefined>
		subpath_matching?: Input<boolean | undefined>
		target_url: Input<string>
	} | undefined>
}

type CloudflareListItem = Readonly<{

	/** Identifier */
	account_id: Output<string | undefined>

	/** A non-negative 32 bit integer */
	asn: Output<number | undefined>

	/** An informative summary of the list item. */
	comment: Output<string | undefined>

	/** The RFC 3339 timestamp of when the item was created. */
	created_on: Output<string>
	hostname: Output<Readonly<{
		url_hostname: string
	}> | undefined>

	/** The unique ID of the item in the List. */
	id: Output<string>

	/** An IPv4 address, an IPv4 CIDR, or an IPv6 CIDR. IPv6 CIDRs are limited to a maximum of /64. */
	ip: Output<string | undefined>

	/** The unique ID of the list. */
	list_id: Output<string>

	/** The RFC 3339 timestamp of when the item was last modified. */
	modified_on: Output<string>

	/** The unique operation ID of the asynchronous action. */
	operation_id: Output<string>
	redirect: Output<Readonly<{
		include_subdomains: boolean
		preserve_path_suffix: boolean
		preserve_query_string: boolean
		source_url: string

		/** Available values: 301, 302, 307, 308. */
		status_code: number
		subpath_matching: boolean
		target_url: string
	}> | undefined>
}>

type CloudflareZoneDnssecProps = {

	/** If true, multi-signer DNSSEC is enabled on the zone, allowing multiple
providers to serve a DNSSEC-signed zone at the same time.
This is required for DNSKEY records (except those automatically
generated by Cloudflare) to be added to the zone.

See [Multi-signer DNSSEC](https://developers.cloudflare.com/dns/dnssec/multi-signer-dnssec/) for details. */
	dnssec_multi_signer?: Input<boolean | undefined>

	/** If true, allows Cloudflare to transfer in a DNSSEC-signed zone
including signatures from an external provider, without requiring
Cloudflare to sign any records on the fly.

Note that this feature has some limitations.
See [Cloudflare as Secondary](https://developers.cloudflare.com/dns/zone-setups/zone-transfers/cloudflare-as-secondary/setup/#dnssec) for details. */
	dnssec_presigned?: Input<boolean | undefined>

	/** Status of DNSSEC, based on user-desired state and presence of necessary records.
Available values: "active", "disabled". */
	status?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareZoneDnssec = Readonly<{

	/** Algorithm key code. */
	algorithm: Output<string>

	/** Digest hash. */
	digest: Output<string>

	/** Type of digest algorithm. */
	digest_algorithm: Output<string>

	/** Coded type for digest algorithm. */
	digest_type: Output<string>

	/** If true, multi-signer DNSSEC is enabled on the zone, allowing multiple
providers to serve a DNSSEC-signed zone at the same time.
This is required for DNSKEY records (except those automatically
generated by Cloudflare) to be added to the zone.

See [Multi-signer DNSSEC](https://developers.cloudflare.com/dns/dnssec/multi-signer-dnssec/) for details. */
	dnssec_multi_signer: Output<boolean | undefined>

	/** If true, allows Cloudflare to transfer in a DNSSEC-signed zone
including signatures from an external provider, without requiring
Cloudflare to sign any records on the fly.

Note that this feature has some limitations.
See [Cloudflare as Secondary](https://developers.cloudflare.com/dns/zone-setups/zone-transfers/cloudflare-as-secondary/setup/#dnssec) for details. */
	dnssec_presigned: Output<boolean | undefined>

	/** Full DS record. */
	ds: Output<string>

	/** Flag for DNSSEC record. */
	flags: Output<number>

	/** Identifier */
	id: Output<string>

	/** Code for key tag. */
	key_tag: Output<number>

	/** Algorithm key type. */
	key_type: Output<string>

	/** When DNSSEC was last modified. */
	modified_on: Output<string>

	/** Public key for DS record. */
	public_key: Output<string>

	/** Status of DNSSEC, based on user-desired state and presence of necessary records.
Available values: "active", "disabled". */
	status: Output<string | undefined>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustGatewayCertificateProps = {
	account_id: Input<string>

	/** Number of days the generated certificate will be valid, minimum 1 day and maximum 30 years. Defaults to 5 years. */
	validity_period_days?: Input<number | undefined>
}

type CloudflareZeroTrustGatewayCertificate = Readonly<{
	account_id: Output<string>

	/** The deployment status of the certificate on Cloudflare's edge. Certificates in the 'available' (previously called 'active') state may be used for Gateway TLS interception.
Available values: "pending_deployment", "available", "pending_deletion", "inactive". */
	binding_status: Output<string>

	/** The CA certificate */
	certificate: Output<string>
	created_at: Output<string>
	expires_on: Output<string>

	/** The SHA256 fingerprint of the certificate. */
	fingerprint: Output<string>

	/** Certificate UUID tag. */
	id: Output<string>

	/** Use this certificate for Gateway TLS interception */
	in_use: Output<boolean>

	/** The organization that issued the certificate. */
	issuer_org: Output<string>

	/** The entire issuer field of the certificate. */
	issuer_raw: Output<string>

	/** The type of certificate, either BYO-PKI (custom) or Gateway-managed.
Available values: "custom", "gateway_managed". */
	type: Output<string>
	updated_at: Output<string>
	uploaded_on: Output<string>

	/** Number of days the generated certificate will be valid, minimum 1 day and maximum 30 years. Defaults to 5 years. */
	validity_period_days: Output<number | undefined>
}>

type CloudflareZeroTrustAccessKeyConfigurationProps = {

	/** Identifier */
	account_id: Input<string>

	/** The number of days between key rotations. */
	key_rotation_interval_days: Input<number>
}

type CloudflareZeroTrustAccessKeyConfiguration = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The number of days until the next key rotation. */
	days_until_next_rotation: Output<number>

	/** Identifier */
	id: Output<string>

	/** The number of days between key rotations. */
	key_rotation_interval_days: Output<number>

	/** The timestamp of the previous key rotation. */
	last_key_rotation_at: Output<string>
}>

type CloudflareWorkersKvNamespaceProps = {

	/** Identifier */
	account_id: Input<string>

	/** A human-readable string name for a Namespace. */
	title: Input<string>
}

type CloudflareWorkersKvNamespace = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Namespace identifier tag. */
	id: Output<string>

	/** True if keys written on the URL will be URL-decoded before storing. For example, if set to "true", a key written on the URL as "%3F" will be stored as "?". */
	supports_url_encoding: Output<boolean>

	/** A human-readable string name for a Namespace. */
	title: Output<string>
}>

type CloudflareAuthenticatedOriginPullsCertificateProps = {

	/** The zone's leaf certificate. */
	certificate: Input<string>

	/** The zone's private key. */
	private_key: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareAuthenticatedOriginPullsCertificate = Readonly<{

	/** The zone's leaf certificate. */
	certificate: Output<string>

	/** Identifier */
	certificate_id: Output<string>

	/** Indicates whether zone-level authenticated origin pulls is enabled. */
	enabled: Output<boolean>

	/** When the certificate from the authority expires. */
	expires_on: Output<string>

	/** Identifier */
	id: Output<string>

	/** The certificate authority that issued the certificate. */
	issuer: Output<string>

	/** The zone's private key. */
	private_key: Output<string>

	/** The type of hash used for the certificate. */
	signature: Output<string>

	/** Status of the certificate activation.
Available values: "initializing", "pending_deployment", "pending_deletion", "active", "deleted", "deployment_timed_out", "deletion_timed_out". */
	status: Output<string>

	/** This is the time the certificate was uploaded. */
	uploaded_on: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareRegionalHostnameProps = {

	/** DNS hostname to be regionalized, must be a subdomain of the zone. Wildcards are supported for one level, e.g `*.example.com` */
	hostname: Input<string>

	/** Identifying key for the region */
	region_key: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareRegionalHostname = Readonly<{

	/** When the regional hostname was created */
	created_on: Output<string>

	/** DNS hostname to be regionalized, must be a subdomain of the zone. Wildcards are supported for one level, e.g `*.example.com` */
	hostname: Output<string>

	/** DNS hostname to be regionalized, must be a subdomain of the zone. Wildcards are supported for one level, e.g `*.example.com` */
	id: Output<string>

	/** Identifying key for the region */
	region_key: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareD1DatabaseProps = {

	/** Account identifier tag. */
	account_id: Input<string>

	/** D1 database name. */
	name: Input<string>

	/** Specify the region to create the D1 primary, if available. If this option is omitted, the D1 will be created as close as possible to the current user.
Available values: "wnam", "enam", "weur", "eeur", "apac", "oc". */
	primary_location_hint?: Input<string | undefined>
}

type CloudflareD1Database = Readonly<{

	/** Account identifier tag. */
	account_id: Output<string>

	/** Specifies the timestamp the resource was created as an ISO8601 string. */
	created_at: Output<string>

	/** The D1 database's size, in bytes. */
	file_size: Output<number>

	/** D1 database identifier (UUID). */
	id: Output<string>

	/** D1 database name. */
	name: Output<string>
	num_tables: Output<number>

	/** Specify the region to create the D1 primary, if available. If this option is omitted, the D1 will be created as close as possible to the current user.
Available values: "wnam", "enam", "weur", "eeur", "apac", "oc". */
	primary_location_hint: Output<string | undefined>

	/** D1 database identifier (UUID). */
	uuid: Output<string>
	version: Output<string>
}>

type CloudflareCustomHostnameProps = {

	/** Unique key/value metadata for this hostname. These are per-hostname (customer) settings. */
	custom_metadata?: Input<Record<string, Input<string>> | undefined>

	/** a valid hostname that’s been added to your DNS zone as an A, AAAA, or CNAME record. */
	custom_origin_server?: Input<string | undefined>

	/** A hostname that will be sent to your custom origin server as SNI for TLS handshake. This can be a valid subdomain of the zone or custom origin server name or the string ':request_host_header:' which will cause the host header in the request to be used as SNI. Not configurable with default/fallback origin server. */
	custom_origin_sni?: Input<string | undefined>

	/** The custom hostname that will point to your hostname via CNAME. */
	hostname: Input<string>
	ssl: Input<{

		/** A ubiquitous bundle has the highest probability of being verified everywhere, even by clients using outdated or unusual trust stores. An optimal bundle uses the shortest chain and newest intermediates. And the force bundle verifies the chain, but does not otherwise modify it.
Available values: "ubiquitous", "optimal", "force". */
		bundle_method?: Input<string | undefined>

		/** The Certificate Authority that will issue the certificate
Available values: "digicert", "google", "lets_encrypt", "ssl_com". */
		certificate_authority?: Input<string | undefined>

		/** Whether or not to add Cloudflare Branding for the order.  This will add a subdomain of sni.cloudflaressl.com as the Common Name if set to true */
		cloudflare_branding?: Input<boolean | undefined>
		custom_cert_bundle?: Input<{

			/** If a custom uploaded certificate is used. */
			custom_certificate: Input<string>

			/** The key for a custom uploaded certificate. */
			custom_key: Input<string>
		} | undefined>

		/** If a custom uploaded certificate is used. */
		custom_certificate?: Input<string | undefined>

		/** The key for a custom uploaded certificate. */
		custom_key?: Input<string | undefined>

		/** Domain control validation (DCV) method used for this hostname.
Available values: "http", "txt", "email". */
		method?: Input<string | undefined>
		settings?: Input<{

			/** An allowlist of ciphers for TLS termination. These ciphers must be in the BoringSSL format. */
			ciphers?: Input<Array<Input<string>> | undefined>

			/** Whether or not Early Hints is enabled.
Available values: "on", "off". */
			early_hints?: Input<string | undefined>

			/** Whether or not HTTP2 is enabled.
Available values: "on", "off". */
			http2?: Input<string | undefined>

			/** The minimum TLS version supported.
Available values: "1.0", "1.1", "1.2", "1.3". */
			min_tls_version?: Input<string | undefined>

			/** Whether or not TLS 1.3 is enabled.
Available values: "on", "off". */
			tls_1_3?: Input<string | undefined>
		} | undefined>

		/** Level of validation to be used for this hostname. Domain validation (dv) must be used.
Available values: "dv". */
		type?: Input<string | undefined>

		/** Indicates whether the certificate covers a wildcard. */
		wildcard?: Input<boolean | undefined>
	}>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareCustomHostname = Readonly<{

	/** This is the time the hostname was created. */
	created_at: Output<string>

	/** Unique key/value metadata for this hostname. These are per-hostname (customer) settings. */
	custom_metadata: Readonly<Record<string, string>>

	/** a valid hostname that’s been added to your DNS zone as an A, AAAA, or CNAME record. */
	custom_origin_server: Output<string | undefined>

	/** A hostname that will be sent to your custom origin server as SNI for TLS handshake. This can be a valid subdomain of the zone or custom origin server name or the string ':request_host_header:' which will cause the host header in the request to be used as SNI. Not configurable with default/fallback origin server. */
	custom_origin_sni: Output<string | undefined>

	/** The custom hostname that will point to your hostname via CNAME. */
	hostname: Output<string>

	/** Identifier */
	id: Output<string>
	ownership_verification: Output<Readonly<{

		/** DNS Name for record. */
		name: string

		/** DNS Record type.
Available values: "txt". */
		type: string

		/** Content for the record. */
		value: string
	}>>
	ownership_verification_http: Output<Readonly<{

		/** Token to be served. */
		http_body: string

		/** The HTTP URL that will be checked during custom hostname verification and where the customer should host the token. */
		http_url: string
	}>>
	ssl: Output<Readonly<{

		/** A ubiquitous bundle has the highest probability of being verified everywhere, even by clients using outdated or unusual trust stores. An optimal bundle uses the shortest chain and newest intermediates. And the force bundle verifies the chain, but does not otherwise modify it.
Available values: "ubiquitous", "optimal", "force". */
		bundle_method: string

		/** The Certificate Authority that will issue the certificate
Available values: "digicert", "google", "lets_encrypt", "ssl_com". */
		certificate_authority: string

		/** Whether or not to add Cloudflare Branding for the order.  This will add a subdomain of sni.cloudflaressl.com as the Common Name if set to true */
		cloudflare_branding: boolean
		custom_cert_bundle: Readonly<{

			/** If a custom uploaded certificate is used. */
			custom_certificate: string

			/** The key for a custom uploaded certificate. */
			custom_key: string
		}>

		/** If a custom uploaded certificate is used. */
		custom_certificate: string

		/** The key for a custom uploaded certificate. */
		custom_key: string

		/** Domain control validation (DCV) method used for this hostname.
Available values: "http", "txt", "email". */
		method: string
		settings: Readonly<{

			/** An allowlist of ciphers for TLS termination. These ciphers must be in the BoringSSL format. */
			ciphers?: ReadonlyArray<string>

			/** Whether or not Early Hints is enabled.
Available values: "on", "off". */
			early_hints?: string

			/** Whether or not HTTP2 is enabled.
Available values: "on", "off". */
			http2?: string

			/** The minimum TLS version supported.
Available values: "1.0", "1.1", "1.2", "1.3". */
			min_tls_version?: string

			/** Whether or not TLS 1.3 is enabled.
Available values: "on", "off". */
			tls_1_3?: string
		}>

		/** Level of validation to be used for this hostname. Domain validation (dv) must be used.
Available values: "dv". */
		type: string

		/** Indicates whether the certificate covers a wildcard. */
		wildcard: boolean
	}>>

	/** Status of the hostname's activation.
Available values: "active", "pending", "active_redeploying", "moved", "pending_deletion", "deleted", "pending_blocked", "pending_migration", "pending_provisioned", "test_pending", "test_active", "test_active_apex", "test_blocked", "test_failed", "provisioned", "blocked". */
	status: Output<string>

	/** These are errors that were encountered while trying to activate a hostname. */
	verification_errors: ReadonlyArray<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustAccessMtlsHostnameSettingsProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>
	settings: Input<{

		/** Request client certificates for this hostname in China. Can only be set to true if this zone is china network enabled. */
		china_network: Input<boolean>

		/** Client Certificate Forwarding is a feature that takes the client cert provided by the eyeball to the edge, and forwards it to the origin as a HTTP header to allow logging on the origin. */
		client_certificate_forwarding: Input<boolean>

		/** The hostname that these settings apply to. */
		hostname: Input<string>
	}>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareZeroTrustAccessMtlsHostnameSettings = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** Request client certificates for this hostname in China. Can only be set to true if this zone is china network enabled. */
	china_network: Output<boolean>

	/** Client Certificate Forwarding is a feature that takes the client cert provided by the eyeball to the edge, and forwards it to the origin as a HTTP header to allow logging on the origin. */
	client_certificate_forwarding: Output<boolean>

	/** The hostname that these settings apply to. */
	hostname: Output<string>
	settings: Output<Readonly<{

		/** Request client certificates for this hostname in China. Can only be set to true if this zone is china network enabled. */
		china_network: boolean

		/** Client Certificate Forwarding is a feature that takes the client cert provided by the eyeball to the edge, and forwards it to the origin as a HTTP header to allow logging on the origin. */
		client_certificate_forwarding: boolean

		/** The hostname that these settings apply to. */
		hostname: string
	}>>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareRulesetProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** An informative description of the ruleset. */
	description?: Input<string | undefined>

	/** The kind of the ruleset.
Available values: "managed", "custom", "root", "zone". */
	kind: Input<string>

	/** The human-readable name of the ruleset. */
	name: Input<string>

	/** The phase of the ruleset.
Available values: "ddos_l4", "ddos_l7", "http_config_settings", "http_custom_errors", "http_log_custom_fields", "http_ratelimit", "http_request_cache_settings", "http_request_dynamic_redirect", "http_request_firewall_custom", "http_request_firewall_managed", "http_request_late_transform", "http_request_origin", "http_request_redirect", "http_request_sanitize", "http_request_sbfm", "http_request_transform", "http_response_compression", "http_response_firewall_managed", "http_response_headers_transform", "magic_transit", "magic_transit_ids_managed", "magic_transit_managed", "magic_transit_ratelimit". */
	phase: Input<string>
	rules?: Input<{

		/** The action to perform when the rule matches.
Available values: "block". */
		action?: Input<string | undefined>
		action_parameters?: Input<{

			/** List of additional ports that caching can be enabled on. */
			additional_cacheable_ports?: Input<Array<Input<number>> | undefined>
			algorithms?: Input<{

				/** Name of compression algorithm to enable.
Available values: "none", "auto", "default", "gzip", "brotli". */
				name?: Input<string | undefined>
			} | undefined>

			/** Turn on or off Automatic HTTPS Rewrites. */
			automatic_https_rewrites?: Input<boolean | undefined>
			autominify?: Input<{

				/** Minify CSS files. */
				css?: Input<boolean | undefined>

				/** Minify HTML files. */
				html?: Input<boolean | undefined>

				/** Minify JS files. */
				js?: Input<boolean | undefined>
			} | undefined>

			/** Turn on or off Browser Integrity Check. */
			bic?: Input<boolean | undefined>
			browser_ttl?: Input<{

				/** The TTL (in seconds) if you choose override_origin mode. */
				default?: Input<number | undefined>

				/** Determines which browser ttl mode to use.
Available values: "respect_origin", "bypass_by_default", "override_origin". */
				mode: Input<string>
			} | undefined>

			/** Mark whether the request’s response from origin is eligible for caching. Caching itself will still depend on the cache-control header and your other caching configurations. */
			cache?: Input<boolean | undefined>
			cache_key?: Input<{

				/** Separate cached content based on the visitor’s device type */
				cache_by_device_type?: Input<boolean | undefined>

				/** Protect from web cache deception attacks while allowing static assets to be cached */
				cache_deception_armor?: Input<boolean | undefined>
				custom_key?: Input<{
					cookie?: Input<{

						/** Checks for the presence of these cookie names. The presence of these cookies is used in building the cache key. */
						check_presence?: Input<Array<Input<string>> | undefined>

						/** Include these cookies' names and their values. */
						include?: Input<Array<Input<string>> | undefined>
					} | undefined>
					header?: Input<{

						/** Checks for the presence of these header names. The presence of these headers is used in building the cache key. */
						check_presence?: Input<Array<Input<string>> | undefined>

						/** For each header name and list of values combination, check if the request header contains any of the values provided. The presence of the request header and whether any of the values provided are contained in the request header value is used in building the cache key. */
						contains?: Input<Record<string, Input<Array<Input<string>>>> | undefined>

						/** Whether or not to include the origin header. A value of true will exclude the origin header in the cache key. */
						exclude_origin?: Input<boolean | undefined>

						/** Include these headers' names and their values. */
						include?: Input<Array<Input<string>> | undefined>
					} | undefined>
					host?: Input<{

						/** Use the resolved host in the cache key. A value of true will use the resolved host, while a value or false will use the original host. */
						resolved?: Input<boolean | undefined>
					} | undefined>
					query_string?: Input<{
						exclude?: Input<{

							/** Determines whether to exclude all query string parameters from the cache key. */
							all?: Input<boolean | undefined>
							list?: Input<Array<Input<string>> | undefined>
						} | undefined>
						include?: Input<{

							/** Determines whether to include all query string parameters in the cache key. */
							all?: Input<boolean | undefined>
							list?: Input<Array<Input<string>> | undefined>
						} | undefined>
					} | undefined>
					user?: Input<{

						/** Use the user agent's device type in the cache key. */
						device_type?: Input<boolean | undefined>

						/** Use the user agents's country in the cache key. */
						geo?: Input<boolean | undefined>

						/** Use the user agent's language in the cache key. */
						lang?: Input<boolean | undefined>
					} | undefined>
				} | undefined>

				/** Treat requests with the same query parameters the same, regardless of the order those query parameters are in. A value of true ignores the query strings' order. */
				ignore_query_strings_order?: Input<boolean | undefined>
			} | undefined>
			cache_reserve?: Input<{

				/** Determines whether cache reserve is enabled. If this is true and a request meets eligibility criteria, Cloudflare will write the resource to cache reserve. */
				eligible: Input<boolean>

				/** The minimum file size eligible for store in cache reserve. */
				minimum_file_size: Input<number>
			} | undefined>

			/** Error response content. */
			content?: Input<string | undefined>

			/** Content-type header to set with the response.
Available values: "application/json", "text/xml", "text/plain", "text/html". */
			content_type?: Input<string | undefined>
			cookie_fields?: Input<{

				/** The name of the field. */
				name: Input<string>
			} | undefined>

			/** Turn off all active Cloudflare Apps. */
			disable_apps?: Input<boolean | undefined>

			/** Turn off Real User Monitoring (RUM). */
			disable_rum?: Input<boolean | undefined>

			/** Turn off Zaraz. */
			disable_zaraz?: Input<boolean | undefined>
			edge_ttl?: Input<{

				/** The TTL (in seconds) if you choose override_origin mode. */
				default?: Input<number | undefined>

				/** edge ttl options
Available values: "respect_origin", "bypass_by_default", "override_origin". */
				mode: Input<string>
				status_code_ttl?: Input<{

					/** Set the ttl for responses with this specific status code */
					status_code?: Input<number | undefined>
					status_code_range?: Input<{

						/** response status code lower bound */
						from?: Input<number | undefined>

						/** response status code upper bound */
						to?: Input<number | undefined>
					} | undefined>

					/** Time to cache a response (in seconds). A value of 0 is equivalent to setting the Cache-Control header with the value "no-cache". A value of -1 is equivalent to setting Cache-Control header with the value of "no-store". */
					value: Input<number>
				} | undefined>
			} | undefined>

			/** Turn on or off Email Obfuscation. */
			email_obfuscation?: Input<boolean | undefined>

			/** Turn on or off Cloudflare Fonts. */
			fonts?: Input<boolean | undefined>
			from_list?: Input<{

				/** Expression that evaluates to the list lookup key. */
				key?: Input<string | undefined>

				/** The name of the list to match against. */
				name?: Input<string | undefined>
			} | undefined>
			from_value?: Input<{

				/** Keep the query string of the original request. */
				preserve_query_string?: Input<boolean | undefined>

				/** The status code to be used for the redirect.
Available values: 301, 302, 303, 307, 308. */
				status_code?: Input<number | undefined>
				target_url?: Input<{

					/** An expression to evaluate to get the URL to redirect the request to. */
					expression?: Input<string | undefined>

					/** The URL to redirect the request to. */
					value?: Input<string | undefined>
				} | undefined>
			} | undefined>
			headers?: Input<{

				/** Expression for the header value. */
				expression?: Input<string | undefined>

				/** Available values: "remove". */
				operation: Input<string>

				/** Static value for the header. */
				value?: Input<string | undefined>
			} | undefined>

			/** Rewrite the HTTP Host header. */
			host_header?: Input<string | undefined>

			/** Turn on or off the Hotlink Protection. */
			hotlink_protection?: Input<boolean | undefined>

			/** The ID of the ruleset to execute. */
			id?: Input<string | undefined>

			/** Increment contains the delta to change the score and can be either positive or negative. */
			increment?: Input<number | undefined>
			matched_data?: Input<{

				/** The public key to encrypt matched data logs with. */
				public_key: Input<string>
			} | undefined>

			/** Turn on or off Mirage. */
			mirage?: Input<boolean | undefined>

			/** Turn on or off Opportunistic Encryption. */
			opportunistic_encryption?: Input<boolean | undefined>
			origin?: Input<{

				/** Override the resolved hostname. */
				host?: Input<string | undefined>

				/** Override the destination port. */
				port?: Input<number | undefined>
			} | undefined>

			/** When enabled, Cloudflare will aim to strictly adhere to RFC 7234. */
			origin_cache_control?: Input<boolean | undefined>

			/** Generate Cloudflare error pages from issues sent from the origin server. When on, error pages will trigger for issues from the origin */
			origin_error_page_passthru?: Input<boolean | undefined>
			overrides?: Input<{

				/** An action to override all rules with. This option has lower precedence than rule and category overrides. */
				action?: Input<string | undefined>
				categories?: Input<{

					/** The action to override rules in the category with. */
					action?: Input<string | undefined>

					/** The name of the category to override. */
					category: Input<string>

					/** Whether to enable execution of rules in the category. */
					enabled?: Input<boolean | undefined>

					/** The sensitivity level to use for rules in the category.
Available values: "default", "medium", "low", "eoff". */
					sensitivity_level?: Input<string | undefined>
				} | undefined>

				/** Whether to enable execution of all rules. This option has lower precedence than rule and category overrides. */
				enabled?: Input<boolean | undefined>
				rules?: Input<{

					/** The action to override the rule with. */
					action?: Input<string | undefined>

					/** Whether to enable execution of the rule. */
					enabled?: Input<boolean | undefined>

					/** The ID of the rule to override. */
					id: Input<string>

					/** The score threshold to use for the rule. */
					score_threshold?: Input<number | undefined>

					/** The sensitivity level to use for the rule.
Available values: "default", "medium", "low", "eoff". */
					sensitivity_level?: Input<string | undefined>
				} | undefined>

				/** A sensitivity level to set for all rules. This option has lower precedence than rule and category overrides and is only applicable for DDoS phases.
Available values: "default", "medium", "low", "eoff". */
				sensitivity_level?: Input<string | undefined>
			} | undefined>

			/** A list of phases to skip the execution of. This option is incompatible with the ruleset and rulesets options. */
			phases?: Input<Array<Input<string>> | undefined>

			/** Configure the Polish level.
Available values: "off", "lossless", "lossy". */
			polish?: Input<string | undefined>

			/** A list of legacy security products to skip the execution of. */
			products?: Input<Array<Input<string>> | undefined>
			raw_response_fields?: Input<{

				/** The name of the field. */
				name: Input<string>

				/** Whether to log duplicate values of the same header. */
				preserve_duplicates?: Input<boolean | undefined>
			} | undefined>

			/** Define a timeout value between two successive read operations to your origin server. Historically, the timeout value between two read options from Cloudflare to an origin server is 100 seconds. If you are attempting to reduce HTTP 524 errors because of timeouts from an origin server, try increasing this timeout value. */
			read_timeout?: Input<number | undefined>
			request_fields?: Input<{

				/** The name of the field. */
				name: Input<string>
			} | undefined>

			/** Specify whether or not Cloudflare should respect strong ETag (entity tag) headers. When off, Cloudflare converts strong ETag headers to weak ETag headers. */
			respect_strong_etags?: Input<boolean | undefined>
			response?: Input<{

				/** The content to return. */
				content: Input<string>

				/** The type of the content to return. */
				content_type: Input<string>

				/** The status code to return. */
				status_code: Input<number>
			} | undefined>
			response_fields?: Input<{

				/** The name of the field. */
				name: Input<string>

				/** Whether to log duplicate values of the same header. */
				preserve_duplicates?: Input<boolean | undefined>
			} | undefined>

			/** Turn on or off Rocket Loader */
			rocket_loader?: Input<boolean | undefined>

			/** A mapping of ruleset IDs to a list of rule IDs in that ruleset to skip the execution of. This option is incompatible with the ruleset option. */
			rules?: Input<Record<string, Input<Array<Input<string>>>> | undefined>

			/** A ruleset to skip the execution of. This option is incompatible with the rulesets, rules and phases options.
Available values: "current". */
			ruleset?: Input<string | undefined>

			/** A list of ruleset IDs to skip the execution of. This option is incompatible with the ruleset and phases options. */
			rulesets?: Input<Array<Input<string>> | undefined>

			/** Configure the Security Level.
Available values: "off", "essentially_off", "low", "medium", "high", "under_attack". */
			security_level?: Input<string | undefined>
			serve_stale?: Input<{

				/** Defines whether Cloudflare should serve stale content while updating. If true, Cloudflare will not serve stale content while getting the latest content from the origin. */
				disable_stale_while_updating: Input<boolean>
			} | undefined>

			/** Turn on or off Server Side Excludes. */
			server_side_excludes?: Input<boolean | undefined>
			sni?: Input<{

				/** The SNI override. */
				value: Input<string>
			} | undefined>

			/** Configure the SSL level.
Available values: "off", "flexible", "full", "strict", "origin_pull". */
			ssl?: Input<string | undefined>

			/** The status code to use for the error. */
			status_code?: Input<number | undefined>

			/** Turn on or off Signed Exchanges (SXG). */
			sxg?: Input<boolean | undefined>
			transformed_request_fields?: Input<{

				/** The name of the field. */
				name: Input<string>
			} | undefined>
			uri?: Input<{
				path?: Input<{

					/** Expression to evaluate for the replacement value. */
					expression?: Input<string | undefined>

					/** Predefined replacement value. */
					value?: Input<string | undefined>
				} | undefined>
				query?: Input<{

					/** Expression to evaluate for the replacement value. */
					expression?: Input<string | undefined>

					/** Predefined replacement value. */
					value?: Input<string | undefined>
				} | undefined>
			} | undefined>
		} | undefined>

		/** An informative description of the rule. */
		description?: Input<string | undefined>

		/** Whether the rule should be executed. */
		enabled?: Input<boolean | undefined>
		exposed_credential_check?: Input<{

			/** Expression that selects the password used in the credentials check. */
			password_expression: Input<string>

			/** Expression that selects the user ID used in the credentials check. */
			username_expression: Input<string>
		} | undefined>

		/** The expression defining which traffic will match the rule. */
		expression?: Input<string | undefined>
		logging?: Input<{

			/** Whether to generate a log when the rule matches. */
			enabled: Input<boolean>
		} | undefined>
		ratelimit?: Input<{

			/** Characteristics of the request on which the ratelimiter counter will be incremented. */
			characteristics: Input<Array<Input<string>>>

			/** Defines when the ratelimit counter should be incremented. It is optional and defaults to the same as the rule's expression. */
			counting_expression?: Input<string | undefined>

			/** Period of time in seconds after which the action will be disabled following its first execution. */
			mitigation_timeout?: Input<number | undefined>

			/** Period in seconds over which the counter is being incremented.
Available values: 10, 60, 600, 3600. */
			period: Input<number>

			/** The threshold of requests per period after which the action will be executed for the first time. */
			requests_per_period?: Input<number | undefined>

			/** Defines if ratelimit counting is only done when an origin is reached. */
			requests_to_origin?: Input<boolean | undefined>

			/** The score threshold per period for which the action will be executed the first time. */
			score_per_period?: Input<number | undefined>

			/** The response header name provided by the origin which should contain the score to increment ratelimit counter on. */
			score_response_header_name?: Input<string | undefined>
		} | undefined>

		/** The reference of the rule (the rule ID by default). */
		ref?: Input<string | undefined>
	} | undefined>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareRuleset = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** An informative description of the ruleset. */
	description: Output<string>

	/** The unique ID of the ruleset. */
	id: Output<string>

	/** The kind of the ruleset.
Available values: "managed", "custom", "root", "zone". */
	kind: Output<string>

	/** The human-readable name of the ruleset. */
	name: Output<string>

	/** The phase of the ruleset.
Available values: "ddos_l4", "ddos_l7", "http_config_settings", "http_custom_errors", "http_log_custom_fields", "http_ratelimit", "http_request_cache_settings", "http_request_dynamic_redirect", "http_request_firewall_custom", "http_request_firewall_managed", "http_request_late_transform", "http_request_origin", "http_request_redirect", "http_request_sanitize", "http_request_sbfm", "http_request_transform", "http_response_compression", "http_response_firewall_managed", "http_response_headers_transform", "magic_transit", "magic_transit_ids_managed", "magic_transit_managed", "magic_transit_ratelimit". */
	phase: Output<string>
	rules: Output<Readonly<{

		/** The action to perform when the rule matches.
Available values: "block". */
		action: string
		action_parameters: Readonly<{

			/** List of additional ports that caching can be enabled on. */
			additional_cacheable_ports?: ReadonlyArray<number>
			algorithms: Readonly<{

				/** Name of compression algorithm to enable.
Available values: "none", "auto", "default", "gzip", "brotli". */
				name?: string
			}>

			/** Turn on or off Automatic HTTPS Rewrites. */
			automatic_https_rewrites?: boolean
			autominify: Readonly<{

				/** Minify CSS files. */
				css?: boolean

				/** Minify HTML files. */
				html?: boolean

				/** Minify JS files. */
				js?: boolean
			}>

			/** Turn on or off Browser Integrity Check. */
			bic?: boolean
			browser_ttl: Readonly<{

				/** The TTL (in seconds) if you choose override_origin mode. */
				default?: number

				/** Determines which browser ttl mode to use.
Available values: "respect_origin", "bypass_by_default", "override_origin". */
				mode: string
			}>

			/** Mark whether the request’s response from origin is eligible for caching. Caching itself will still depend on the cache-control header and your other caching configurations. */
			cache?: boolean
			cache_key: Readonly<{

				/** Separate cached content based on the visitor’s device type */
				cache_by_device_type?: boolean

				/** Protect from web cache deception attacks while allowing static assets to be cached */
				cache_deception_armor?: boolean
				custom_key: Readonly<{
					cookie: Readonly<{

						/** Checks for the presence of these cookie names. The presence of these cookies is used in building the cache key. */
						check_presence?: ReadonlyArray<string>

						/** Include these cookies' names and their values. */
						include?: ReadonlyArray<string>
					}>
					header: Readonly<{

						/** Checks for the presence of these header names. The presence of these headers is used in building the cache key. */
						check_presence?: ReadonlyArray<string>

						/** For each header name and list of values combination, check if the request header contains any of the values provided. The presence of the request header and whether any of the values provided are contained in the request header value is used in building the cache key. */
						contains?: Readonly<Record<string, ReadonlyArray<string>>>

						/** Whether or not to include the origin header. A value of true will exclude the origin header in the cache key. */
						exclude_origin?: boolean

						/** Include these headers' names and their values. */
						include?: ReadonlyArray<string>
					}>
					host: Readonly<{

						/** Use the resolved host in the cache key. A value of true will use the resolved host, while a value or false will use the original host. */
						resolved?: boolean
					}>
					query_string: Readonly<{
						exclude: Readonly<{

							/** Determines whether to exclude all query string parameters from the cache key. */
							all?: boolean
							list?: ReadonlyArray<string>
						}>
						include: Readonly<{

							/** Determines whether to include all query string parameters in the cache key. */
							all?: boolean
							list?: ReadonlyArray<string>
						}>
					}>
					user: Readonly<{

						/** Use the user agent's device type in the cache key. */
						device_type?: boolean

						/** Use the user agents's country in the cache key. */
						geo?: boolean

						/** Use the user agent's language in the cache key. */
						lang?: boolean
					}>
				}>

				/** Treat requests with the same query parameters the same, regardless of the order those query parameters are in. A value of true ignores the query strings' order. */
				ignore_query_strings_order?: boolean
			}>
			cache_reserve: Readonly<{

				/** Determines whether cache reserve is enabled. If this is true and a request meets eligibility criteria, Cloudflare will write the resource to cache reserve. */
				eligible: boolean

				/** The minimum file size eligible for store in cache reserve. */
				minimum_file_size: number
			}>

			/** Error response content. */
			content?: string

			/** Content-type header to set with the response.
Available values: "application/json", "text/xml", "text/plain", "text/html". */
			content_type?: string
			cookie_fields: Readonly<{

				/** The name of the field. */
				name: string
			}>

			/** Turn off all active Cloudflare Apps. */
			disable_apps?: boolean

			/** Turn off Real User Monitoring (RUM). */
			disable_rum?: boolean

			/** Turn off Zaraz. */
			disable_zaraz?: boolean
			edge_ttl: Readonly<{

				/** The TTL (in seconds) if you choose override_origin mode. */
				default?: number

				/** edge ttl options
Available values: "respect_origin", "bypass_by_default", "override_origin". */
				mode: string
				status_code_ttl?: Readonly<{

					/** Set the ttl for responses with this specific status code */
					status_code?: number
					status_code_range?: Readonly<{

						/** response status code lower bound */
						from?: number

						/** response status code upper bound */
						to?: number
					}>

					/** Time to cache a response (in seconds). A value of 0 is equivalent to setting the Cache-Control header with the value "no-cache". A value of -1 is equivalent to setting Cache-Control header with the value of "no-store". */
					value: number
				}>
			}>

			/** Turn on or off Email Obfuscation. */
			email_obfuscation?: boolean

			/** Turn on or off Cloudflare Fonts. */
			fonts?: boolean
			from_list: Readonly<{

				/** Expression that evaluates to the list lookup key. */
				key?: string

				/** The name of the list to match against. */
				name?: string
			}>
			from_value: Readonly<{

				/** Keep the query string of the original request. */
				preserve_query_string?: boolean

				/** The status code to be used for the redirect.
Available values: 301, 302, 303, 307, 308. */
				status_code?: number
				target_url: Readonly<{

					/** An expression to evaluate to get the URL to redirect the request to. */
					expression?: string

					/** The URL to redirect the request to. */
					value?: string
				}>
			}>
			headers: Readonly<{

				/** Expression for the header value. */
				expression?: string

				/** Available values: "remove". */
				operation: string

				/** Static value for the header. */
				value?: string
			}>

			/** Rewrite the HTTP Host header. */
			host_header?: string

			/** Turn on or off the Hotlink Protection. */
			hotlink_protection?: boolean

			/** The ID of the ruleset to execute. */
			id?: string

			/** Increment contains the delta to change the score and can be either positive or negative. */
			increment?: number
			matched_data: Readonly<{

				/** The public key to encrypt matched data logs with. */
				public_key: string
			}>

			/** Turn on or off Mirage. */
			mirage?: boolean

			/** Turn on or off Opportunistic Encryption. */
			opportunistic_encryption?: boolean
			origin: Readonly<{

				/** Override the resolved hostname. */
				host?: string

				/** Override the destination port. */
				port?: number
			}>

			/** When enabled, Cloudflare will aim to strictly adhere to RFC 7234. */
			origin_cache_control?: boolean

			/** Generate Cloudflare error pages from issues sent from the origin server. When on, error pages will trigger for issues from the origin */
			origin_error_page_passthru?: boolean
			overrides: Readonly<{

				/** An action to override all rules with. This option has lower precedence than rule and category overrides. */
				action?: string
				categories: Readonly<{

					/** The action to override rules in the category with. */
					action?: string

					/** The name of the category to override. */
					category: string

					/** Whether to enable execution of rules in the category. */
					enabled?: boolean

					/** The sensitivity level to use for rules in the category.
Available values: "default", "medium", "low", "eoff". */
					sensitivity_level?: string
				}>

				/** Whether to enable execution of all rules. This option has lower precedence than rule and category overrides. */
				enabled?: boolean
				rules: Readonly<{

					/** The action to override the rule with. */
					action?: string

					/** Whether to enable execution of the rule. */
					enabled?: boolean

					/** The ID of the rule to override. */
					id: string

					/** The score threshold to use for the rule. */
					score_threshold?: number

					/** The sensitivity level to use for the rule.
Available values: "default", "medium", "low", "eoff". */
					sensitivity_level?: string
				}>

				/** A sensitivity level to set for all rules. This option has lower precedence than rule and category overrides and is only applicable for DDoS phases.
Available values: "default", "medium", "low", "eoff". */
				sensitivity_level?: string
			}>

			/** A list of phases to skip the execution of. This option is incompatible with the ruleset and rulesets options. */
			phases?: ReadonlyArray<string>

			/** Configure the Polish level.
Available values: "off", "lossless", "lossy". */
			polish?: string

			/** A list of legacy security products to skip the execution of. */
			products?: ReadonlyArray<string>
			raw_response_fields: Readonly<{

				/** The name of the field. */
				name: string

				/** Whether to log duplicate values of the same header. */
				preserve_duplicates: boolean
			}>

			/** Define a timeout value between two successive read operations to your origin server. Historically, the timeout value between two read options from Cloudflare to an origin server is 100 seconds. If you are attempting to reduce HTTP 524 errors because of timeouts from an origin server, try increasing this timeout value. */
			read_timeout?: number
			request_fields: Readonly<{

				/** The name of the field. */
				name: string
			}>

			/** Specify whether or not Cloudflare should respect strong ETag (entity tag) headers. When off, Cloudflare converts strong ETag headers to weak ETag headers. */
			respect_strong_etags?: boolean
			response: Readonly<{

				/** The content to return. */
				content: string

				/** The type of the content to return. */
				content_type: string

				/** The status code to return. */
				status_code: number
			}>
			response_fields: Readonly<{

				/** The name of the field. */
				name: string

				/** Whether to log duplicate values of the same header. */
				preserve_duplicates: boolean
			}>

			/** Turn on or off Rocket Loader */
			rocket_loader?: boolean

			/** A mapping of ruleset IDs to a list of rule IDs in that ruleset to skip the execution of. This option is incompatible with the ruleset option. */
			rules?: Readonly<Record<string, ReadonlyArray<string>>>

			/** A ruleset to skip the execution of. This option is incompatible with the rulesets, rules and phases options.
Available values: "current". */
			ruleset?: string

			/** A list of ruleset IDs to skip the execution of. This option is incompatible with the ruleset and phases options. */
			rulesets?: ReadonlyArray<string>

			/** Configure the Security Level.
Available values: "off", "essentially_off", "low", "medium", "high", "under_attack". */
			security_level?: string
			serve_stale: Readonly<{

				/** Defines whether Cloudflare should serve stale content while updating. If true, Cloudflare will not serve stale content while getting the latest content from the origin. */
				disable_stale_while_updating: boolean
			}>

			/** Turn on or off Server Side Excludes. */
			server_side_excludes?: boolean
			sni: Readonly<{

				/** The SNI override. */
				value: string
			}>

			/** Configure the SSL level.
Available values: "off", "flexible", "full", "strict", "origin_pull". */
			ssl?: string

			/** The status code to use for the error. */
			status_code?: number

			/** Turn on or off Signed Exchanges (SXG). */
			sxg?: boolean
			transformed_request_fields: Readonly<{

				/** The name of the field. */
				name: string
			}>
			uri: Readonly<{
				path: Readonly<{

					/** Expression to evaluate for the replacement value. */
					expression?: string

					/** Predefined replacement value. */
					value?: string
				}>
				query: Readonly<{

					/** Expression to evaluate for the replacement value. */
					expression?: string

					/** Predefined replacement value. */
					value?: string
				}>
			}>
		}>

		/** The categories of the rule. */
		categories: ReadonlyArray<string>

		/** An informative description of the rule. */
		description: string

		/** Whether the rule should be executed. */
		enabled: boolean
		exposed_credential_check: Readonly<{

			/** Expression that selects the password used in the credentials check. */
			password_expression: string

			/** Expression that selects the user ID used in the credentials check. */
			username_expression: string
		}>

		/** The expression defining which traffic will match the rule. */
		expression: string

		/** The unique ID of the rule. */
		id: string
		logging: Readonly<{

			/** Whether to generate a log when the rule matches. */
			enabled: boolean
		}>
		ratelimit: Readonly<{

			/** Characteristics of the request on which the ratelimiter counter will be incremented. */
			characteristics: ReadonlyArray<string>

			/** Defines when the ratelimit counter should be incremented. It is optional and defaults to the same as the rule's expression. */
			counting_expression?: string

			/** Period of time in seconds after which the action will be disabled following its first execution. */
			mitigation_timeout?: number

			/** Period in seconds over which the counter is being incremented.
Available values: 10, 60, 600, 3600. */
			period: number

			/** The threshold of requests per period after which the action will be executed for the first time. */
			requests_per_period?: number

			/** Defines if ratelimit counting is only done when an origin is reached. */
			requests_to_origin?: boolean

			/** The score threshold per period for which the action will be executed the first time. */
			score_per_period?: number

			/** The response header name provided by the origin which should contain the score to increment ratelimit counter on. */
			score_response_header_name?: string
		}>

		/** The reference of the rule (the rule ID by default). */
		ref: string
	}>>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareHyperdriveConfigProps = {

	/** Identifier */
	account_id: Input<string>
	caching?: Input<{

		/** When set to true, disables the caching of SQL responses. (Default: false) */
		disabled?: Input<boolean | undefined>

		/** When present, specifies max duration for which items should persist in the cache. Not returned if set to default. (Default: 60) */
		max_age?: Input<number | undefined>

		/** When present, indicates the number of seconds cache may serve the response after it becomes stale. Not returned if set to default. (Default: 15) */
		stale_while_revalidate?: Input<number | undefined>
	} | undefined>
	name: Input<string>
	origin: Input<{

		/** The Client ID of the Access token to use when connecting to the origin database. */
		access_client_id?: Input<string | undefined>

		/** The Client Secret of the Access token to use when connecting to the origin database. This value is write-only and never returned by the API. */
		access_client_secret?: Input<string | undefined>

		/** The name of your origin database. */
		database: Input<string>

		/** The host (hostname or IP) of your origin database. */
		host: Input<string>

		/** The password required to access your origin database. This value is write-only and never returned by the API. */
		password: Input<string>

		/** The port (default: 5432 for Postgres) of your origin database. */
		port?: Input<number | undefined>

		/** Specifies the URL scheme used to connect to your origin database.
Available values: "postgres", "postgresql". */
		scheme: Input<string>

		/** The user of your origin database. */
		user: Input<string>
	}>
}

type CloudflareHyperdriveConfig = Readonly<{

	/** Identifier */
	account_id: Output<string>
	caching: Output<Readonly<{

		/** When set to true, disables the caching of SQL responses. (Default: false) */
		disabled: boolean

		/** When present, specifies max duration for which items should persist in the cache. Not returned if set to default. (Default: 60) */
		max_age: number

		/** When present, indicates the number of seconds cache may serve the response after it becomes stale. Not returned if set to default. (Default: 15) */
		stale_while_revalidate: number
	}>>

	/** When the Hyperdrive configuration was created. */
	created_on: Output<string>

	/** Identifier */
	id: Output<string>

	/** When the Hyperdrive configuration was last modified. */
	modified_on: Output<string>
	name: Output<string>
	origin: Output<Readonly<{

		/** The Client ID of the Access token to use when connecting to the origin database. */
		access_client_id: string

		/** The Client Secret of the Access token to use when connecting to the origin database. This value is write-only and never returned by the API. */
		access_client_secret: string

		/** The name of your origin database. */
		database: string

		/** The host (hostname or IP) of your origin database. */
		host: string

		/** The password required to access your origin database. This value is write-only and never returned by the API. */
		password: string

		/** The port (default: 5432 for Postgres) of your origin database. */
		port: number

		/** Specifies the URL scheme used to connect to your origin database.
Available values: "postgres", "postgresql". */
		scheme: string

		/** The user of your origin database. */
		user: string
	}>>
}>

type CloudflareStreamAudioTrackProps = {

	/** The account identifier tag. */
	account_id: Input<string>

	/** The unique identifier for an additional audio track. */
	audio_identifier?: Input<string | undefined>

	/** Denotes whether the audio track will be played by default in a player. */
	default?: Input<boolean | undefined>

	/** A Cloudflare-generated unique identifier for a media item. */
	identifier: Input<string>

	/** A string to uniquely identify the track amongst other audio track labels for the specified video. */
	label?: Input<string | undefined>
}

type CloudflareStreamAudioTrack = Readonly<{

	/** The account identifier tag. */
	account_id: Output<string>

	/** The unique identifier for an additional audio track. */
	audio_identifier: Output<string | undefined>

	/** Denotes whether the audio track will be played by default in a player. */
	default: Output<boolean>

	/** A Cloudflare-generated unique identifier for a media item. */
	identifier: Output<string>

	/** A string to uniquely identify the track amongst other audio track labels for the specified video. */
	label: Output<string | undefined>

	/** Specifies the processing status of the video.
Available values: "queued", "ready", "error". */
	status: Output<string>

	/** A Cloudflare-generated unique identifier for a media item. */
	uid: Output<string>
}>

type CloudflareAccountDnsSettingsInternalViewProps = {

	/** Identifier */
	account_id: Input<string>

	/** The name of the view. */
	name: Input<string>

	/** The list of zones linked to this view. */
	zones: Input<Array<Input<string>>>
}

type CloudflareAccountDnsSettingsInternalView = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** When the view was created. */
	created_time: Output<string>

	/** Identifier */
	id: Output<string>

	/** When the view was last modified. */
	modified_time: Output<string>

	/** The name of the view. */
	name: Output<string>

	/** The list of zones linked to this view. */
	zones: ReadonlyArray<string>
}>

type CloudflareCloudConnectorRulesProps = {
	rules?: Input<{

		/** Cloud Provider type
Available values: "aws_s3", "r2", "gcp_storage", "azure_storage". */
		cloud_provider?: Input<string | undefined>
		description?: Input<string | undefined>
		enabled?: Input<boolean | undefined>
		expression?: Input<string | undefined>
		id?: Input<string | undefined>
		parameters?: Input<{

			/** Host to perform Cloud Connection to */
			host?: Input<string | undefined>
		} | undefined>
	} | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareCloudConnectorRules = Readonly<{

	/** Cloud Provider type
Available values: "aws_s3", "r2", "gcp_storage", "azure_storage". */
	cloud_provider: Output<string>
	description: Output<string>
	enabled: Output<boolean>
	expression: Output<string>
	id: Output<string>
	parameters: Output<Readonly<{

		/** Host to perform Cloud Connection to */
		host: string
	}>>
	rules: Output<Readonly<{

		/** Cloud Provider type
Available values: "aws_s3", "r2", "gcp_storage", "azure_storage". */
		cloud_provider: string
		description: string
		enabled: boolean
		expression: string
		id: string
		parameters: Readonly<{

			/** Host to perform Cloud Connection to */
			host?: string
		}>
	}>>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustAccessTagProps = {

	/** Identifier */
	account_id: Input<string>

	/** The name of the tag */
	name: Input<string>
}

type CloudflareZeroTrustAccessTag = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The number of applications that have this tag */
	app_count: Output<number>
	created_at: Output<string>

	/** The name of the tag */
	id: Output<string>

	/** The name of the tag */
	name: Output<string>
	updated_at: Output<string>
}>

type CloudflareWebAnalyticsSiteProps = {

	/** Identifier */
	account_id: Input<string>

	/** If enabled, the JavaScript snippet is automatically injected for orange-clouded sites. */
	auto_install?: Input<boolean | undefined>

	/** Enables or disables RUM. This option can be used only when auto_install is set to true. */
	enabled?: Input<boolean | undefined>

	/** The hostname to use for gray-clouded sites. */
	host?: Input<string | undefined>

	/** If enabled, the JavaScript snippet will not be injected for visitors from the EU. */
	lite?: Input<boolean | undefined>

	/** The zone identifier. */
	zone_tag?: Input<string | undefined>
}

type CloudflareWebAnalyticsSite = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** If enabled, the JavaScript snippet is automatically injected for orange-clouded sites. */
	auto_install: Output<boolean | undefined>
	created: Output<string>

	/** Enables or disables RUM. This option can be used only when auto_install is set to true. */
	enabled: Output<boolean | undefined>

	/** The hostname to use for gray-clouded sites. */
	host: Output<string | undefined>

	/** The Web Analytics site identifier. */
	id: Output<string>

	/** If enabled, the JavaScript snippet will not be injected for visitors from the EU. */
	lite: Output<boolean | undefined>
	rules: Output<Readonly<{
		created: string

		/** The hostname the rule will be applied to. */
		host: string

		/** The Web Analytics rule identifier. */
		id: string

		/** Whether the rule includes or excludes traffic from being measured. */
		inclusive: boolean

		/** Whether the rule is paused or not. */
		is_paused: boolean

		/** The paths the rule will be applied to. */
		paths: ReadonlyArray<string>
		priority: number
	}>>
	ruleset: Output<Readonly<{

		/** Whether the ruleset is enabled. */
		enabled: boolean

		/** The Web Analytics ruleset identifier. */
		id: string
		zone_name: string

		/** The zone identifier. */
		zone_tag: string
	}>>

	/** The Web Analytics site identifier. */
	site_tag: Output<string>

	/** The Web Analytics site token. */
	site_token: Output<string>

	/** Encoded JavaScript snippet. */
	snippet: Output<string>

	/** The zone identifier. */
	zone_tag: Output<string | undefined>
}>

type CloudflareUserAgentBlockingRuleProps = {
	configuration: Input<{

		/** The configuration target. You must set the target to `ip` when specifying an IP address in the rule.
Available values: "ip". */
		target?: Input<string | undefined>

		/** The IP address to match. This address will be compared to the IP address of incoming requests. */
		value?: Input<string | undefined>
	}>

	/** The action to apply to a matched request.
Available values: "block", "challenge", "whitelist", "js_challenge", "managed_challenge". */
	mode: Input<string>

	/** The unique identifier of the User Agent Blocking rule. */
	ua_rule_id?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareUserAgentBlockingRule = Readonly<{
	configuration: Output<Readonly<{

		/** The configuration target. You must set the target to `ip` when specifying an IP address in the rule.
Available values: "ip". */
		target: string

		/** The IP address to match. This address will be compared to the IP address of incoming requests. */
		value: string
	}>>

	/** The action to apply to a matched request.
Available values: "block", "challenge", "whitelist", "js_challenge", "managed_challenge". */
	mode: Output<string>

	/** The unique identifier of the User Agent Blocking rule. */
	ua_rule_id: Output<string | undefined>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareWaitingRoomProps = {
	additional_routes?: Input<{

		/** The hostname to which this waiting room will be applied (no wildcards). The hostname must be the primary domain, subdomain, or custom hostname (if using SSL for SaaS) of this zone. Please do not include the scheme (http:// or https://). */
		host?: Input<string | undefined>

		/** Sets the path within the host to enable the waiting room on. The waiting room will be enabled for all subpaths as well. If there are two waiting rooms on the same subpath, the waiting room for the most specific path will be chosen. Wildcards and query parameters are not supported. */
		path?: Input<string | undefined>
	} | undefined>
	cookie_attributes?: Input<{

		/** Configures the SameSite attribute on the waiting room cookie. Value `auto` will be translated to `lax` or `none` depending if **Always Use HTTPS** is enabled. Note that when using value `none`, the secure attribute cannot be set to `never`.
Available values: "auto", "lax", "none", "strict". */
		samesite?: Input<string | undefined>

		/** Configures the Secure attribute on the waiting room cookie. Value `always` indicates that the Secure attribute will be set in the Set-Cookie header, `never` indicates that the Secure attribute will not be set, and `auto` will set the Secure attribute depending if **Always Use HTTPS** is enabled.
Available values: "auto", "always", "never". */
		secure?: Input<string | undefined>
	} | undefined>

	/** Appends a '_' + a custom suffix to the end of Cloudflare Waiting Room's cookie name(__cf_waitingroom). If `cookie_suffix` is "abcd", the cookie name will be `__cf_waitingroom_abcd`. This field is required if using `additional_routes`. */
	cookie_suffix?: Input<string | undefined>

	/** Only available for the Waiting Room Advanced subscription. This is a template html file that will be rendered at the edge. If no custom_page_html is provided, the default waiting room will be used. The template is based on mustache ( https://mustache.github.io/ ). There are several variables that are evaluated by the Cloudflare edge:
1. {{`waitTimeKnown`}} Acts like a boolean value that indicates the behavior to take when wait time is not available, for instance when queue_all is **true**.
2. {{`waitTimeFormatted`}} Estimated wait time for the user. For example, five minutes. Alternatively, you can use:
3. {{`waitTime`}} Number of minutes of estimated wait for a user.
4. {{`waitTimeHours`}} Number of hours of estimated wait for a user (`Math.floor(waitTime/60)`).
5. {{`waitTimeHourMinutes`}} Number of minutes above the `waitTimeHours` value (`waitTime%60`).
6. {{`queueIsFull`}} Changes to **true** when no more people can be added to the queue.

To view the full list of variables, look at the `cfWaitingRoom` object described under the `json_response_enabled` property in other Waiting Room API calls. */
	custom_page_html?: Input<string | undefined>

	/** The language of the default page template. If no default_template_language is provided, then `en-US` (English) will be used.
Available values: "en-US", "es-ES", "de-DE", "fr-FR", "it-IT", "ja-JP", "ko-KR", "pt-BR", "zh-CN", "zh-TW", "nl-NL", "pl-PL", "id-ID", "tr-TR", "ar-EG", "ru-RU", "fa-IR", "bg-BG", "hr-HR", "cs-CZ", "da-DK", "fi-FI", "lt-LT", "ms-MY", "nb-NO", "ro-RO", "el-GR", "he-IL", "hi-IN", "hu-HU", "sr-BA", "sk-SK", "sl-SI", "sv-SE", "tl-PH", "th-TH", "uk-UA", "vi-VN". */
	default_template_language?: Input<string | undefined>

	/** A note that you can use to add more details about the waiting room. */
	description?: Input<string | undefined>

	/** Only available for the Waiting Room Advanced subscription. Disables automatic renewal of session cookies. If `true`, an accepted user will have session_duration minutes to browse the site. After that, they will have to go through the waiting room again. If `false`, a user's session cookie will be automatically renewed on every request. */
	disable_session_renewal?: Input<boolean | undefined>

	/** A list of enabled origin commands. */
	enabled_origin_commands?: Input<Array<Input<string>> | undefined>

	/** The host name to which the waiting room will be applied (no wildcards). Please do not include the scheme (http:// or https://). The host and path combination must be unique. */
	host: Input<string>

	/** Only available for the Waiting Room Advanced subscription. If `true`, requests to the waiting room with the header `Accept: application/json` will receive a JSON response object with information on the user's status in the waiting room as opposed to the configured static HTML page. This JSON response object has one property `cfWaitingRoom` which is an object containing the following fields:
1. `inWaitingRoom`: Boolean indicating if the user is in the waiting room (always **true**).
2. `waitTimeKnown`: Boolean indicating if the current estimated wait times are accurate. If **false**, they are not available.
3. `waitTime`: Valid only when `waitTimeKnown` is **true**. Integer indicating the current estimated time in minutes the user will wait in the waiting room. When `queueingMethod` is **random**, this is set to `waitTime50Percentile`.
4. `waitTime25Percentile`: Valid only when `queueingMethod` is **random** and `waitTimeKnown` is **true**. Integer indicating the current estimated maximum wait time for the 25% of users that gain entry the fastest (25th percentile).
5. `waitTime50Percentile`: Valid only when `queueingMethod` is **random** and `waitTimeKnown` is **true**. Integer indicating the current estimated maximum wait time for the 50% of users that gain entry the fastest (50th percentile). In other words, half of the queued users are expected to let into the origin website before `waitTime50Percentile` and half are expected to be let in after it.
6. `waitTime75Percentile`: Valid only when `queueingMethod` is **random** and `waitTimeKnown` is **true**. Integer indicating the current estimated maximum wait time for the 75% of users that gain entry the fastest (75th percentile).
7. `waitTimeFormatted`: String displaying the `waitTime` formatted in English for users. If `waitTimeKnown` is **false**, `waitTimeFormatted` will display **unavailable**.
8. `queueIsFull`: Boolean indicating if the waiting room's queue is currently full and not accepting new users at the moment.
9. `queueAll`: Boolean indicating if all users will be queued in the waiting room and no one will be let into the origin website.
10. `lastUpdated`: String displaying the timestamp as an ISO 8601 string of the user's last attempt to leave the waiting room and be let into the origin website. The user is able to make another attempt after `refreshIntervalSeconds` past this time. If the user makes a request too soon, it will be ignored and `lastUpdated` will not change.
11. `refreshIntervalSeconds`: Integer indicating the number of seconds after `lastUpdated` until the user is able to make another attempt to leave the waiting room and be let into the origin website. When the `queueingMethod` is `reject`, there is no specified refresh time — it will always be **zero**.
12. `queueingMethod`: The queueing method currently used by the waiting room. It is either **fifo**, **random**, **passthrough**, or **reject**.
13. `isFIFOQueue`: Boolean indicating if the waiting room uses a FIFO (First-In-First-Out) queue.
14. `isRandomQueue`: Boolean indicating if the waiting room uses a Random queue where users gain access randomly.
15. `isPassthroughQueue`: Boolean indicating if the waiting room uses a passthrough queue. Keep in mind that when passthrough is enabled, this JSON response will only exist when `queueAll` is **true** or `isEventPrequeueing` is **true** because in all other cases requests will go directly to the origin.
16. `isRejectQueue`: Boolean indicating if the waiting room uses a reject queue.
17. `isEventActive`: Boolean indicating if an event is currently occurring. Events are able to change a waiting room's behavior during a specified period of time. For additional information, look at the event properties `prequeue_start_time`, `event_start_time`, and `event_end_time` in the documentation for creating waiting room events. Events are considered active between these start and end times, as well as during the prequeueing period if it exists.
18. `isEventPrequeueing`: Valid only when `isEventActive` is **true**. Boolean indicating if an event is currently prequeueing users before it starts.
19. `timeUntilEventStart`: Valid only when `isEventPrequeueing` is **true**. Integer indicating the number of minutes until the event starts.
20. `timeUntilEventStartFormatted`: String displaying the `timeUntilEventStart` formatted in English for users. If `isEventPrequeueing` is **false**, `timeUntilEventStartFormatted` will display **unavailable**.
21. `timeUntilEventEnd`: Valid only when `isEventActive` is **true**. Integer indicating the number of minutes until the event ends.
22. `timeUntilEventEndFormatted`: String displaying the `timeUntilEventEnd` formatted in English for users. If `isEventActive` is **false**, `timeUntilEventEndFormatted` will display **unavailable**.
23. `shuffleAtEventStart`: Valid only when `isEventActive` is **true**. Boolean indicating if the users in the prequeue are shuffled randomly when the event starts.

An example cURL to a waiting room could be:

	curl -X GET "https://example.com/waitingroom" \
		-H "Accept: application/json"

If `json_response_enabled` is **true** and the request hits the waiting room, an example JSON response when `queueingMethod` is **fifo** and no event is active could be:

	{
		"cfWaitingRoom": {
			"inWaitingRoom": true,
			"waitTimeKnown": true,
			"waitTime": 10,
			"waitTime25Percentile": 0,
			"waitTime50Percentile": 0,
			"waitTime75Percentile": 0,
			"waitTimeFormatted": "10 minutes",
			"queueIsFull": false,
			"queueAll": false,
			"lastUpdated": "2020-08-03T23:46:00.000Z",
			"refreshIntervalSeconds": 20,
			"queueingMethod": "fifo",
			"isFIFOQueue": true,
			"isRandomQueue": false,
			"isPassthroughQueue": false,
			"isRejectQueue": false,
			"isEventActive": false,
			"isEventPrequeueing": false,
			"timeUntilEventStart": 0,
			"timeUntilEventStartFormatted": "unavailable",
			"timeUntilEventEnd": 0,
			"timeUntilEventEndFormatted": "unavailable",
			"shuffleAtEventStart": false
		}
	}

If `json_response_enabled` is **true** and the request hits the waiting room, an example JSON response when `queueingMethod` is **random** and an event is active could be:

	{
		"cfWaitingRoom": {
			"inWaitingRoom": true,
			"waitTimeKnown": true,
			"waitTime": 10,
			"waitTime25Percentile": 5,
			"waitTime50Percentile": 10,
			"waitTime75Percentile": 15,
			"waitTimeFormatted": "5 minutes to 15 minutes",
			"queueIsFull": false,
			"queueAll": false,
			"lastUpdated": "2020-08-03T23:46:00.000Z",
			"refreshIntervalSeconds": 20,
			"queueingMethod": "random",
			"isFIFOQueue": false,
			"isRandomQueue": true,
			"isPassthroughQueue": false,
			"isRejectQueue": false,
			"isEventActive": true,
			"isEventPrequeueing": false,
			"timeUntilEventStart": 0,
			"timeUntilEventStartFormatted": "unavailable",
			"timeUntilEventEnd": 15,
			"timeUntilEventEndFormatted": "15 minutes",
			"shuffleAtEventStart": true
		}
	}. */
	json_response_enabled?: Input<boolean | undefined>

	/** A unique name to identify the waiting room. Only alphanumeric characters, hyphens and underscores are allowed. */
	name: Input<string>

	/** Sets the number of new users that will be let into the route every minute. This value is used as baseline for the number of users that are let in per minute. So it is possible that there is a little more or little less traffic coming to the route based on the traffic patterns at that time around the world. */
	new_users_per_minute: Input<number>

	/** Sets the path within the host to enable the waiting room on. The waiting room will be enabled for all subpaths as well. If there are two waiting rooms on the same subpath, the waiting room for the most specific path will be chosen. Wildcards and query parameters are not supported. */
	path?: Input<string | undefined>

	/** If queue_all is `true`, all the traffic that is coming to a route will be sent to the waiting room. No new traffic can get to the route once this field is set and estimated time will become unavailable. */
	queue_all?: Input<boolean | undefined>

	/** Sets the queueing method used by the waiting room. Changing this parameter from the **default** queueing method is only available for the Waiting Room Advanced subscription. Regardless of the queueing method, if `queue_all` is enabled or an event is prequeueing, users in the waiting room will not be accepted to the origin. These users will always see a waiting room page that refreshes automatically. The valid queueing methods are:
1. `fifo` **(default)**: First-In-First-Out queue where customers gain access in the order they arrived.
2. `random`: Random queue where customers gain access randomly, regardless of arrival time.
3. `passthrough`: Users will pass directly through the waiting room and into the origin website. As a result, any configured limits will not be respected while this is enabled. This method can be used as an alternative to disabling a waiting room (with `suspended`) so that analytics are still reported. This can be used if you wish to allow all traffic normally, but want to restrict traffic during a waiting room event, or vice versa.
4. `reject`: Users will be immediately rejected from the waiting room. As a result, no users will reach the origin website while this is enabled. This can be used if you wish to reject all traffic while performing maintenance, block traffic during a specified period of time (an event), or block traffic while events are not occurring. Consider a waiting room used for vaccine distribution that only allows traffic during sign-up events, and otherwise blocks all traffic. For this case, the waiting room uses `reject`, and its events override this with `fifo`, `random`, or `passthrough`. When this queueing method is enabled and neither `queueAll` is enabled nor an event is prequeueing, the waiting room page **will not refresh automatically**.
Available values: "fifo", "random", "passthrough", "reject". */
	queueing_method?: Input<string | undefined>

	/** HTTP status code returned to a user while in the queue.
Available values: 200, 202, 429. */
	queueing_status_code?: Input<number | undefined>

	/** Lifetime of a cookie (in minutes) set by Cloudflare for users who get access to the route. If a user is not seen by Cloudflare again in that time period, they will be treated as a new user that visits the route. */
	session_duration?: Input<number | undefined>

	/** Suspends or allows traffic going to the waiting room. If set to `true`, the traffic will not go to the waiting room. */
	suspended?: Input<boolean | undefined>

	/** Sets the total number of active user sessions on the route at a point in time. A route is a combination of host and path on which a waiting room is available. This value is used as a baseline for the total number of active user sessions on the route. It is possible to have a situation where there are more or less active users sessions on the route based on the traffic patterns at that time around the world. */
	total_active_users: Input<number>

	/** Which action to take when a bot is detected using Turnstile. `log` will
have no impact on queueing behavior, simply keeping track of how many
bots are detected in Waiting Room Analytics. `infinite_queue` will send
bots to a false queueing state, where they will never reach your
origin. `infinite_queue` requires Advanced Waiting Room.
Available values: "log", "infinite_queue". */
	turnstile_action?: Input<string | undefined>

	/** Which Turnstile widget type to use for detecting bot traffic. See
[the Turnstile documentation](https://developers.cloudflare.com/turnstile/concepts/widget/#widget-types)
for the definitions of these widget types. Set to `off` to disable the
Turnstile integration entirely. Setting this to anything other than
`off` or `invisible` requires Advanced Waiting Room.
Available values: "off", "invisible", "visible_non_interactive", "visible_managed". */
	turnstile_mode?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareWaitingRoom = Readonly<{
	additional_routes: Output<Readonly<{

		/** The hostname to which this waiting room will be applied (no wildcards). The hostname must be the primary domain, subdomain, or custom hostname (if using SSL for SaaS) of this zone. Please do not include the scheme (http:// or https://). */
		host: string

		/** Sets the path within the host to enable the waiting room on. The waiting room will be enabled for all subpaths as well. If there are two waiting rooms on the same subpath, the waiting room for the most specific path will be chosen. Wildcards and query parameters are not supported. */
		path: string
	}>>
	cookie_attributes: Output<Readonly<{

		/** Configures the SameSite attribute on the waiting room cookie. Value `auto` will be translated to `lax` or `none` depending if **Always Use HTTPS** is enabled. Note that when using value `none`, the secure attribute cannot be set to `never`.
Available values: "auto", "lax", "none", "strict". */
		samesite: string

		/** Configures the Secure attribute on the waiting room cookie. Value `always` indicates that the Secure attribute will be set in the Set-Cookie header, `never` indicates that the Secure attribute will not be set, and `auto` will set the Secure attribute depending if **Always Use HTTPS** is enabled.
Available values: "auto", "always", "never". */
		secure: string
	}>>

	/** Appends a '_' + a custom suffix to the end of Cloudflare Waiting Room's cookie name(__cf_waitingroom). If `cookie_suffix` is "abcd", the cookie name will be `__cf_waitingroom_abcd`. This field is required if using `additional_routes`. */
	cookie_suffix: Output<string | undefined>
	created_on: Output<string>

	/** Only available for the Waiting Room Advanced subscription. This is a template html file that will be rendered at the edge. If no custom_page_html is provided, the default waiting room will be used. The template is based on mustache ( https://mustache.github.io/ ). There are several variables that are evaluated by the Cloudflare edge:
1. {{`waitTimeKnown`}} Acts like a boolean value that indicates the behavior to take when wait time is not available, for instance when queue_all is **true**.
2. {{`waitTimeFormatted`}} Estimated wait time for the user. For example, five minutes. Alternatively, you can use:
3. {{`waitTime`}} Number of minutes of estimated wait for a user.
4. {{`waitTimeHours`}} Number of hours of estimated wait for a user (`Math.floor(waitTime/60)`).
5. {{`waitTimeHourMinutes`}} Number of minutes above the `waitTimeHours` value (`waitTime%60`).
6. {{`queueIsFull`}} Changes to **true** when no more people can be added to the queue.

To view the full list of variables, look at the `cfWaitingRoom` object described under the `json_response_enabled` property in other Waiting Room API calls. */
	custom_page_html: Output<string>

	/** The language of the default page template. If no default_template_language is provided, then `en-US` (English) will be used.
Available values: "en-US", "es-ES", "de-DE", "fr-FR", "it-IT", "ja-JP", "ko-KR", "pt-BR", "zh-CN", "zh-TW", "nl-NL", "pl-PL", "id-ID", "tr-TR", "ar-EG", "ru-RU", "fa-IR", "bg-BG", "hr-HR", "cs-CZ", "da-DK", "fi-FI", "lt-LT", "ms-MY", "nb-NO", "ro-RO", "el-GR", "he-IL", "hi-IN", "hu-HU", "sr-BA", "sk-SK", "sl-SI", "sv-SE", "tl-PH", "th-TH", "uk-UA", "vi-VN". */
	default_template_language: Output<string>

	/** A note that you can use to add more details about the waiting room. */
	description: Output<string>

	/** Only available for the Waiting Room Advanced subscription. Disables automatic renewal of session cookies. If `true`, an accepted user will have session_duration minutes to browse the site. After that, they will have to go through the waiting room again. If `false`, a user's session cookie will be automatically renewed on every request. */
	disable_session_renewal: Output<boolean>

	/** A list of enabled origin commands. */
	enabled_origin_commands: ReadonlyArray<string>

	/** The host name to which the waiting room will be applied (no wildcards). Please do not include the scheme (http:// or https://). The host and path combination must be unique. */
	host: Output<string>
	id: Output<string>

	/** Only available for the Waiting Room Advanced subscription. If `true`, requests to the waiting room with the header `Accept: application/json` will receive a JSON response object with information on the user's status in the waiting room as opposed to the configured static HTML page. This JSON response object has one property `cfWaitingRoom` which is an object containing the following fields:
1. `inWaitingRoom`: Boolean indicating if the user is in the waiting room (always **true**).
2. `waitTimeKnown`: Boolean indicating if the current estimated wait times are accurate. If **false**, they are not available.
3. `waitTime`: Valid only when `waitTimeKnown` is **true**. Integer indicating the current estimated time in minutes the user will wait in the waiting room. When `queueingMethod` is **random**, this is set to `waitTime50Percentile`.
4. `waitTime25Percentile`: Valid only when `queueingMethod` is **random** and `waitTimeKnown` is **true**. Integer indicating the current estimated maximum wait time for the 25% of users that gain entry the fastest (25th percentile).
5. `waitTime50Percentile`: Valid only when `queueingMethod` is **random** and `waitTimeKnown` is **true**. Integer indicating the current estimated maximum wait time for the 50% of users that gain entry the fastest (50th percentile). In other words, half of the queued users are expected to let into the origin website before `waitTime50Percentile` and half are expected to be let in after it.
6. `waitTime75Percentile`: Valid only when `queueingMethod` is **random** and `waitTimeKnown` is **true**. Integer indicating the current estimated maximum wait time for the 75% of users that gain entry the fastest (75th percentile).
7. `waitTimeFormatted`: String displaying the `waitTime` formatted in English for users. If `waitTimeKnown` is **false**, `waitTimeFormatted` will display **unavailable**.
8. `queueIsFull`: Boolean indicating if the waiting room's queue is currently full and not accepting new users at the moment.
9. `queueAll`: Boolean indicating if all users will be queued in the waiting room and no one will be let into the origin website.
10. `lastUpdated`: String displaying the timestamp as an ISO 8601 string of the user's last attempt to leave the waiting room and be let into the origin website. The user is able to make another attempt after `refreshIntervalSeconds` past this time. If the user makes a request too soon, it will be ignored and `lastUpdated` will not change.
11. `refreshIntervalSeconds`: Integer indicating the number of seconds after `lastUpdated` until the user is able to make another attempt to leave the waiting room and be let into the origin website. When the `queueingMethod` is `reject`, there is no specified refresh time — it will always be **zero**.
12. `queueingMethod`: The queueing method currently used by the waiting room. It is either **fifo**, **random**, **passthrough**, or **reject**.
13. `isFIFOQueue`: Boolean indicating if the waiting room uses a FIFO (First-In-First-Out) queue.
14. `isRandomQueue`: Boolean indicating if the waiting room uses a Random queue where users gain access randomly.
15. `isPassthroughQueue`: Boolean indicating if the waiting room uses a passthrough queue. Keep in mind that when passthrough is enabled, this JSON response will only exist when `queueAll` is **true** or `isEventPrequeueing` is **true** because in all other cases requests will go directly to the origin.
16. `isRejectQueue`: Boolean indicating if the waiting room uses a reject queue.
17. `isEventActive`: Boolean indicating if an event is currently occurring. Events are able to change a waiting room's behavior during a specified period of time. For additional information, look at the event properties `prequeue_start_time`, `event_start_time`, and `event_end_time` in the documentation for creating waiting room events. Events are considered active between these start and end times, as well as during the prequeueing period if it exists.
18. `isEventPrequeueing`: Valid only when `isEventActive` is **true**. Boolean indicating if an event is currently prequeueing users before it starts.
19. `timeUntilEventStart`: Valid only when `isEventPrequeueing` is **true**. Integer indicating the number of minutes until the event starts.
20. `timeUntilEventStartFormatted`: String displaying the `timeUntilEventStart` formatted in English for users. If `isEventPrequeueing` is **false**, `timeUntilEventStartFormatted` will display **unavailable**.
21. `timeUntilEventEnd`: Valid only when `isEventActive` is **true**. Integer indicating the number of minutes until the event ends.
22. `timeUntilEventEndFormatted`: String displaying the `timeUntilEventEnd` formatted in English for users. If `isEventActive` is **false**, `timeUntilEventEndFormatted` will display **unavailable**.
23. `shuffleAtEventStart`: Valid only when `isEventActive` is **true**. Boolean indicating if the users in the prequeue are shuffled randomly when the event starts.

An example cURL to a waiting room could be:

	curl -X GET "https://example.com/waitingroom" \
		-H "Accept: application/json"

If `json_response_enabled` is **true** and the request hits the waiting room, an example JSON response when `queueingMethod` is **fifo** and no event is active could be:

	{
		"cfWaitingRoom": {
			"inWaitingRoom": true,
			"waitTimeKnown": true,
			"waitTime": 10,
			"waitTime25Percentile": 0,
			"waitTime50Percentile": 0,
			"waitTime75Percentile": 0,
			"waitTimeFormatted": "10 minutes",
			"queueIsFull": false,
			"queueAll": false,
			"lastUpdated": "2020-08-03T23:46:00.000Z",
			"refreshIntervalSeconds": 20,
			"queueingMethod": "fifo",
			"isFIFOQueue": true,
			"isRandomQueue": false,
			"isPassthroughQueue": false,
			"isRejectQueue": false,
			"isEventActive": false,
			"isEventPrequeueing": false,
			"timeUntilEventStart": 0,
			"timeUntilEventStartFormatted": "unavailable",
			"timeUntilEventEnd": 0,
			"timeUntilEventEndFormatted": "unavailable",
			"shuffleAtEventStart": false
		}
	}

If `json_response_enabled` is **true** and the request hits the waiting room, an example JSON response when `queueingMethod` is **random** and an event is active could be:

	{
		"cfWaitingRoom": {
			"inWaitingRoom": true,
			"waitTimeKnown": true,
			"waitTime": 10,
			"waitTime25Percentile": 5,
			"waitTime50Percentile": 10,
			"waitTime75Percentile": 15,
			"waitTimeFormatted": "5 minutes to 15 minutes",
			"queueIsFull": false,
			"queueAll": false,
			"lastUpdated": "2020-08-03T23:46:00.000Z",
			"refreshIntervalSeconds": 20,
			"queueingMethod": "random",
			"isFIFOQueue": false,
			"isRandomQueue": true,
			"isPassthroughQueue": false,
			"isRejectQueue": false,
			"isEventActive": true,
			"isEventPrequeueing": false,
			"timeUntilEventStart": 0,
			"timeUntilEventStartFormatted": "unavailable",
			"timeUntilEventEnd": 15,
			"timeUntilEventEndFormatted": "15 minutes",
			"shuffleAtEventStart": true
		}
	}. */
	json_response_enabled: Output<boolean>
	modified_on: Output<string>

	/** A unique name to identify the waiting room. Only alphanumeric characters, hyphens and underscores are allowed. */
	name: Output<string>

	/** Sets the number of new users that will be let into the route every minute. This value is used as baseline for the number of users that are let in per minute. So it is possible that there is a little more or little less traffic coming to the route based on the traffic patterns at that time around the world. */
	new_users_per_minute: Output<number>

	/** An ISO 8601 timestamp that marks when the next event will begin queueing. */
	next_event_prequeue_start_time: Output<string>

	/** An ISO 8601 timestamp that marks when the next event will start. */
	next_event_start_time: Output<string>

	/** Sets the path within the host to enable the waiting room on. The waiting room will be enabled for all subpaths as well. If there are two waiting rooms on the same subpath, the waiting room for the most specific path will be chosen. Wildcards and query parameters are not supported. */
	path: Output<string>

	/** If queue_all is `true`, all the traffic that is coming to a route will be sent to the waiting room. No new traffic can get to the route once this field is set and estimated time will become unavailable. */
	queue_all: Output<boolean>

	/** Sets the queueing method used by the waiting room. Changing this parameter from the **default** queueing method is only available for the Waiting Room Advanced subscription. Regardless of the queueing method, if `queue_all` is enabled or an event is prequeueing, users in the waiting room will not be accepted to the origin. These users will always see a waiting room page that refreshes automatically. The valid queueing methods are:
1. `fifo` **(default)**: First-In-First-Out queue where customers gain access in the order they arrived.
2. `random`: Random queue where customers gain access randomly, regardless of arrival time.
3. `passthrough`: Users will pass directly through the waiting room and into the origin website. As a result, any configured limits will not be respected while this is enabled. This method can be used as an alternative to disabling a waiting room (with `suspended`) so that analytics are still reported. This can be used if you wish to allow all traffic normally, but want to restrict traffic during a waiting room event, or vice versa.
4. `reject`: Users will be immediately rejected from the waiting room. As a result, no users will reach the origin website while this is enabled. This can be used if you wish to reject all traffic while performing maintenance, block traffic during a specified period of time (an event), or block traffic while events are not occurring. Consider a waiting room used for vaccine distribution that only allows traffic during sign-up events, and otherwise blocks all traffic. For this case, the waiting room uses `reject`, and its events override this with `fifo`, `random`, or `passthrough`. When this queueing method is enabled and neither `queueAll` is enabled nor an event is prequeueing, the waiting room page **will not refresh automatically**.
Available values: "fifo", "random", "passthrough", "reject". */
	queueing_method: Output<string>

	/** HTTP status code returned to a user while in the queue.
Available values: 200, 202, 429. */
	queueing_status_code: Output<number>

	/** Lifetime of a cookie (in minutes) set by Cloudflare for users who get access to the route. If a user is not seen by Cloudflare again in that time period, they will be treated as a new user that visits the route. */
	session_duration: Output<number>

	/** Suspends or allows traffic going to the waiting room. If set to `true`, the traffic will not go to the waiting room. */
	suspended: Output<boolean>

	/** Sets the total number of active user sessions on the route at a point in time. A route is a combination of host and path on which a waiting room is available. This value is used as a baseline for the total number of active user sessions on the route. It is possible to have a situation where there are more or less active users sessions on the route based on the traffic patterns at that time around the world. */
	total_active_users: Output<number>

	/** Which action to take when a bot is detected using Turnstile. `log` will
have no impact on queueing behavior, simply keeping track of how many
bots are detected in Waiting Room Analytics. `infinite_queue` will send
bots to a false queueing state, where they will never reach your
origin. `infinite_queue` requires Advanced Waiting Room.
Available values: "log", "infinite_queue". */
	turnstile_action: Output<string>

	/** Which Turnstile widget type to use for detecting bot traffic. See
[the Turnstile documentation](https://developers.cloudflare.com/turnstile/concepts/widget/#widget-types)
for the definitions of these widget types. Set to `off` to disable the
Turnstile integration entirely. Setting this to anything other than
`off` or `invisible` requires Advanced Waiting Room.
Available values: "off", "invisible", "visible_non_interactive", "visible_managed". */
	turnstile_mode: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareStreamWatermarkProps = {

	/** The account identifier tag. */
	account_id: Input<string>

	/** The image file to upload. */
	file: Input<string>

	/** The unique identifier for a watermark profile. */
	identifier?: Input<string | undefined>

	/** A short description of the watermark profile. */
	name?: Input<string | undefined>

	/** The translucency of the image. A value of `0.0` makes the image completely transparent, and `1.0` makes the image completely opaque. Note that if the image is already semi-transparent, setting this to `1.0` will not make the image completely opaque. */
	opacity?: Input<number | undefined>

	/** The whitespace between the adjacent edges (determined by position) of the video and the image. `0.0` indicates no padding, and `1.0` indicates a fully padded video width or length, as determined by the algorithm. */
	padding?: Input<number | undefined>

	/** The location of the image. Valid positions are: `upperRight`, `upperLeft`, `lowerLeft`, `lowerRight`, and `center`. Note that `center` ignores the `padding` parameter. */
	position?: Input<string | undefined>

	/** The size of the image relative to the overall size of the video. This parameter will adapt to horizontal and vertical videos automatically. `0.0` indicates no scaling (use the size of the image as-is), and `1.0 `fills the entire video. */
	scale?: Input<number | undefined>
}

type CloudflareStreamWatermark = Readonly<{

	/** The account identifier tag. */
	account_id: Output<string>

	/** The date and a time a watermark profile was created. */
	created: Output<string>

	/** The source URL for a downloaded image. If the watermark profile was created via direct upload, this field is null. */
	downloaded_from: Output<string>

	/** The image file to upload. */
	file: Output<string>

	/** The height of the image in pixels. */
	height: Output<number>

	/** The unique identifier for a watermark profile. */
	identifier: Output<string | undefined>

	/** A short description of the watermark profile. */
	name: Output<string>

	/** The translucency of the image. A value of `0.0` makes the image completely transparent, and `1.0` makes the image completely opaque. Note that if the image is already semi-transparent, setting this to `1.0` will not make the image completely opaque. */
	opacity: Output<number>

	/** The whitespace between the adjacent edges (determined by position) of the video and the image. `0.0` indicates no padding, and `1.0` indicates a fully padded video width or length, as determined by the algorithm. */
	padding: Output<number>

	/** The location of the image. Valid positions are: `upperRight`, `upperLeft`, `lowerLeft`, `lowerRight`, and `center`. Note that `center` ignores the `padding` parameter. */
	position: Output<string>

	/** The size of the image relative to the overall size of the video. This parameter will adapt to horizontal and vertical videos automatically. `0.0` indicates no scaling (use the size of the image as-is), and `1.0 `fills the entire video. */
	scale: Output<number>

	/** The size of the image in bytes. */
	size: Output<number>

	/** The unique identifier for a watermark profile. */
	uid: Output<string>

	/** The width of the image in pixels. */
	width: Output<number>
}>

type CloudflareZeroTrustAccessShortLivedCertificateProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** UUID */
	app_id: Input<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareZeroTrustAccessShortLivedCertificate = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** UUID */
	app_id: Output<string>

	/** The Application Audience (AUD) tag. Identifies the application associated with the CA. */
	aud: Output<string>

	/** UUID */
	id: Output<string>

	/** The public key to add to your SSH server configuration. */
	public_key: Output<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareZeroTrustDeviceDefaultProfileCertificatesProps = {

	/** The current status of the device policy certificate provisioning feature for WARP clients. */
	enabled: Input<boolean>
	zone_id: Input<string>
}

type CloudflareZeroTrustDeviceDefaultProfileCertificates = Readonly<{

	/** The current status of the device policy certificate provisioning feature for WARP clients. */
	enabled: Output<boolean>
	zone_id: Output<string>
}>

type CloudflareWorkersScriptProps = {

	/** Identifier */
	account_id: Input<string>
	assets?: Input<{
		config?: Input<{

			/** Determines the redirects and rewrites of requests for HTML content.
Available values: "auto-trailing-slash", "force-trailing-slash", "drop-trailing-slash", "none". */
			html_handling?: Input<string | undefined>

			/** Determines the response when a request does not match a static asset, and there is no Worker script.
Available values: "none", "404-page", "single-page-application". */
			not_found_handling?: Input<string | undefined>

			/** When true, requests will always invoke the Worker script. Otherwise, attempt to serve an asset matching the request, falling back to the Worker script. */
			run_worker_first?: Input<boolean | undefined>

			/** When true and the incoming request matches an asset, that will be served instead of invoking the Worker script. When false, requests will always invoke the Worker script. */
			serve_directly?: Input<boolean | undefined>
		} | undefined>

		/** Token provided upon successful upload of all files from a registered manifest. */
		jwt?: Input<string | undefined>
	} | undefined>
	bindings?: Input<{

		/** R2 bucket to bind to. */
		bucket_name?: Input<string | undefined>

		/** Identifier of the certificate to bind to. */
		certificate_id?: Input<string | undefined>

		/** The exported class name of the Durable Object. */
		class_name?: Input<string | undefined>

		/** The name of the dataset to bind to. */
		dataset?: Input<string | undefined>

		/** The environment of the script_name to bind to. */
		environment?: Input<string | undefined>

		/** Identifier of the D1 database to bind to. */
		id?: Input<string | undefined>

		/** Name of the Vectorize index to bind to. */
		index_name?: Input<string | undefined>

		/** JSON data to use. */
		json?: Input<string | undefined>

		/** A JavaScript variable name for the binding. */
		name: Input<string>

		/** Namespace to bind to. */
		namespace?: Input<string | undefined>

		/** Namespace identifier tag. */
		namespace_id?: Input<string | undefined>
		outbound?: Input<{

			/** Pass information from the Dispatch Worker to the Outbound Worker through the parameters. */
			params?: Input<Array<Input<string>> | undefined>
			worker?: Input<{

				/** Environment of the outbound worker. */
				environment?: Input<string | undefined>

				/** Name of the outbound worker. */
				service?: Input<string | undefined>
			} | undefined>
		} | undefined>

		/** Name of the Queue to bind to. */
		queue_name?: Input<string | undefined>

		/** The script where the Durable Object is defined, if it is external to this Worker. */
		script_name?: Input<string | undefined>

		/** Name of Worker to bind to. */
		service?: Input<string | undefined>

		/** The text value to use. */
		text?: Input<string | undefined>

		/** The kind of resource that the binding provides.
Available values: "ai", "analytics_engine", "assets", "browser_rendering", "d1", "dispatch_namespace", "durable_object_namespace", "hyperdrive", "json", "kv_namespace", "mtls_certificate", "plain_text", "queue", "r2_bucket", "secret_text", "service", "tail_consumer", "vectorize", "version_metadata". */
		type: Input<string>
	} | undefined>

	/** Name of the part in the multipart request that contains the script (e.g. the file adding a listener to the `fetch` event). Indicates a `service worker syntax` Worker. */
	body_part?: Input<string | undefined>

	/** Date indicating targeted support in the Workers runtime. Backwards incompatible fixes to the runtime following this date will not affect this Worker. */
	compatibility_date?: Input<string | undefined>

	/** Flags that enable or disable certain features in the Workers runtime. Used to enable upcoming features or opt in or out of specific changes not included in a `compatibility_date`. */
	compatibility_flags?: Input<Array<Input<string>> | undefined>

	/** Module or Service Worker contents of the Worker. */
	content: Input<string>

	/** Retain assets which exist for a previously uploaded Worker version; used in lieu of providing a completion token. */
	keep_assets?: Input<boolean | undefined>

	/** List of binding types to keep from previous_upload. */
	keep_bindings?: Input<Array<Input<string>> | undefined>

	/** Whether Logpush is turned on for the Worker. */
	logpush?: Input<boolean | undefined>

	/** Name of the part in the multipart request that contains the main module (e.g. the file exporting a `fetch` handler). Indicates a `module syntax` Worker. */
	main_module?: Input<string | undefined>
	migrations?: Input<{

		/** A list of classes to delete Durable Object namespaces from. */
		deleted_classes?: Input<Array<Input<string>> | undefined>

		/** A list of classes to create Durable Object namespaces from. */
		new_classes?: Input<Array<Input<string>> | undefined>

		/** A list of classes to create Durable Object namespaces with SQLite from. */
		new_sqlite_classes?: Input<Array<Input<string>> | undefined>

		/** Tag to set as the latest migration tag. */
		new_tag?: Input<string | undefined>

		/** Tag used to verify against the latest migration tag for this Worker. If they don't match, the upload is rejected. */
		old_tag?: Input<string | undefined>
		renamed_classes?: Input<{
			from?: Input<string | undefined>
			to?: Input<string | undefined>
		} | undefined>
		steps?: Input<{

			/** A list of classes to delete Durable Object namespaces from. */
			deleted_classes?: Input<Array<Input<string>> | undefined>

			/** A list of classes to create Durable Object namespaces from. */
			new_classes?: Input<Array<Input<string>> | undefined>

			/** A list of classes to create Durable Object namespaces with SQLite from. */
			new_sqlite_classes?: Input<Array<Input<string>> | undefined>
			renamed_classes?: Input<{
				from?: Input<string | undefined>
				to?: Input<string | undefined>
			} | undefined>
			transferred_classes?: Input<{
				from?: Input<string | undefined>
				from_script?: Input<string | undefined>
				to?: Input<string | undefined>
			} | undefined>
		} | undefined>
		transferred_classes?: Input<{
			from?: Input<string | undefined>
			from_script?: Input<string | undefined>
			to?: Input<string | undefined>
		} | undefined>
	} | undefined>
	observability?: Input<{

		/** Whether observability is enabled for the Worker. */
		enabled: Input<boolean>

		/** The sampling rate for incoming requests. From 0 to 1 (1 = 100%, 0.1 = 10%). Default is 1. */
		head_sampling_rate?: Input<number | undefined>
	} | undefined>
	placement?: Input<{

		/** Enables [Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement).
Available values: "smart". */
		mode?: Input<string | undefined>
	} | undefined>

	/** Name of the script, used in URLs and route configuration. */
	script_name: Input<string>
	tail_consumers?: Input<{

		/** Optional environment if the Worker utilizes one. */
		environment?: Input<string | undefined>

		/** Optional dispatch namespace the script belongs to. */
		namespace?: Input<string | undefined>

		/** Name of Worker that is to be the consumer. */
		service: Input<string>
	} | undefined>

	/** Usage model for the Worker invocations.
Available values: "standard". */
	usage_model?: Input<string | undefined>
}

type CloudflareWorkersScript = Readonly<{

	/** Identifier */
	account_id: Output<string>
	assets: Output<Readonly<{
		config: Readonly<{

			/** Determines the redirects and rewrites of requests for HTML content.
Available values: "auto-trailing-slash", "force-trailing-slash", "drop-trailing-slash", "none". */
			html_handling?: string

			/** Determines the response when a request does not match a static asset, and there is no Worker script.
Available values: "none", "404-page", "single-page-application". */
			not_found_handling?: string

			/** When true, requests will always invoke the Worker script. Otherwise, attempt to serve an asset matching the request, falling back to the Worker script. */
			run_worker_first: boolean

			/** When true and the incoming request matches an asset, that will be served instead of invoking the Worker script. When false, requests will always invoke the Worker script. */
			serve_directly: boolean
		}>

		/** Token provided upon successful upload of all files from a registered manifest. */
		jwt: string
	}> | undefined>
	bindings: Output<Readonly<{

		/** R2 bucket to bind to. */
		bucket_name: string

		/** Identifier of the certificate to bind to. */
		certificate_id: string

		/** The exported class name of the Durable Object. */
		class_name: string

		/** The name of the dataset to bind to. */
		dataset: string

		/** The environment of the script_name to bind to. */
		environment: string

		/** Identifier of the D1 database to bind to. */
		id: string

		/** Name of the Vectorize index to bind to. */
		index_name: string

		/** JSON data to use. */
		json: string

		/** A JavaScript variable name for the binding. */
		name: string

		/** Namespace to bind to. */
		namespace: string

		/** Namespace identifier tag. */
		namespace_id: string
		outbound: Readonly<{

			/** Pass information from the Dispatch Worker to the Outbound Worker through the parameters. */
			params?: ReadonlyArray<string>
			worker?: Readonly<{

				/** Environment of the outbound worker. */
				environment?: string

				/** Name of the outbound worker. */
				service?: string
			}>
		}>

		/** Name of the Queue to bind to. */
		queue_name: string

		/** The script where the Durable Object is defined, if it is external to this Worker. */
		script_name: string

		/** Name of Worker to bind to. */
		service: string

		/** The text value to use. */
		text: string

		/** The kind of resource that the binding provides.
Available values: "ai", "analytics_engine", "assets", "browser_rendering", "d1", "dispatch_namespace", "durable_object_namespace", "hyperdrive", "json", "kv_namespace", "mtls_certificate", "plain_text", "queue", "r2_bucket", "secret_text", "service", "tail_consumer", "vectorize", "version_metadata". */
		type: string
	}>>

	/** Name of the part in the multipart request that contains the script (e.g. the file adding a listener to the `fetch` event). Indicates a `service worker syntax` Worker. */
	body_part: Output<string | undefined>

	/** Date indicating targeted support in the Workers runtime. Backwards incompatible fixes to the runtime following this date will not affect this Worker. */
	compatibility_date: Output<string | undefined>

	/** Flags that enable or disable certain features in the Workers runtime. Used to enable upcoming features or opt in or out of specific changes not included in a `compatibility_date`. */
	compatibility_flags: ReadonlyArray<string>

	/** Module or Service Worker contents of the Worker. */
	content: Output<string>

	/** When the script was created. */
	created_on: Output<string>

	/** Hashed script content, can be used in a If-None-Match header when updating. */
	etag: Output<string>

	/** Whether a Worker contains assets. */
	has_assets: Output<boolean>

	/** Whether a Worker contains modules. */
	has_modules: Output<boolean>

	/** Name of the script, used in URLs and route configuration. */
	id: Output<string>

	/** Retain assets which exist for a previously uploaded Worker version; used in lieu of providing a completion token. */
	keep_assets: Output<boolean | undefined>

	/** List of binding types to keep from previous_upload. */
	keep_bindings: ReadonlyArray<string>

	/** Whether Logpush is turned on for the Worker. */
	logpush: Output<boolean>

	/** Name of the part in the multipart request that contains the main module (e.g. the file exporting a `fetch` handler). Indicates a `module syntax` Worker. */
	main_module: Output<string | undefined>
	migrations: Output<Readonly<{

		/** A list of classes to delete Durable Object namespaces from. */
		deleted_classes: ReadonlyArray<string>

		/** A list of classes to create Durable Object namespaces from. */
		new_classes: ReadonlyArray<string>

		/** A list of classes to create Durable Object namespaces with SQLite from. */
		new_sqlite_classes: ReadonlyArray<string>

		/** Tag to set as the latest migration tag. */
		new_tag: string

		/** Tag used to verify against the latest migration tag for this Worker. If they don't match, the upload is rejected. */
		old_tag: string
		renamed_classes: Readonly<{
			from?: string
			to?: string
		}>
		steps: Readonly<{

			/** A list of classes to delete Durable Object namespaces from. */
			deleted_classes?: ReadonlyArray<string>

			/** A list of classes to create Durable Object namespaces from. */
			new_classes?: ReadonlyArray<string>

			/** A list of classes to create Durable Object namespaces with SQLite from. */
			new_sqlite_classes?: ReadonlyArray<string>
			renamed_classes?: Readonly<{
				from?: string
				to?: string
			}>
			transferred_classes?: Readonly<{
				from?: string
				from_script?: string
				to?: string
			}>
		}>
		transferred_classes: Readonly<{
			from?: string
			from_script?: string
			to?: string
		}>
	}>>

	/** When the script was last modified. */
	modified_on: Output<string>
	observability: Output<Readonly<{

		/** Whether observability is enabled for the Worker. */
		enabled: boolean

		/** The sampling rate for incoming requests. From 0 to 1 (1 = 100%, 0.1 = 10%). Default is 1. */
		head_sampling_rate: number
	}>>
	placement: Output<Readonly<{

		/** Enables [Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement).
Available values: "smart". */
		mode: string

		/** Status of [Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement).
Available values: "SUCCESS", "UNSUPPORTED_APPLICATION", "INSUFFICIENT_INVOCATIONS". */
		status: string
	}>>

	/** Name of the script, used in URLs and route configuration. */
	script_name: Output<string>
	startup_time_ms: Output<number>
	tail_consumers: Output<Readonly<{

		/** Optional environment if the Worker utilizes one. */
		environment: string

		/** Optional dispatch namespace the script belongs to. */
		namespace: string

		/** Name of Worker that is to be the consumer. */
		service: string
	}>>

	/** Usage model for the Worker invocations.
Available values: "standard". */
	usage_model: Output<string>
}>

type CloudflareMagicTransitConnectorProps = {
	account_id: Input<string>
	activated?: Input<boolean | undefined>
	connector_id: Input<string>
	interrupt_window_duration_hours?: Input<number | undefined>
	interrupt_window_hour_of_day?: Input<number | undefined>
	notes?: Input<string | undefined>
	timezone?: Input<string | undefined>
}

type CloudflareMagicTransitConnector = Readonly<{
	account_id: Output<string>
	activated: Output<boolean | undefined>
	connector_id: Output<string>
	device: Output<Readonly<{
		id: string
		serial_number: string
	}>>
	id: Output<string>
	interrupt_window_duration_hours: Output<number | undefined>
	interrupt_window_hour_of_day: Output<number | undefined>
	last_heartbeat: Output<string>
	last_seen_version: Output<string>
	last_updated: Output<string>
	notes: Output<string | undefined>
	timezone: Output<string | undefined>
}>

type CloudflareDnsRecordProps = {

	/** Comments or notes about the DNS record. This field has no effect on DNS responses. */
	comment?: Input<string | undefined>

	/** A valid IPv4 address. */
	content?: Input<string | undefined>
	data?: Input<{

		/** Algorithm. */
		algorithm?: Input<number | undefined>

		/** Altitude of location in meters. */
		altitude?: Input<number | undefined>

		/** Certificate. */
		certificate?: Input<string | undefined>

		/** Digest. */
		digest?: Input<string | undefined>

		/** Digest Type. */
		digest_type?: Input<number | undefined>

		/** fingerprint. */
		fingerprint?: Input<string | undefined>

		/** Flags for the CAA record. */
		flags?: Input<number | undefined>

		/** Key Tag. */
		key_tag?: Input<number | undefined>

		/** Degrees of latitude. */
		lat_degrees?: Input<number | undefined>

		/** Latitude direction.
Available values: "N", "S". */
		lat_direction?: Input<string | undefined>

		/** Minutes of latitude. */
		lat_minutes?: Input<number | undefined>

		/** Seconds of latitude. */
		lat_seconds?: Input<number | undefined>

		/** Degrees of longitude. */
		long_degrees?: Input<number | undefined>

		/** Longitude direction.
Available values: "E", "W". */
		long_direction?: Input<string | undefined>

		/** Minutes of longitude. */
		long_minutes?: Input<number | undefined>

		/** Seconds of longitude. */
		long_seconds?: Input<number | undefined>

		/** Matching Type. */
		matching_type?: Input<number | undefined>

		/** Order. */
		order?: Input<number | undefined>

		/** The port of the service. */
		port?: Input<number | undefined>

		/** Horizontal precision of location. */
		precision_horz?: Input<number | undefined>

		/** Vertical precision of location. */
		precision_vert?: Input<number | undefined>

		/** Preference. */
		preference?: Input<number | undefined>

		/** priority. */
		priority?: Input<number | undefined>

		/** Protocol. */
		protocol?: Input<number | undefined>

		/** Public Key. */
		public_key?: Input<string | undefined>

		/** Regex. */
		regex?: Input<string | undefined>

		/** Replacement. */
		replacement?: Input<string | undefined>

		/** Selector. */
		selector?: Input<number | undefined>

		/** Service. */
		service?: Input<string | undefined>

		/** Size of location in meters. */
		size?: Input<number | undefined>

		/** Name of the property controlled by this record (e.g.: issue, issuewild, iodef). */
		tag?: Input<string | undefined>

		/** target. */
		target?: Input<string | undefined>

		/** Type. */
		type?: Input<number | undefined>

		/** Usage. */
		usage?: Input<number | undefined>

		/** Value of the record. This field's semantics depend on the chosen tag. */
		value?: Input<string | undefined>

		/** The record weight. */
		weight?: Input<number | undefined>
	} | undefined>

	/** DNS record name (or @ for the zone apex) in Punycode. */
	name: Input<string>

	/** Required for MX, SRV and URI records; unused by other record types. Records with lower priorities are preferred. */
	priority?: Input<number | undefined>

	/** Whether the record is receiving the performance and security benefits of Cloudflare. */
	proxied?: Input<boolean | undefined>
	settings?: Input<{

		/** If enabled, causes the CNAME record to be resolved externally and the resulting address records (e.g., A and AAAA) to be returned instead of the CNAME record itself. This setting is unavailable for proxied records, since they are always flattened. */
		flatten_cname?: Input<boolean | undefined>

		/** When enabled, only A records will be generated, and AAAA records will not be created. This setting is intended for exceptional cases. Note that this option only applies to proxied records and it has no effect on whether Cloudflare communicates with the origin using IPv4 or IPv6. */
		ipv4_only?: Input<boolean | undefined>

		/** When enabled, only AAAA records will be generated, and A records will not be created. This setting is intended for exceptional cases. Note that this option only applies to proxied records and it has no effect on whether Cloudflare communicates with the origin using IPv4 or IPv6. */
		ipv6_only?: Input<boolean | undefined>
	} | undefined>

	/** Custom tags for the DNS record. This field has no effect on DNS responses. */
	tags?: Input<Array<Input<string>> | undefined>

	/** Time To Live (TTL) of the DNS record in seconds. Setting to 1 means 'automatic'. Value must be between 60 and 86400, with the minimum reduced to 30 for Enterprise zones. */
	ttl: Input<number>

	/** Record type.
Available values: "A". */
	type: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareDnsRecord = Readonly<{

	/** Comments or notes about the DNS record. This field has no effect on DNS responses. */
	comment: Output<string>

	/** When the record comment was last modified. Omitted if there is no comment. */
	comment_modified_on: Output<string>

	/** A valid IPv4 address. */
	content: Output<string>

	/** When the record was created. */
	created_on: Output<string>
	data: Output<Readonly<{

		/** Algorithm. */
		algorithm: number

		/** Altitude of location in meters. */
		altitude: number

		/** Certificate. */
		certificate: string

		/** Digest. */
		digest: string

		/** Digest Type. */
		digest_type: number

		/** fingerprint. */
		fingerprint: string

		/** Flags for the CAA record. */
		flags: number

		/** Key Tag. */
		key_tag: number

		/** Degrees of latitude. */
		lat_degrees: number

		/** Latitude direction.
Available values: "N", "S". */
		lat_direction: string

		/** Minutes of latitude. */
		lat_minutes: number

		/** Seconds of latitude. */
		lat_seconds: number

		/** Degrees of longitude. */
		long_degrees: number

		/** Longitude direction.
Available values: "E", "W". */
		long_direction: string

		/** Minutes of longitude. */
		long_minutes: number

		/** Seconds of longitude. */
		long_seconds: number

		/** Matching Type. */
		matching_type: number

		/** Order. */
		order: number

		/** The port of the service. */
		port: number

		/** Horizontal precision of location. */
		precision_horz: number

		/** Vertical precision of location. */
		precision_vert: number

		/** Preference. */
		preference: number

		/** priority. */
		priority: number

		/** Protocol. */
		protocol: number

		/** Public Key. */
		public_key: string

		/** Regex. */
		regex: string

		/** Replacement. */
		replacement: string

		/** Selector. */
		selector: number

		/** Service. */
		service: string

		/** Size of location in meters. */
		size: number

		/** Name of the property controlled by this record (e.g.: issue, issuewild, iodef). */
		tag: string

		/** target. */
		target: string

		/** Type. */
		type: number

		/** Usage. */
		usage: number

		/** Value of the record. This field's semantics depend on the chosen tag. */
		value: string

		/** The record weight. */
		weight: number
	}>>

	/** Identifier */
	id: Output<string>

	/** Extra Cloudflare-specific information about the record. */
	meta: Output<string>

	/** When the record was last modified. */
	modified_on: Output<string>

	/** DNS record name (or @ for the zone apex) in Punycode. */
	name: Output<string>

	/** Required for MX, SRV and URI records; unused by other record types. Records with lower priorities are preferred. */
	priority: Output<number | undefined>

	/** Whether the record can be proxied by Cloudflare or not. */
	proxiable: Output<boolean>

	/** Whether the record is receiving the performance and security benefits of Cloudflare. */
	proxied: Output<boolean>
	settings: Output<Readonly<{

		/** If enabled, causes the CNAME record to be resolved externally and the resulting address records (e.g., A and AAAA) to be returned instead of the CNAME record itself. This setting is unavailable for proxied records, since they are always flattened. */
		flatten_cname: boolean

		/** When enabled, only A records will be generated, and AAAA records will not be created. This setting is intended for exceptional cases. Note that this option only applies to proxied records and it has no effect on whether Cloudflare communicates with the origin using IPv4 or IPv6. */
		ipv4_only: boolean

		/** When enabled, only AAAA records will be generated, and A records will not be created. This setting is intended for exceptional cases. Note that this option only applies to proxied records and it has no effect on whether Cloudflare communicates with the origin using IPv4 or IPv6. */
		ipv6_only: boolean
	}>>

	/** Custom tags for the DNS record. This field has no effect on DNS responses. */
	tags: ReadonlyArray<string>

	/** When the record tags were last modified. Omitted if there are no tags. */
	tags_modified_on: Output<string>

	/** Time To Live (TTL) of the DNS record in seconds. Setting to 1 means 'automatic'. Value must be between 60 and 86400, with the minimum reduced to 30 for Enterprise zones. */
	ttl: Output<number>

	/** Record type.
Available values: "A". */
	type: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareStreamCaptionLanguageProps = {

	/** Identifier */
	account_id: Input<string>

	/** The WebVTT file containing the caption or subtitle content. */
	file?: Input<string | undefined>

	/** A Cloudflare-generated unique identifier for a media item. */
	identifier: Input<string>

	/** The language tag in BCP 47 format. */
	language: Input<string>
}

type CloudflareStreamCaptionLanguage = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The WebVTT file containing the caption or subtitle content. */
	file: Output<string | undefined>

	/** Whether the caption was generated via AI. */
	generated: Output<boolean>

	/** A Cloudflare-generated unique identifier for a media item. */
	identifier: Output<string>

	/** The language label displayed in the native language to users. */
	label: Output<string>

	/** The language tag in BCP 47 format. */
	language: Output<string>

	/** The status of a generated caption.
Available values: "ready", "inprogress", "error". */
	status: Output<string>
}>

type CloudflareMagicWanStaticRouteProps = {

	/** Identifier */
	account_id: Input<string>

	/** An optional human provided description of the static route. */
	description?: Input<string | undefined>

	/** The next-hop IP Address for the static route. */
	nexthop?: Input<string | undefined>

	/** IP Prefix in Classless Inter-Domain Routing format. */
	prefix?: Input<string | undefined>

	/** Priority of the static route. */
	priority?: Input<number | undefined>
	route?: Input<{

		/** An optional human provided description of the static route. */
		description?: Input<string | undefined>

		/** The next-hop IP Address for the static route. */
		nexthop?: Input<string | undefined>

		/** IP Prefix in Classless Inter-Domain Routing format. */
		prefix?: Input<string | undefined>

		/** Priority of the static route. */
		priority?: Input<number | undefined>
		scope?: Input<{

			/** List of colo names for the ECMP scope. */
			colo_names?: Input<Array<Input<string>> | undefined>

			/** List of colo regions for the ECMP scope. */
			colo_regions?: Input<Array<Input<string>> | undefined>
		} | undefined>

		/** Optional weight of the ECMP scope - if provided. */
		weight?: Input<number | undefined>
	} | undefined>

	/** Identifier */
	route_id?: Input<string | undefined>
	routes?: Input<{

		/** An optional human provided description of the static route. */
		description?: Input<string | undefined>

		/** The next-hop IP Address for the static route. */
		nexthop?: Input<string | undefined>

		/** IP Prefix in Classless Inter-Domain Routing format. */
		prefix?: Input<string | undefined>

		/** Priority of the static route. */
		priority?: Input<number | undefined>
		scope?: Input<{

			/** List of colo names for the ECMP scope. */
			colo_names?: Input<Array<Input<string>> | undefined>

			/** List of colo regions for the ECMP scope. */
			colo_regions?: Input<Array<Input<string>> | undefined>
		} | undefined>

		/** Optional weight of the ECMP scope - if provided. */
		weight?: Input<number | undefined>
	} | undefined>
	scope?: Input<{

		/** List of colo names for the ECMP scope. */
		colo_names?: Input<Array<Input<string>> | undefined>

		/** List of colo regions for the ECMP scope. */
		colo_regions?: Input<Array<Input<string>> | undefined>
	} | undefined>

	/** Optional weight of the ECMP scope - if provided. */
	weight?: Input<number | undefined>
}

type CloudflareMagicWanStaticRoute = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** An optional human provided description of the static route. */
	description: Output<string | undefined>
	modified: Output<boolean>
	modified_route: Output<Readonly<{

		/** When the route was created. */
		created_on: string

		/** An optional human provided description of the static route. */
		description: string

		/** Identifier */
		id: string

		/** When the route was last modified. */
		modified_on: string

		/** The next-hop IP Address for the static route. */
		nexthop: string

		/** IP Prefix in Classless Inter-Domain Routing format. */
		prefix: string

		/** Priority of the static route. */
		priority: number
		scope: Readonly<{

			/** List of colo names for the ECMP scope. */
			colo_names: ReadonlyArray<string>

			/** List of colo regions for the ECMP scope. */
			colo_regions: ReadonlyArray<string>
		}>

		/** Optional weight of the ECMP scope - if provided. */
		weight: number
	}>>

	/** The next-hop IP Address for the static route. */
	nexthop: Output<string | undefined>

	/** IP Prefix in Classless Inter-Domain Routing format. */
	prefix: Output<string | undefined>

	/** Priority of the static route. */
	priority: Output<number | undefined>
	route: Output<Readonly<{

		/** When the route was created. */
		created_on: string

		/** An optional human provided description of the static route. */
		description: string

		/** Identifier */
		id: string

		/** When the route was last modified. */
		modified_on: string

		/** The next-hop IP Address for the static route. */
		nexthop: string

		/** IP Prefix in Classless Inter-Domain Routing format. */
		prefix: string

		/** Priority of the static route. */
		priority: number
		scope: Readonly<{

			/** List of colo names for the ECMP scope. */
			colo_names: ReadonlyArray<string>

			/** List of colo regions for the ECMP scope. */
			colo_regions: ReadonlyArray<string>
		}>

		/** Optional weight of the ECMP scope - if provided. */
		weight: number
	}>>

	/** Identifier */
	route_id: Output<string | undefined>
	routes: Output<Readonly<{

		/** When the route was created. */
		created_on: string

		/** An optional human provided description of the static route. */
		description: string

		/** Identifier */
		id: string

		/** When the route was last modified. */
		modified_on: string

		/** The next-hop IP Address for the static route. */
		nexthop: string

		/** IP Prefix in Classless Inter-Domain Routing format. */
		prefix: string

		/** Priority of the static route. */
		priority: number
		scope: Readonly<{

			/** List of colo names for the ECMP scope. */
			colo_names: ReadonlyArray<string>

			/** List of colo regions for the ECMP scope. */
			colo_regions: ReadonlyArray<string>
		}>

		/** Optional weight of the ECMP scope - if provided. */
		weight: number
	}>>
	scope: Output<Readonly<{

		/** List of colo names for the ECMP scope. */
		colo_names: ReadonlyArray<string>

		/** List of colo regions for the ECMP scope. */
		colo_regions: ReadonlyArray<string>
	}>>

	/** Optional weight of the ECMP scope - if provided. */
	weight: Output<number | undefined>
}>

type CloudflareR2BucketLifecycleProps = {

	/** Account ID */
	account_id: Input<string>

	/** Name of the bucket */
	bucket_name: Input<string>

	/** Jurisdiction of the bucket */
	jurisdiction?: Input<string | undefined>
	rules?: Input<{
		abort_multipart_uploads_transition?: Input<{
			condition?: Input<{
				max_age: Input<number>

				/** Available values: "Age". */
				type: Input<string>
			} | undefined>
		} | undefined>
		conditions: Input<{

			/** Transitions will only apply to objects/uploads in the bucket that start with the given prefix, an empty prefix can be provided to scope rule to all objects/uploads */
			prefix: Input<string>
		}>
		delete_objects_transition?: Input<{
			condition?: Input<{
				date?: Input<string | undefined>
				max_age?: Input<number | undefined>

				/** Available values: "Age". */
				type: Input<string>
			} | undefined>
		} | undefined>

		/** Whether or not this rule is in effect */
		enabled: Input<boolean>

		/** Unique identifier for this rule */
		id: Input<string>
		storage_class_transitions?: Input<{
			condition: Input<{
				date?: Input<string | undefined>
				max_age?: Input<number | undefined>

				/** Available values: "Age". */
				type: Input<string>
			}>

			/** Available values: "InfrequentAccess". */
			storage_class: Input<string>
		} | undefined>
	} | undefined>
}

type CloudflareR2BucketLifecycle = Readonly<{

	/** Account ID */
	account_id: Output<string>

	/** Name of the bucket */
	bucket_name: Output<string>

	/** Jurisdiction of the bucket */
	jurisdiction: Output<string>
	rules: Output<Readonly<{
		abort_multipart_uploads_transition: Readonly<{
			condition: Readonly<{
				max_age: number

				/** Available values: "Age". */
				type: string
			}>
		}>
		conditions: Readonly<{

			/** Transitions will only apply to objects/uploads in the bucket that start with the given prefix, an empty prefix can be provided to scope rule to all objects/uploads */
			prefix: string
		}>
		delete_objects_transition: Readonly<{
			condition: Readonly<{
				date?: string
				max_age?: number

				/** Available values: "Age". */
				type: string
			}>
		}>

		/** Whether or not this rule is in effect */
		enabled: boolean

		/** Unique identifier for this rule */
		id: string
		storage_class_transitions: Readonly<{
			condition: Readonly<{
				date?: string
				max_age?: number

				/** Available values: "Age". */
				type: string
			}>

			/** Available values: "InfrequentAccess". */
			storage_class: string
		}>
	}>>
}>

type CloudflareAccountTokenProps = {

	/** Account identifier tag. */
	account_id: Input<string>
	condition?: Input<{
		request_ip?: Input<{

			/** List of IPv4/IPv6 CIDR addresses. */
			in?: Input<Array<Input<string>> | undefined>

			/** List of IPv4/IPv6 CIDR addresses. */
			not_in?: Input<Array<Input<string>> | undefined>
		} | undefined>
	} | undefined>

	/** The expiration time on or after which the JWT MUST NOT be accepted for processing. */
	expires_on?: Input<string | undefined>

	/** Token name. */
	name: Input<string>

	/** The time before which the token MUST NOT be accepted for processing. */
	not_before?: Input<string | undefined>
	policies: Input<{

		/** Allow or deny operations against the resources.
Available values: "allow", "deny". */
		effect: Input<string>
		permission_groups: Input<{

			/** Identifier of the group. */
			id: Input<string>
			meta?: Input<{
				key?: Input<string | undefined>
				value?: Input<string | undefined>
			} | undefined>
		}>

		/** A list of resource names that the policy applies to. */
		resources: Input<Record<string, Input<string>>>
	}>

	/** Status of the token.
Available values: "active", "disabled", "expired". */
	status?: Input<string | undefined>
}

type CloudflareAccountToken = Readonly<{

	/** Account identifier tag. */
	account_id: Output<string>
	condition: Output<Readonly<{
		request_ip: Readonly<{

			/** List of IPv4/IPv6 CIDR addresses. */
			in?: ReadonlyArray<string>

			/** List of IPv4/IPv6 CIDR addresses. */
			not_in?: ReadonlyArray<string>
		}>
	}>>

	/** The expiration time on or after which the JWT MUST NOT be accepted for processing. */
	expires_on: Output<string | undefined>

	/** Token identifier tag. */
	id: Output<string>

	/** The time on which the token was created. */
	issued_on: Output<string>

	/** Last time the token was used. */
	last_used_on: Output<string>

	/** Last time the token was modified. */
	modified_on: Output<string>

	/** Token name. */
	name: Output<string>

	/** The time before which the token MUST NOT be accepted for processing. */
	not_before: Output<string | undefined>
	policies: Output<Readonly<{

		/** Allow or deny operations against the resources.
Available values: "allow", "deny". */
		effect: string

		/** Policy identifier. */
		id: string
		permission_groups: Readonly<{

			/** Identifier of the group. */
			id: string
			meta: Readonly<{
				key?: string
				value?: string
			}>

			/** Name of the group. */
			name: string
		}>

		/** A list of resource names that the policy applies to. */
		resources: Readonly<Record<string, string>>
	}>>

	/** Status of the token.
Available values: "active", "disabled", "expired". */
	status: Output<string | undefined>

	/** The token value. */
	value: Output<string>
}>

type CloudflareZeroTrustDevicePostureRuleProps = {
	account_id: Input<string>

	/** The description of the device posture rule. */
	description?: Input<string | undefined>

	/** Sets the expiration time for a posture check result. If empty, the result remains valid until it is overwritten by new data from the WARP client. */
	expiration?: Input<string | undefined>
	input?: Input<{

		/** The Number of active threats. */
		active_threats?: Input<number | undefined>

		/** UUID of Cloudflare managed certificate. */
		certificate_id?: Input<string | undefined>

		/** List of volume names to be checked for encryption. */
		check_disks?: Input<Array<Input<string>> | undefined>

		/** Confirm the certificate was not imported from another device. We recommend keeping this enabled unless the certificate was deployed without a private key. */
		check_private_key?: Input<boolean | undefined>

		/** Common Name that is protected by the certificate */
		cn?: Input<string | undefined>

		/** Compliance Status
Available values: "compliant", "noncompliant", "unknown". */
		compliance_status?: Input<string | undefined>

		/** Posture Integration ID. */
		connection_id?: Input<string | undefined>

		/** Count Operator
Available values: "<", "<=", ">", ">=", "==". */
		count_operator?: Input<string | undefined>

		/** Domain */
		domain?: Input<string | undefined>

		/** For more details on eid last seen, refer to the Tanium documentation. */
		eid_last_seen?: Input<string | undefined>

		/** Enabled */
		enabled?: Input<boolean | undefined>

		/** Whether or not file exists */
		exists?: Input<boolean | undefined>

		/** List of values indicating purposes for which the certificate public key can be used */
		extended_key_usage?: Input<Array<Input<string>> | undefined>

		/** List ID. */
		id?: Input<string | undefined>

		/** Whether device is infected. */
		infected?: Input<boolean | undefined>

		/** Whether device is active. */
		is_active?: Input<boolean | undefined>

		/** The Number of Issues. */
		issue_count?: Input<string | undefined>

		/** For more details on last seen, please refer to the Crowdstrike documentation. */
		last_seen?: Input<string | undefined>
		locations?: Input<{

			/** List of paths to check for client certificate on linux. */
			paths?: Input<Array<Input<string>> | undefined>

			/** List of trust stores to check for client certificate. */
			trust_stores?: Input<Array<Input<string>> | undefined>
		} | undefined>

		/** Network status of device.
Available values: "connected", "disconnected", "disconnecting", "connecting". */
		network_status?: Input<string | undefined>

		/** Operating system
Available values: "windows", "linux", "mac". */
		operating_system?: Input<string | undefined>

		/** Agent operational state.
Available values: "na", "partially_disabled", "auto_fully_disabled", "fully_disabled", "auto_partially_disabled", "disabled_error", "db_corruption". */
		operational_state?: Input<string | undefined>

		/** operator
Available values: "<", "<=", ">", ">=", "==". */
		operator?: Input<string | undefined>

		/** Os Version */
		os?: Input<string | undefined>

		/** Operating System Distribution Name (linux only) */
		os_distro_name?: Input<string | undefined>

		/** Version of OS Distribution (linux only) */
		os_distro_revision?: Input<string | undefined>

		/** Additional version data. For Mac or iOS, the Product Version Extra. For Linux, the kernel release version. (Mac, iOS, and Linux only) */
		os_version_extra?: Input<string | undefined>

		/** overall */
		overall?: Input<string | undefined>

		/** File path. */
		path?: Input<string | undefined>

		/** Whether to check all disks for encryption. */
		require_all?: Input<boolean | undefined>

		/** For more details on risk level, refer to the Tanium documentation.
Available values: "low", "medium", "high", "critical". */
		risk_level?: Input<string | undefined>

		/** A value between 0-100 assigned to devices set by the 3rd party posture provider. */
		score?: Input<number | undefined>

		/** Score Operator
Available values: "<", "<=", ">", ">=", "==". */
		score_operator?: Input<string | undefined>

		/** SensorConfig */
		sensor_config?: Input<string | undefined>

		/** SHA-256. */
		sha256?: Input<string | undefined>

		/** For more details on state, please refer to the Crowdstrike documentation.
Available values: "online", "offline", "unknown". */
		state?: Input<string | undefined>

		/** Signing certificate thumbprint. */
		thumbprint?: Input<string | undefined>

		/** For more details on total score, refer to the Tanium documentation. */
		total_score?: Input<number | undefined>

		/** Version of OS */
		version?: Input<string | undefined>

		/** Version Operator
Available values: "<", "<=", ">", ">=", "==". */
		version_operator?: Input<string | undefined>
	} | undefined>
	match?: Input<{

		/** Available values: "windows", "mac", "linux", "android", "ios". */
		platform?: Input<string | undefined>
	} | undefined>

	/** The name of the device posture rule. */
	name: Input<string>

	/** Polling frequency for the WARP client posture check. Default: `5m` (poll every five minutes). Minimum: `1m`. */
	schedule?: Input<string | undefined>

	/** The type of device posture rule.
Available values: "file", "application", "tanium", "gateway", "warp", "disk_encryption", "sentinelone", "carbonblack", "firewall", "os_version", "domain_joined", "client_certificate", "client_certificate_v2", "unique_client_id", "kolide", "tanium_s2s", "crowdstrike_s2s", "intune", "workspace_one", "sentinelone_s2s", "custom_s2s". */
	type: Input<string>
}

type CloudflareZeroTrustDevicePostureRule = Readonly<{
	account_id: Output<string>

	/** The description of the device posture rule. */
	description: Output<string | undefined>

	/** Sets the expiration time for a posture check result. If empty, the result remains valid until it is overwritten by new data from the WARP client. */
	expiration: Output<string | undefined>

	/** API UUID. */
	id: Output<string>
	input: Output<Readonly<{

		/** The Number of active threats. */
		active_threats: number

		/** UUID of Cloudflare managed certificate. */
		certificate_id: string

		/** List of volume names to be checked for encryption. */
		check_disks: ReadonlyArray<string>

		/** Confirm the certificate was not imported from another device. We recommend keeping this enabled unless the certificate was deployed without a private key. */
		check_private_key: boolean

		/** Common Name that is protected by the certificate */
		cn: string

		/** Compliance Status
Available values: "compliant", "noncompliant", "unknown". */
		compliance_status: string

		/** Posture Integration ID. */
		connection_id: string

		/** Count Operator
Available values: "<", "<=", ">", ">=", "==". */
		count_operator: string

		/** Domain */
		domain: string

		/** For more details on eid last seen, refer to the Tanium documentation. */
		eid_last_seen: string

		/** Enabled */
		enabled: boolean

		/** Whether or not file exists */
		exists: boolean

		/** List of values indicating purposes for which the certificate public key can be used */
		extended_key_usage: ReadonlyArray<string>

		/** List ID. */
		id: string

		/** Whether device is infected. */
		infected: boolean

		/** Whether device is active. */
		is_active: boolean

		/** The Number of Issues. */
		issue_count: string

		/** For more details on last seen, please refer to the Crowdstrike documentation. */
		last_seen: string
		locations: Readonly<{

			/** List of paths to check for client certificate on linux. */
			paths?: ReadonlyArray<string>

			/** List of trust stores to check for client certificate. */
			trust_stores?: ReadonlyArray<string>
		}>

		/** Network status of device.
Available values: "connected", "disconnected", "disconnecting", "connecting". */
		network_status: string

		/** Operating system
Available values: "windows", "linux", "mac". */
		operating_system: string

		/** Agent operational state.
Available values: "na", "partially_disabled", "auto_fully_disabled", "fully_disabled", "auto_partially_disabled", "disabled_error", "db_corruption". */
		operational_state: string

		/** operator
Available values: "<", "<=", ">", ">=", "==". */
		operator: string

		/** Os Version */
		os: string

		/** Operating System Distribution Name (linux only) */
		os_distro_name: string

		/** Version of OS Distribution (linux only) */
		os_distro_revision: string

		/** Additional version data. For Mac or iOS, the Product Version Extra. For Linux, the kernel release version. (Mac, iOS, and Linux only) */
		os_version_extra: string

		/** overall */
		overall: string

		/** File path. */
		path: string

		/** Whether to check all disks for encryption. */
		require_all: boolean

		/** For more details on risk level, refer to the Tanium documentation.
Available values: "low", "medium", "high", "critical". */
		risk_level: string

		/** A value between 0-100 assigned to devices set by the 3rd party posture provider. */
		score: number

		/** Score Operator
Available values: "<", "<=", ">", ">=", "==". */
		score_operator: string

		/** SensorConfig */
		sensor_config: string

		/** SHA-256. */
		sha256: string

		/** For more details on state, please refer to the Crowdstrike documentation.
Available values: "online", "offline", "unknown". */
		state: string

		/** Signing certificate thumbprint. */
		thumbprint: string

		/** For more details on total score, refer to the Tanium documentation. */
		total_score: number

		/** Version of OS */
		version: string

		/** Version Operator
Available values: "<", "<=", ">", ">=", "==". */
		version_operator: string
	}>>
	match: Output<Readonly<{

		/** Available values: "windows", "mac", "linux", "android", "ios". */
		platform: string
	}>>

	/** The name of the device posture rule. */
	name: Output<string>

	/** Polling frequency for the WARP client posture check. Default: `5m` (poll every five minutes). Minimum: `1m`. */
	schedule: Output<string | undefined>

	/** The type of device posture rule.
Available values: "file", "application", "tanium", "gateway", "warp", "disk_encryption", "sentinelone", "carbonblack", "firewall", "os_version", "domain_joined", "client_certificate", "client_certificate_v2", "unique_client_id", "kolide", "tanium_s2s", "crowdstrike_s2s", "intune", "workspace_one", "sentinelone_s2s", "custom_s2s". */
	type: Output<string>
}>

type CloudflareZoneCacheVariantsProps = {
	value: Input<{

		/** List of strings with the MIME types of all the variants that should be served for avif. */
		avif?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for bmp. */
		bmp?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for gif. */
		gif?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for jp2. */
		jp2?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for jpeg. */
		jpeg?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for jpg. */
		jpg?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for jpg2. */
		jpg2?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for png. */
		png?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for tif. */
		tif?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for tiff. */
		tiff?: Input<Array<Input<string>> | undefined>

		/** List of strings with the MIME types of all the variants that should be served for webp. */
		webp?: Input<Array<Input<string>> | undefined>
	}>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareZoneCacheVariants = Readonly<{

	/** Whether the setting is editable */
	editable: Output<boolean>

	/** Identifier */
	id: Output<string>

	/** Last time this setting was modified. */
	modified_on: Output<string>
	value: Output<Readonly<{

		/** List of strings with the MIME types of all the variants that should be served for avif. */
		avif: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for bmp. */
		bmp: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for gif. */
		gif: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for jp2. */
		jp2: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for jpeg. */
		jpeg: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for jpg. */
		jpg: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for jpg2. */
		jpg2: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for png. */
		png: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for tif. */
		tif: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for tiff. */
		tiff: ReadonlyArray<string>

		/** List of strings with the MIME types of all the variants that should be served for webp. */
		webp: ReadonlyArray<string>
	}>>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareApiShieldSchemaProps = {

	/** Schema file bytes */
	file: Input<string>

	/** Kind of schema
Available values: "openapi_v3". */
	kind: Input<string>

	/** Name of the schema */
	name?: Input<string | undefined>
	schema_id?: Input<string | undefined>

	/** Flag whether schema is enabled for validation.
Available values: "true", "false". */
	validation_enabled?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareApiShieldSchema = Readonly<{
	created_at: Output<string>

	/** Schema file bytes */
	file: Output<string>

	/** Kind of schema
Available values: "openapi_v3". */
	kind: Output<string>

	/** Name of the schema */
	name: Output<string | undefined>
	schema: Output<Readonly<{
		created_at: string

		/** Kind of schema
Available values: "openapi_v3". */
		kind: string

		/** Name of the schema */
		name: string

		/** UUID */
		schema_id: string

		/** Source of the schema */
		source: string

		/** Flag whether schema is enabled for validation. */
		validation_enabled: boolean
	}>>
	schema_id: Output<string | undefined>

	/** Source of the schema */
	source: Output<string>
	upload_details: Output<Readonly<{
		warnings: Readonly<{

			/** Code that identifies the event that occurred. */
			code: number

			/** JSONPath location(s) in the schema where these events were encountered.  See [https://goessner.net/articles/JsonPath/](https://goessner.net/articles/JsonPath/) for JSONPath specification. */
			locations: ReadonlyArray<string>

			/** Diagnostic message that describes the event. */
			message: string
		}>
	}>>

	/** Flag whether schema is enabled for validation.
Available values: "true", "false". */
	validation_enabled: Output<string | undefined>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareAddressMapProps = {

	/** Identifier of a Cloudflare account. */
	account_id: Input<string>

	/** If you have legacy TLS clients which do not send the TLS server name indicator, then you can specify one default SNI on the map. If Cloudflare receives a TLS handshake from a client without an SNI, it will respond with the default SNI on those IPs. The default SNI can be any valid zone or subdomain owned by the account. */
	default_sni?: Input<string | undefined>

	/** An optional description field which may be used to describe the types of IPs or zones on the map. */
	description?: Input<string | undefined>

	/** Whether the Address Map is enabled or not. Cloudflare's DNS will not respond with IP addresses on an Address Map until the map is enabled. */
	enabled?: Input<boolean | undefined>
	ips?: Input<Array<Input<string>> | undefined>
	memberships?: Input<{

		/** The identifier for the membership (eg. a zone or account tag). */
		identifier?: Input<string | undefined>

		/** The type of the membership.
Available values: "zone", "account". */
		kind?: Input<string | undefined>
	} | undefined>
}

type CloudflareAddressMap = Readonly<{

	/** Identifier of a Cloudflare account. */
	account_id: Output<string>

	/** If set to false, then the Address Map cannot be deleted via API. This is true for Cloudflare-managed maps. */
	can_delete: Output<boolean>

	/** If set to false, then the IPs on the Address Map cannot be modified via the API. This is true for Cloudflare-managed maps. */
	can_modify_ips: Output<boolean>
	created_at: Output<string>

	/** If you have legacy TLS clients which do not send the TLS server name indicator, then you can specify one default SNI on the map. If Cloudflare receives a TLS handshake from a client without an SNI, it will respond with the default SNI on those IPs. The default SNI can be any valid zone or subdomain owned by the account. */
	default_sni: Output<string | undefined>

	/** An optional description field which may be used to describe the types of IPs or zones on the map. */
	description: Output<string | undefined>

	/** Whether the Address Map is enabled or not. Cloudflare's DNS will not respond with IP addresses on an Address Map until the map is enabled. */
	enabled: Output<boolean>

	/** Identifier of an Address Map. */
	id: Output<string>
	ips: ReadonlyArray<string>
	memberships: Output<Readonly<{

		/** Controls whether the membership can be deleted via the API or not. */
		can_delete: boolean
		created_at: string

		/** The identifier for the membership (eg. a zone or account tag). */
		identifier: string

		/** The type of the membership.
Available values: "zone", "account". */
		kind: string
	}>>
	modified_at: Output<string>
}>

type CloudflareDnsFirewallProps = {

	/** Identifier */
	account_id: Input<string>
	attack_mitigation?: Input<{

		/** When enabled, automatically mitigate random-prefix attacks to protect upstream DNS servers */
		enabled?: Input<boolean | undefined>

		/** Only mitigate attacks when upstream servers seem unhealthy */
		only_when_upstream_unhealthy?: Input<boolean | undefined>
	} | undefined>

	/** Whether to refuse to answer queries for the ANY type */
	deprecate_any_requests?: Input<boolean | undefined>

	/** Whether to forward client IP (resolver) subnet if no EDNS Client Subnet is sent */
	ecs_fallback?: Input<boolean | undefined>

	/** Maximum DNS cache TTL This setting sets an upper bound on DNS TTLs for purposes of caching between DNS Firewall and the upstream servers. Higher TTLs will be decreased to the maximum defined here for caching purposes. */
	maximum_cache_ttl?: Input<number | undefined>

	/** Minimum DNS cache TTL This setting sets a lower bound on DNS TTLs for purposes of caching between DNS Firewall and the upstream servers. Lower TTLs will be increased to the minimum defined here for caching purposes. */
	minimum_cache_ttl?: Input<number | undefined>

	/** DNS Firewall cluster name */
	name: Input<string>

	/** Negative DNS cache TTL This setting controls how long DNS Firewall should cache negative responses (e.g., NXDOMAIN) from the upstream servers. */
	negative_cache_ttl?: Input<number | undefined>

	/** Ratelimit in queries per second per datacenter (applies to DNS queries sent to the upstream nameservers configured on the cluster) */
	ratelimit?: Input<number | undefined>

	/** Number of retries for fetching DNS responses from upstream nameservers (not counting the initial attempt) */
	retries?: Input<number | undefined>
	upstream_ips: Input<Array<Input<string>>>
}

type CloudflareDnsFirewall = Readonly<{

	/** Identifier */
	account_id: Output<string>
	attack_mitigation: Output<Readonly<{

		/** When enabled, automatically mitigate random-prefix attacks to protect upstream DNS servers */
		enabled: boolean

		/** Only mitigate attacks when upstream servers seem unhealthy */
		only_when_upstream_unhealthy: boolean
	}>>

	/** Whether to refuse to answer queries for the ANY type */
	deprecate_any_requests: Output<boolean | undefined>
	dns_firewall_ips: ReadonlyArray<string>

	/** Whether to forward client IP (resolver) subnet if no EDNS Client Subnet is sent */
	ecs_fallback: Output<boolean | undefined>

	/** Identifier */
	id: Output<string>

	/** Maximum DNS cache TTL This setting sets an upper bound on DNS TTLs for purposes of caching between DNS Firewall and the upstream servers. Higher TTLs will be decreased to the maximum defined here for caching purposes. */
	maximum_cache_ttl: Output<number>

	/** Minimum DNS cache TTL This setting sets a lower bound on DNS TTLs for purposes of caching between DNS Firewall and the upstream servers. Lower TTLs will be increased to the minimum defined here for caching purposes. */
	minimum_cache_ttl: Output<number>

	/** Last modification of DNS Firewall cluster */
	modified_on: Output<string>

	/** DNS Firewall cluster name */
	name: Output<string>

	/** Negative DNS cache TTL This setting controls how long DNS Firewall should cache negative responses (e.g., NXDOMAIN) from the upstream servers. */
	negative_cache_ttl: Output<number | undefined>

	/** Ratelimit in queries per second per datacenter (applies to DNS queries sent to the upstream nameservers configured on the cluster) */
	ratelimit: Output<number | undefined>

	/** Number of retries for fetching DNS responses from upstream nameservers (not counting the initial attempt) */
	retries: Output<number>
	upstream_ips: ReadonlyArray<string>
}>

type CloudflareAccountMemberProps = {

	/** Account identifier tag. */
	account_id: Input<string>

	/** The contact email address of the user. */
	email: Input<string>
	policies?: Input<{

		/** Allow or deny operations against the resources.
Available values: "allow", "deny". */
		access: Input<string>
		permission_groups: Input<{

			/** Identifier of the group. */
			id: Input<string>
		}>
		resource_groups: Input<{

			/** Identifier of the group. */
			id: Input<string>
		}>
	} | undefined>

	/** Array of roles associated with this member. */
	roles?: Input<Array<Input<string>> | undefined>

	/** Available values: "accepted", "pending". */
	status?: Input<string | undefined>
}

type CloudflareAccountMember = Readonly<{

	/** Account identifier tag. */
	account_id: Output<string>

	/** The contact email address of the user. */
	email: Output<string>

	/** Membership identifier tag. */
	id: Output<string>
	policies: Output<Readonly<{

		/** Allow or deny operations against the resources.
Available values: "allow", "deny". */
		access: string

		/** Policy identifier. */
		id: string
		permission_groups: Readonly<{

			/** Identifier of the group. */
			id: string
		}>
		resource_groups: Readonly<{

			/** Identifier of the group. */
			id: string
		}>
	}>>

	/** Array of roles associated with this member. */
	roles: ReadonlyArray<string>

	/** Available values: "accepted", "pending". */
	status: Output<string>
	user: Output<Readonly<{

		/** The contact email address of the user. */
		email: string

		/** User's first name */
		first_name: string

		/** Identifier */
		id: string

		/** User's last name */
		last_name: string

		/** Indicates whether two-factor authentication is enabled for the user account. Does not apply to API authentication. */
		two_factor_authentication_enabled: boolean
	}>>
}>

type CloudflareZeroTrustRiskScoringIntegrationProps = {
	account_id: Input<string>

	/** Whether this integration is enabled. If disabled, no risk changes will be exported to the third-party. */
	active?: Input<boolean | undefined>

	/** Available values: "Okta". */
	integration_type: Input<string>

	/** A reference id that can be supplied by the client. Currently this should be set to the Access-Okta IDP ID (a UUIDv4).
https://developers.cloudflare.com/api/operations/access-identity-providers-get-an-access-identity-provider */
	reference_id?: Input<string | undefined>

	/** The base url of the tenant, e.g. "https://tenant.okta.com" */
	tenant_url: Input<string>
}

type CloudflareZeroTrustRiskScoringIntegration = Readonly<{
	account_id: Output<string>

	/** The Cloudflare account tag. */
	account_tag: Output<string>

	/** Whether this integration is enabled. If disabled, no risk changes will be exported to the third-party. */
	active: Output<boolean | undefined>

	/** When the integration was created in RFC3339 format. */
	created_at: Output<string>

	/** The id of the integration, a UUIDv4. */
	id: Output<string>

	/** Available values: "Okta". */
	integration_type: Output<string>

	/** A reference id that can be supplied by the client. Currently this should be set to the Access-Okta IDP ID (a UUIDv4).
https://developers.cloudflare.com/api/operations/access-identity-providers-get-an-access-identity-provider */
	reference_id: Output<string | undefined>

	/** The base url of the tenant, e.g. "https://tenant.okta.com" */
	tenant_url: Output<string>

	/** The URL for the Shared Signals Framework configuration, e.g. "/.well-known/sse-configuration/{integration_uuid}/". https://openid.net/specs/openid-sse-framework-1_0.html#rfc.section.6.2.1 */
	well_known_url: Output<string>
}>

type CloudflareZoneProps = {
	account: Input<{

		/** Identifier */
		id?: Input<string | undefined>
	}>

	/** The domain name */
	name: Input<string>

	/** A full zone implies that DNS is hosted with Cloudflare. A partial zone is
typically a partner-hosted zone or a CNAME setup.
Available values: "full", "partial", "secondary". */
	type?: Input<string | undefined>

	/** An array of domains used for custom name servers. This is only
available for Business and Enterprise plans. */
	vanity_name_servers?: Input<Array<Input<string>> | undefined>
}

type CloudflareZone = Readonly<{
	account: Output<Readonly<{

		/** Identifier */
		id: string
	}>>

	/** The last time proof of ownership was detected and the zone was made
active */
	activated_on: Output<string>

	/** When the zone was created */
	created_on: Output<string>

	/** The interval (in seconds) from when development mode expires
(positive integer) or last expired (negative integer) for the
domain. If development mode has never been enabled, this value is 0. */
	development_mode: Output<number>

	/** Identifier */
	id: Output<string>
	meta: Output<Readonly<{

		/** The zone is only configured for CDN */
		cdn_only: boolean

		/** Number of Custom Certificates the zone can have */
		custom_certificate_quota: number

		/** The zone is only configured for DNS */
		dns_only: boolean

		/** The zone is setup with Foundation DNS */
		foundation_dns: boolean

		/** Number of Page Rules a zone can have */
		page_rule_quota: number

		/** The zone has been flagged for phishing */
		phishing_detected: boolean
		step: number
	}>>

	/** When the zone was last modified */
	modified_on: Output<string>

	/** The domain name */
	name: Output<string>

	/** The name servers Cloudflare assigns to a zone */
	name_servers: ReadonlyArray<string>

	/** DNS host at the time of switching to Cloudflare */
	original_dnshost: Output<string>

	/** Original name servers before moving to Cloudflare */
	original_name_servers: ReadonlyArray<string>

	/** Registrar for the domain at the time of switching to Cloudflare */
	original_registrar: Output<string>
	owner: Output<Readonly<{

		/** Identifier */
		id: string

		/** Name of the owner */
		name: string

		/** The type of owner */
		type: string
	}>>

	/** Indicates whether the zone is only using Cloudflare DNS services. A
true value means the zone will not receive security or performance
benefits. */
	paused: Output<boolean>

	/** The zone status on Cloudflare.
Available values: "initializing", "pending", "active", "moved". */
	status: Output<string>

	/** A full zone implies that DNS is hosted with Cloudflare. A partial zone is
typically a partner-hosted zone or a CNAME setup.
Available values: "full", "partial", "secondary". */
	type: Output<string>

	/** An array of domains used for custom name servers. This is only
available for Business and Enterprise plans. */
	vanity_name_servers: ReadonlyArray<string>

	/** Verification key for partial zone setup. */
	verification_key: Output<string>
}>

type CloudflareCustomSslProps = {

	/** A ubiquitous bundle has the highest probability of being verified everywhere, even by clients using outdated or unusual trust stores. An optimal bundle uses the shortest chain and newest intermediates. And the force bundle verifies the chain, but does not otherwise modify it.
Available values: "ubiquitous", "optimal", "force". */
	bundle_method?: Input<string | undefined>

	/** The zone's SSL certificate or certificate and the intermediate(s). */
	certificate: Input<string>
	geo_restrictions?: Input<{

		/** Available values: "us", "eu", "highest_security". */
		label?: Input<string | undefined>
	} | undefined>

	/** Specify the policy that determines the region where your private key will be held locally. HTTPS connections to any excluded data center will still be fully encrypted, but will incur some latency while Keyless SSL is used to complete the handshake with the nearest allowed data center. Any combination of countries, specified by their two letter country code (https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements) can be chosen, such as 'country: IN', as well as 'region: EU' which refers to the EU region. If there are too few data centers satisfying the policy, it will be rejected. */
	policy?: Input<string | undefined>

	/** The zone's private key. */
	private_key: Input<string>

	/** The type 'legacy_custom' enables support for legacy clients which do not include SNI in the TLS handshake.
Available values: "legacy_custom", "sni_custom". */
	type?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareCustomSsl = Readonly<{

	/** A ubiquitous bundle has the highest probability of being verified everywhere, even by clients using outdated or unusual trust stores. An optimal bundle uses the shortest chain and newest intermediates. And the force bundle verifies the chain, but does not otherwise modify it.
Available values: "ubiquitous", "optimal", "force". */
	bundle_method: Output<string>

	/** The zone's SSL certificate or certificate and the intermediate(s). */
	certificate: Output<string>

	/** When the certificate from the authority expires. */
	expires_on: Output<string>
	geo_restrictions: Output<Readonly<{

		/** Available values: "us", "eu", "highest_security". */
		label: string
	}>>
	hosts: ReadonlyArray<string>

	/** Identifier */
	id: Output<string>

	/** The certificate authority that issued the certificate. */
	issuer: Output<string>
	keyless_server: Output<Readonly<{

		/** When the Keyless SSL was created. */
		created_on: string

		/** Whether or not the Keyless SSL is on or off. */
		enabled: boolean

		/** The keyless SSL name. */
		host: string

		/** Keyless certificate identifier tag. */
		id: string

		/** When the Keyless SSL was last modified. */
		modified_on: string

		/** The keyless SSL name. */
		name: string

		/** Available permissions for the Keyless SSL for the current user requesting the item. */
		permissions: ReadonlyArray<string>

		/** The keyless SSL port used to communicate between Cloudflare and the client's Keyless SSL server. */
		port: number

		/** Status of the Keyless SSL.
Available values: "active", "deleted". */
		status: string
		tunnel: Readonly<{

			/** Private IP of the Key Server Host */
			private_ip: string

			/** Cloudflare Tunnel Virtual Network ID */
			vnet_id: string
		}>
	}>>

	/** When the certificate was last modified. */
	modified_on: Output<string>

	/** Specify the policy that determines the region where your private key will be held locally. HTTPS connections to any excluded data center will still be fully encrypted, but will incur some latency while Keyless SSL is used to complete the handshake with the nearest allowed data center. Any combination of countries, specified by their two letter country code (https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements) can be chosen, such as 'country: IN', as well as 'region: EU' which refers to the EU region. If there are too few data centers satisfying the policy, it will be rejected. */
	policy: Output<string | undefined>

	/** The order/priority in which the certificate will be used in a request. The higher priority will break ties across overlapping 'legacy_custom' certificates, but 'legacy_custom' certificates will always supercede 'sni_custom' certificates. */
	priority: Output<number>

	/** The zone's private key. */
	private_key: Output<string>

	/** The type of hash used for the certificate. */
	signature: Output<string>

	/** Status of the zone's custom SSL.
Available values: "active", "expired", "deleted", "pending", "initializing". */
	status: Output<string>

	/** The type 'legacy_custom' enables support for legacy clients which do not include SNI in the TLS handshake.
Available values: "legacy_custom", "sni_custom". */
	type: Output<string>

	/** When the certificate was uploaded to Cloudflare. */
	uploaded_on: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareLeakedCredentialCheckRuleProps = {

	/** The ruleset expression to use in matching the password in a request */
	password?: Input<string | undefined>

	/** The ruleset expression to use in matching the username in a request */
	username?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareLeakedCredentialCheckRule = Readonly<{

	/** The unique ID for this custom detection */
	id: Output<string>

	/** The ruleset expression to use in matching the password in a request */
	password: Output<string | undefined>

	/** The ruleset expression to use in matching the username in a request */
	username: Output<string | undefined>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareR2BucketEventNotificationProps = {

	/** Account ID */
	account_id: Input<string>

	/** Name of the bucket */
	bucket_name: Input<string>

	/** Jurisdiction of the bucket */
	jurisdiction?: Input<string | undefined>

	/** Queue ID */
	queue_id?: Input<string | undefined>
	rules?: Input<{

		/** Array of R2 object actions that will trigger notifications */
		actions: Input<Array<Input<string>>>

		/** A description that can be used to identify the event notification rule after creation */
		description?: Input<string | undefined>

		/** Notifications will be sent only for objects with this prefix */
		prefix?: Input<string | undefined>

		/** Notifications will be sent only for objects with this suffix */
		suffix?: Input<string | undefined>
	} | undefined>
}

type CloudflareR2BucketEventNotification = Readonly<{

	/** Account ID */
	account_id: Output<string>

	/** Name of the bucket */
	bucket_name: Output<string>

	/** Jurisdiction of the bucket */
	jurisdiction: Output<string>

	/** Queue ID */
	queue_id: Output<string | undefined>
	queues: Output<Readonly<{

		/** Queue ID */
		queue_id: string

		/** Name of the queue */
		queue_name: string
		rules: Readonly<{

			/** Array of R2 object actions that will trigger notifications */
			actions: ReadonlyArray<string>

			/** Timestamp when the rule was created */
			created_at: string

			/** A description that can be used to identify the event notification rule after creation */
			description: string

			/** Notifications will be sent only for objects with this prefix */
			prefix: string

			/** Rule ID */
			rule_id: string

			/** Notifications will be sent only for objects with this suffix */
			suffix: string
		}>
	}>>
	rules: Output<Readonly<{

		/** Array of R2 object actions that will trigger notifications */
		actions: ReadonlyArray<string>

		/** A description that can be used to identify the event notification rule after creation */
		description: string

		/** Notifications will be sent only for objects with this prefix */
		prefix: string

		/** Notifications will be sent only for objects with this suffix */
		suffix: string
	}>>
}>

type CloudflareLogpullRetentionProps = {

	/** The log retention flag for Logpull API. */
	flag?: Input<boolean | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareLogpullRetention = Readonly<{

	/** The log retention flag for Logpull API. */
	flag: Output<boolean | undefined>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareLogpushJobProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** Name of the dataset. A list of supported datasets can be found on the [Developer Docs](https://developers.cloudflare.com/logs/reference/log-fields/). */
	dataset?: Input<string | undefined>

	/** Uniquely identifies a resource (such as an s3 bucket) where data will be pushed. Additional configuration parameters supported by the destination may be included. */
	destination_conf: Input<string>

	/** Flag that indicates if the job is enabled. */
	enabled?: Input<boolean | undefined>

	/** This field is deprecated. Please use `max_upload_*` parameters instead. The frequency at which Cloudflare sends batches of logs to your destination. Setting frequency to high sends your logs in larger quantities of smaller files. Setting frequency to low sends logs in smaller quantities of larger files.
Available values: "high", "low". */
	frequency?: Input<string | undefined>

	/** The kind parameter (optional) is used to differentiate between Logpush and Edge Log Delivery jobs. Currently, Edge Log Delivery is only supported for the `http_requests` dataset.
Available values: "edge". */
	kind?: Input<string | undefined>

	/** This field is deprecated. Use `output_options` instead. Configuration string. It specifies things like requested fields and timestamp formats. If migrating from the logpull api, copy the url (full url or just the query string) of your call here, and logpush will keep on making this call for you, setting start and end times appropriately. */
	logpull_options?: Input<string | undefined>

	/** The maximum uncompressed file size of a batch of logs. This setting value must be between `5 MB` and `1 GB`, or `0` to disable it. Note that you cannot set a minimum file size; this means that log files may be much smaller than this batch size. This parameter is not available for jobs with `edge` as its kind. */
	max_upload_bytes?: Input<number | undefined>

	/** The maximum interval in seconds for log batches. This setting must be between 30 and 300 seconds (5 minutes), or `0` to disable it. Note that you cannot specify a minimum interval for log batches; this means that log files may be sent in shorter intervals than this. This parameter is only used for jobs with `edge` as its kind. */
	max_upload_interval_seconds?: Input<number | undefined>

	/** The maximum number of log lines per batch. This setting must be between 1000 and 1,000,000 lines, or `0` to disable it. Note that you cannot specify a minimum number of log lines per batch; this means that log files may contain many fewer lines than this. This parameter is not available for jobs with `edge` as its kind. */
	max_upload_records?: Input<number | undefined>

	/** Optional human readable job name. Not unique. Cloudflare suggests that you set this to a meaningful string, like the domain name, to make it easier to identify your job. */
	name?: Input<string | undefined>
	output_options?: Input<{

		/** String to be prepended before each batch. */
		batch_prefix?: Input<string | undefined>

		/** String to be appended after each batch. */
		batch_suffix?: Input<string | undefined>

		/** If set to true, will cause all occurrences of `${` in the generated files to be replaced with `x{`. */
		cve_2021_44228?: Input<boolean | undefined>

		/** String to join fields. This field be ignored when `record_template` is set. */
		field_delimiter?: Input<string | undefined>

		/** List of field names to be included in the Logpush output. For the moment, there is no option to add all fields at once, so you must specify all the fields names you are interested in. */
		field_names?: Input<Array<Input<string>> | undefined>

		/** Specifies the output type, such as `ndjson` or `csv`. This sets default values for the rest of the settings, depending on the chosen output type. Some formatting rules, like string quoting, are different between output types.
Available values: "ndjson", "csv". */
		output_type?: Input<string | undefined>

		/** String to be inserted in-between the records as separator. */
		record_delimiter?: Input<string | undefined>

		/** String to be prepended before each record. */
		record_prefix?: Input<string | undefined>

		/** String to be appended after each record. */
		record_suffix?: Input<string | undefined>

		/** String to use as template for each record instead of the default comma-separated list. All fields used in the template must be present in `field_names` as well, otherwise they will end up as null. Format as a Go `text/template` without any standard functions, like conditionals, loops, sub-templates, etc. */
		record_template?: Input<string | undefined>

		/** Floating number to specify sampling rate. Sampling is applied on top of filtering, and regardless of the current `sample_interval` of the data. */
		sample_rate?: Input<number | undefined>

		/** String to specify the format for timestamps, such as `unixnano`, `unix`, or `rfc3339`.
Available values: "unixnano", "unix", "rfc3339". */
		timestamp_format?: Input<string | undefined>
	} | undefined>

	/** Ownership challenge token to prove destination ownership. */
	ownership_challenge?: Input<string | undefined>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareLogpushJob = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** Name of the dataset. A list of supported datasets can be found on the [Developer Docs](https://developers.cloudflare.com/logs/reference/log-fields/). */
	dataset: Output<string | undefined>

	/** Uniquely identifies a resource (such as an s3 bucket) where data will be pushed. Additional configuration parameters supported by the destination may be included. */
	destination_conf: Output<string>

	/** Flag that indicates if the job is enabled. */
	enabled: Output<boolean | undefined>

	/** If not null, the job is currently failing. Failures are usually repetitive (example: no permissions to write to destination bucket). Only the last failure is recorded. On successful execution of a job the error_message and last_error are set to null. */
	error_message: Output<string>

	/** This field is deprecated. Please use `max_upload_*` parameters instead. The frequency at which Cloudflare sends batches of logs to your destination. Setting frequency to high sends your logs in larger quantities of smaller files. Setting frequency to low sends logs in smaller quantities of larger files.
Available values: "high", "low". */
	frequency: Output<string>

	/** Unique id of the job. */
	id: Output<number>

	/** The kind parameter (optional) is used to differentiate between Logpush and Edge Log Delivery jobs. Currently, Edge Log Delivery is only supported for the `http_requests` dataset.
Available values: "edge". */
	kind: Output<string | undefined>

	/** Records the last time for which logs have been successfully pushed. If the last successful push was for logs range 2018-07-23T10:00:00Z to 2018-07-23T10:01:00Z then the value of this field will be 2018-07-23T10:01:00Z. If the job has never run or has just been enabled and hasn't run yet then the field will be empty. */
	last_complete: Output<string>

	/** Records the last time the job failed. If not null, the job is currently failing. If null, the job has either never failed or has run successfully at least once since last failure. See also the error_message field. */
	last_error: Output<string>

	/** This field is deprecated. Use `output_options` instead. Configuration string. It specifies things like requested fields and timestamp formats. If migrating from the logpull api, copy the url (full url or just the query string) of your call here, and logpush will keep on making this call for you, setting start and end times appropriately. */
	logpull_options: Output<string | undefined>

	/** The maximum uncompressed file size of a batch of logs. This setting value must be between `5 MB` and `1 GB`, or `0` to disable it. Note that you cannot set a minimum file size; this means that log files may be much smaller than this batch size. This parameter is not available for jobs with `edge` as its kind. */
	max_upload_bytes: Output<number | undefined>

	/** The maximum interval in seconds for log batches. This setting must be between 30 and 300 seconds (5 minutes), or `0` to disable it. Note that you cannot specify a minimum interval for log batches; this means that log files may be sent in shorter intervals than this. This parameter is only used for jobs with `edge` as its kind. */
	max_upload_interval_seconds: Output<number>

	/** The maximum number of log lines per batch. This setting must be between 1000 and 1,000,000 lines, or `0` to disable it. Note that you cannot specify a minimum number of log lines per batch; this means that log files may contain many fewer lines than this. This parameter is not available for jobs with `edge` as its kind. */
	max_upload_records: Output<number>

	/** Optional human readable job name. Not unique. Cloudflare suggests that you set this to a meaningful string, like the domain name, to make it easier to identify your job. */
	name: Output<string | undefined>
	output_options: Output<Readonly<{

		/** String to be prepended before each batch. */
		batch_prefix: string

		/** String to be appended after each batch. */
		batch_suffix: string

		/** If set to true, will cause all occurrences of `${` in the generated files to be replaced with `x{`. */
		cve_2021_44228: boolean

		/** String to join fields. This field be ignored when `record_template` is set. */
		field_delimiter: string

		/** List of field names to be included in the Logpush output. For the moment, there is no option to add all fields at once, so you must specify all the fields names you are interested in. */
		field_names: ReadonlyArray<string>

		/** Specifies the output type, such as `ndjson` or `csv`. This sets default values for the rest of the settings, depending on the chosen output type. Some formatting rules, like string quoting, are different between output types.
Available values: "ndjson", "csv". */
		output_type: string

		/** String to be inserted in-between the records as separator. */
		record_delimiter: string

		/** String to be prepended before each record. */
		record_prefix: string

		/** String to be appended after each record. */
		record_suffix: string

		/** String to use as template for each record instead of the default comma-separated list. All fields used in the template must be present in `field_names` as well, otherwise they will end up as null. Format as a Go `text/template` without any standard functions, like conditionals, loops, sub-templates, etc. */
		record_template: string

		/** Floating number to specify sampling rate. Sampling is applied on top of filtering, and regardless of the current `sample_interval` of the data. */
		sample_rate: number

		/** String to specify the format for timestamps, such as `unixnano`, `unix`, or `rfc3339`.
Available values: "unixnano", "unix", "rfc3339". */
		timestamp_format: string
	}>>

	/** Ownership challenge token to prove destination ownership. */
	ownership_challenge: Output<string | undefined>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareR2BucketSippyProps = {

	/** Account ID */
	account_id: Input<string>

	/** Name of the bucket */
	bucket_name: Input<string>
	destination?: Input<{

		/** ID of a Cloudflare API token.
This is the value labelled "Access Key ID" when creating an API
token from the [R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2/api-tokens).

Sippy will use this token when writing objects to R2, so it is
best to scope this token to the bucket you're enabling Sippy for. */
		access_key_id?: Input<string | undefined>

		/** Available values: "r2". */
		provider?: Input<string | undefined>

		/** Value of a Cloudflare API token.
This is the value labelled "Secret Access Key" when creating an API
token from the [R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2/api-tokens).

Sippy will use this token when writing objects to R2, so it is
best to scope this token to the bucket you're enabling Sippy for. */
		secret_access_key?: Input<string | undefined>
	} | undefined>

	/** Jurisdiction of the bucket */
	jurisdiction?: Input<string | undefined>
	source?: Input<{

		/** Access Key ID of an IAM credential (ideally scoped to a single S3 bucket) */
		access_key_id?: Input<string | undefined>

		/** Name of the AWS S3 bucket */
		bucket?: Input<string | undefined>

		/** Client email of an IAM credential (ideally scoped to a single GCS bucket) */
		client_email?: Input<string | undefined>

		/** Private Key of an IAM credential (ideally scoped to a single GCS bucket) */
		private_key?: Input<string | undefined>

		/** Available values: "aws". */
		provider?: Input<string | undefined>

		/** Name of the AWS availability zone */
		region?: Input<string | undefined>

		/** Secret Access Key of an IAM credential (ideally scoped to a single S3 bucket) */
		secret_access_key?: Input<string | undefined>
	} | undefined>
}

type CloudflareR2BucketSippy = Readonly<{

	/** Account ID */
	account_id: Output<string>

	/** Name of the bucket */
	bucket_name: Output<string>
	destination: Output<Readonly<{

		/** ID of a Cloudflare API token.
This is the value labelled "Access Key ID" when creating an API
token from the [R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2/api-tokens).

Sippy will use this token when writing objects to R2, so it is
best to scope this token to the bucket you're enabling Sippy for. */
		access_key_id: string

		/** Available values: "r2". */
		provider: string

		/** Value of a Cloudflare API token.
This is the value labelled "Secret Access Key" when creating an API
token from the [R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2/api-tokens).

Sippy will use this token when writing objects to R2, so it is
best to scope this token to the bucket you're enabling Sippy for. */
		secret_access_key: string
	}>>

	/** State of Sippy for this bucket */
	enabled: Output<boolean>

	/** Jurisdiction of the bucket */
	jurisdiction: Output<string>
	source: Output<Readonly<{

		/** Access Key ID of an IAM credential (ideally scoped to a single S3 bucket) */
		access_key_id: string

		/** Name of the AWS S3 bucket */
		bucket: string

		/** Client email of an IAM credential (ideally scoped to a single GCS bucket) */
		client_email: string

		/** Private Key of an IAM credential (ideally scoped to a single GCS bucket) */
		private_key: string

		/** Available values: "aws". */
		provider: string

		/** Name of the AWS availability zone */
		region: string

		/** Secret Access Key of an IAM credential (ideally scoped to a single S3 bucket) */
		secret_access_key: string
	}>>
}>

type CloudflareR2BucketCorsProps = {

	/** Account ID */
	account_id: Input<string>

	/** Name of the bucket */
	bucket_name: Input<string>

	/** Jurisdiction of the bucket */
	jurisdiction?: Input<string | undefined>
	rules?: Input<{
		allowed: Input<{

			/** Specifies the value for the Access-Control-Allow-Headers header R2 sets when requesting objects in this bucket from a browser. Cross-origin requests that include custom headers (e.g. x-user-id) should specify these headers as AllowedHeaders. */
			headers?: Input<Array<Input<string>> | undefined>

			/** Specifies the value for the Access-Control-Allow-Methods header R2 sets when requesting objects in a bucket from a browser. */
			methods: Input<Array<Input<string>>>

			/** Specifies the value for the Access-Control-Allow-Origin header R2 sets when requesting objects in a bucket from a browser. */
			origins: Input<Array<Input<string>>>
		}>

		/** Specifies the headers that can be exposed back, and accessed by, the JavaScript making the cross-origin request. If you need to access headers beyond the safelisted response headers, such as Content-Encoding or cf-cache-status, you must specify it here. */
		expose_headers?: Input<Array<Input<string>> | undefined>

		/** Identifier for this rule */
		id?: Input<string | undefined>

		/** Specifies the amount of time (in seconds) browsers are allowed to cache CORS preflight responses. Browsers may limit this to 2 hours or less, even if the maximum value (86400) is specified. */
		max_age_seconds?: Input<number | undefined>
	} | undefined>
}

type CloudflareR2BucketCors = Readonly<{

	/** Account ID */
	account_id: Output<string>

	/** Name of the bucket */
	bucket_name: Output<string>

	/** Jurisdiction of the bucket */
	jurisdiction: Output<string>
	rules: Output<Readonly<{
		allowed: Readonly<{

			/** Specifies the value for the Access-Control-Allow-Headers header R2 sets when requesting objects in this bucket from a browser. Cross-origin requests that include custom headers (e.g. x-user-id) should specify these headers as AllowedHeaders. */
			headers?: ReadonlyArray<string>

			/** Specifies the value for the Access-Control-Allow-Methods header R2 sets when requesting objects in a bucket from a browser. */
			methods: ReadonlyArray<string>

			/** Specifies the value for the Access-Control-Allow-Origin header R2 sets when requesting objects in a bucket from a browser. */
			origins: ReadonlyArray<string>
		}>

		/** Specifies the headers that can be exposed back, and accessed by, the JavaScript making the cross-origin request. If you need to access headers beyond the safelisted response headers, such as Content-Encoding or cf-cache-status, you must specify it here. */
		expose_headers: ReadonlyArray<string>

		/** Identifier for this rule */
		id: string

		/** Specifies the amount of time (in seconds) browsers are allowed to cache CORS preflight responses. Browsers may limit this to 2 hours or less, even if the maximum value (86400) is specified. */
		max_age_seconds: number
	}>>
}>

type CloudflareZeroTrustDeviceDefaultProfileProps = {
	account_id: Input<string>

	/** Whether to allow the user to switch WARP between modes. */
	allow_mode_switch?: Input<boolean | undefined>

	/** Whether to receive update notifications when a new version of the client is available. */
	allow_updates?: Input<boolean | undefined>

	/** Whether to allow devices to leave the organization. */
	allowed_to_leave?: Input<boolean | undefined>

	/** The amount of time in seconds to reconnect after having been disabled. */
	auto_connect?: Input<number | undefined>

	/** Turn on the captive portal after the specified amount of time. */
	captive_portal?: Input<number | undefined>

	/** If the `dns_server` field of a fallback domain is not present, the client will fall back to a best guess of the default/system DNS resolvers unless this policy option is set to `true`. */
	disable_auto_fallback?: Input<boolean | undefined>
	exclude?: Input<{

		/** The address in CIDR format to exclude from the tunnel. If `address` is present, `host` must not be present. */
		address: Input<string>

		/** A description of the Split Tunnel item, displayed in the client UI. */
		description: Input<string>

		/** The domain name to exclude from the tunnel. If `host` is present, `address` must not be present. */
		host?: Input<string | undefined>
	} | undefined>

	/** Whether to add Microsoft IPs to Split Tunnel exclusions. */
	exclude_office_ips?: Input<boolean | undefined>
	include?: Input<{

		/** The address in CIDR format to exclude from the tunnel. If `address` is present, `host` must not be present. */
		address: Input<string>

		/** A description of the Split Tunnel item, displayed in the client UI. */
		description: Input<string>

		/** The domain name to exclude from the tunnel. If `host` is present, `address` must not be present. */
		host?: Input<string | undefined>
	} | undefined>

	/** Determines if the operating system will register WARP's local interface IP with your on-premises DNS server. */
	register_interface_ip_with_dns?: Input<boolean | undefined>
	service_mode_v2?: Input<{

		/** The mode to run the WARP client under. */
		mode?: Input<string | undefined>

		/** The port number when used with proxy mode. */
		port?: Input<number | undefined>
	} | undefined>

	/** The URL to launch when the Send Feedback button is clicked. */
	support_url?: Input<string | undefined>

	/** Whether to allow the user to turn off the WARP switch and disconnect the client. */
	switch_locked?: Input<boolean | undefined>

	/** Determines which tunnel protocol to use. */
	tunnel_protocol?: Input<string | undefined>
}

type CloudflareZeroTrustDeviceDefaultProfile = Readonly<{
	account_id: Output<string>

	/** Whether to allow the user to switch WARP between modes. */
	allow_mode_switch: Output<boolean | undefined>

	/** Whether to receive update notifications when a new version of the client is available. */
	allow_updates: Output<boolean | undefined>

	/** Whether to allow devices to leave the organization. */
	allowed_to_leave: Output<boolean | undefined>

	/** The amount of time in seconds to reconnect after having been disabled. */
	auto_connect: Output<number | undefined>

	/** Turn on the captive portal after the specified amount of time. */
	captive_portal: Output<number | undefined>

	/** Whether the policy will be applied to matching devices. */
	default: Output<boolean>

	/** If the `dns_server` field of a fallback domain is not present, the client will fall back to a best guess of the default/system DNS resolvers unless this policy option is set to `true`. */
	disable_auto_fallback: Output<boolean | undefined>

	/** Whether the policy will be applied to matching devices. */
	enabled: Output<boolean>
	exclude: Output<Readonly<{

		/** The address in CIDR format to exclude from the tunnel. If `address` is present, `host` must not be present. */
		address: string

		/** A description of the Split Tunnel item, displayed in the client UI. */
		description: string

		/** The domain name to exclude from the tunnel. If `host` is present, `address` must not be present. */
		host: string
	}>>

	/** Whether to add Microsoft IPs to Split Tunnel exclusions. */
	exclude_office_ips: Output<boolean | undefined>
	fallback_domains: Output<Readonly<{

		/** A description of the fallback domain, displayed in the client UI. */
		description: string

		/** A list of IP addresses to handle domain resolution. */
		dns_server: ReadonlyArray<string>

		/** The domain suffix to match when resolving locally. */
		suffix: string
	}>>
	gateway_unique_id: Output<string>
	id: Output<string>
	include: Output<Readonly<{

		/** The address in CIDR format to exclude from the tunnel. If `address` is present, `host` must not be present. */
		address: string

		/** A description of the Split Tunnel item, displayed in the client UI. */
		description: string

		/** The domain name to exclude from the tunnel. If `host` is present, `address` must not be present. */
		host: string
	}>>

	/** Determines if the operating system will register WARP's local interface IP with your on-premises DNS server. */
	register_interface_ip_with_dns: Output<boolean | undefined>
	service_mode_v2: Output<Readonly<{

		/** The mode to run the WARP client under. */
		mode: string

		/** The port number when used with proxy mode. */
		port: number
	}>>

	/** The URL to launch when the Send Feedback button is clicked. */
	support_url: Output<string | undefined>

	/** Whether to allow the user to turn off the WARP switch and disconnect the client. */
	switch_locked: Output<boolean | undefined>

	/** Determines which tunnel protocol to use. */
	tunnel_protocol: Output<string | undefined>
}>

type CloudflareZeroTrustDnsLocationProps = {
	account_id: Input<string>

	/** True if the location is the default location. */
	client_default?: Input<boolean | undefined>

	/** The identifier of the pair of IPv4 addresses assigned to this location. When creating a location, if this field is absent or set with null, the pair of shared IPv4 addresses (0e4a32c6-6fb8-4858-9296-98f51631e8e6) is auto-assigned. When updating a location, if the field is absent or set with null, the pre-assigned pair remains unchanged. */
	dns_destination_ips_id?: Input<string | undefined>

	/** True if the location needs to resolve EDNS queries. */
	ecs_support?: Input<boolean | undefined>
	endpoints?: Input<{
		doh?: Input<{

			/** True if the endpoint is enabled for this location. */
			enabled?: Input<boolean | undefined>
			networks?: Input<{

				/** The IP address or IP CIDR. */
				network: Input<string>
			} | undefined>

			/** True if the endpoint requires [user identity](https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/agentless/dns/dns-over-https/#filter-doh-requests-by-user) authentication. */
			require_token?: Input<boolean | undefined>
		} | undefined>
		dot?: Input<{

			/** True if the endpoint is enabled for this location. */
			enabled?: Input<boolean | undefined>
			networks?: Input<{

				/** The IP address or IP CIDR. */
				network: Input<string>
			} | undefined>
		} | undefined>
		ipv4?: Input<{

			/** True if the endpoint is enabled for this location. */
			enabled?: Input<boolean | undefined>
		} | undefined>
		ipv6?: Input<{

			/** True if the endpoint is enabled for this location. */
			enabled?: Input<boolean | undefined>
			networks?: Input<{

				/** The IPv6 address or IPv6 CIDR. */
				network: Input<string>
			} | undefined>
		} | undefined>
	} | undefined>

	/** The name of the location. */
	name: Input<string>
	networks?: Input<{

		/** The IPv4 address or IPv4 CIDR. IPv4 CIDRs are limited to a maximum of /24. */
		network: Input<string>
	} | undefined>
}

type CloudflareZeroTrustDnsLocation = Readonly<{
	account_id: Output<string>

	/** True if the location is the default location. */
	client_default: Output<boolean | undefined>
	created_at: Output<string>

	/** The identifier of the pair of IPv4 addresses assigned to this location. When creating a location, if this field is absent or set with null, the pair of shared IPv4 addresses (0e4a32c6-6fb8-4858-9296-98f51631e8e6) is auto-assigned. When updating a location, if the field is absent or set with null, the pre-assigned pair remains unchanged. */
	dns_destination_ips_id: Output<string | undefined>

	/** The uuid identifier of the IPv6 block brought to the gateway, so that this location's IPv6 address is allocated from the Bring Your Own Ipv6(BYOIPv6) block and not from the standard CloudFlare IPv6 block. */
	dns_destination_ipv6_block_id: Output<string>

	/** The DNS over HTTPS domain to send DNS requests to. This field is auto-generated by Gateway. */
	doh_subdomain: Output<string>

	/** True if the location needs to resolve EDNS queries. */
	ecs_support: Output<boolean | undefined>
	endpoints: Output<Readonly<{
		doh: Readonly<{

			/** True if the endpoint is enabled for this location. */
			enabled?: boolean
			networks: Readonly<{

				/** The IP address or IP CIDR. */
				network: string
			}>

			/** True if the endpoint requires [user identity](https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/agentless/dns/dns-over-https/#filter-doh-requests-by-user) authentication. */
			require_token?: boolean
		}>
		dot: Readonly<{

			/** True if the endpoint is enabled for this location. */
			enabled?: boolean
			networks: Readonly<{

				/** The IP address or IP CIDR. */
				network: string
			}>
		}>
		ipv4: Readonly<{

			/** True if the endpoint is enabled for this location. */
			enabled?: boolean
		}>
		ipv6: Readonly<{

			/** True if the endpoint is enabled for this location. */
			enabled?: boolean
			networks: Readonly<{

				/** The IPv6 address or IPv6 CIDR. */
				network: string
			}>
		}>
	}>>
	id: Output<string>

	/** IPV6 destination ip assigned to this location. DNS requests sent to this IP will counted as the request under this location. This field is auto-generated by Gateway. */
	ip: Output<string>

	/** The primary destination IPv4 address from the pair identified by the dns_destination_ips_id. This field is read-only. */
	ipv4_destination: Output<string>

	/** The backup destination IPv4 address from the pair identified by the dns_destination_ips_id. This field is read-only. */
	ipv4_destination_backup: Output<string>

	/** The name of the location. */
	name: Output<string>
	networks: Output<Readonly<{

		/** The IPv4 address or IPv4 CIDR. IPv4 CIDRs are limited to a maximum of /24. */
		network: string
	}>>
	updated_at: Output<string>
}>

type CloudflareEmailRoutingAddressProps = {

	/** Identifier */
	account_id: Input<string>

	/** The contact email address of the user. */
	email: Input<string>
}

type CloudflareEmailRoutingAddress = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The date and time the destination address has been created. */
	created: Output<string>

	/** The contact email address of the user. */
	email: Output<string>

	/** Destination address identifier. */
	id: Output<string>

	/** The date and time the destination address was last modified. */
	modified: Output<string>

	/** Destination address tag. (Deprecated, replaced by destination address identifier) */
	tag: Output<string>

	/** The date and time the destination address has been verified. Null means not verified yet. */
	verified: Output<string>
}>

type CloudflareRateLimitProps = {
	action: Input<{

		/** The action to perform.
Available values: "simulate", "ban", "challenge", "js_challenge", "managed_challenge". */
		mode?: Input<string | undefined>
		response?: Input<{

			/** The response body to return. The value must conform to the configured content type. */
			body?: Input<string | undefined>

			/** The content type of the body. Must be one of the following: `text/plain`, `text/xml`, or `application/json`. */
			content_type?: Input<string | undefined>
		} | undefined>

		/** The time in seconds during which Cloudflare will perform the mitigation action. Must be an integer value greater than or equal to the period.
Notes: If "mode" is "challenge", "managed_challenge", or "js_challenge", Cloudflare will use the zone's Challenge Passage time and you should not provide this value. */
		timeout?: Input<number | undefined>
	}>
	match: Input<{
		headers?: Input<{

			/** The name of the response header to match. */
			name?: Input<string | undefined>

			/** The operator used when matching: `eq` means "equal" and `ne` means "not equal".
Available values: "eq", "ne". */
			op?: Input<string | undefined>

			/** The value of the response header, which must match exactly. */
			value?: Input<string | undefined>
		} | undefined>
		request?: Input<{

			/** The HTTP methods to match. You can specify a subset (for example, `['POST','PUT']`) or all methods (`['_ALL_']`). This field is optional when creating a rate limit. */
			methods?: Input<Array<Input<string>> | undefined>

			/** The HTTP schemes to match. You can specify one scheme (`['HTTPS']`), both schemes (`['HTTP','HTTPS']`), or all schemes (`['_ALL_']`). This field is optional. */
			schemes?: Input<Array<Input<string>> | undefined>

			/** The URL pattern to match, composed of a host and a path such as `example.org/path*`. Normalization is applied before the pattern is matched. `*` wildcards are expanded to match applicable traffic. Query strings are not matched. Set the value to `*` to match all traffic to your zone. */
			url?: Input<string | undefined>
		} | undefined>
		response?: Input<{

			/** When true, only the uncached traffic served from your origin servers will count towards rate limiting. In this case, any cached traffic served by Cloudflare will not count towards rate limiting. This field is optional.
Notes: This field is deprecated. Instead, use response headers and set "origin_traffic" to "false" to avoid legacy behaviour interacting with the "response_headers" property. */
			origin_traffic?: Input<boolean | undefined>
		} | undefined>
	}>

	/** The time in seconds (an integer value) to count matching traffic. If the count exceeds the configured threshold within this period, Cloudflare will perform the configured action. */
	period: Input<number>

	/** The threshold that will trigger the configured mitigation action. Configure this value along with the `period` property to establish a threshold per period. */
	threshold: Input<number>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareRateLimit = Readonly<{
	action: Output<Readonly<{

		/** The action to perform.
Available values: "simulate", "ban", "challenge", "js_challenge", "managed_challenge". */
		mode: string
		response: Readonly<{

			/** The response body to return. The value must conform to the configured content type. */
			body?: string

			/** The content type of the body. Must be one of the following: `text/plain`, `text/xml`, or `application/json`. */
			content_type?: string
		}>

		/** The time in seconds during which Cloudflare will perform the mitigation action. Must be an integer value greater than or equal to the period.
Notes: If "mode" is "challenge", "managed_challenge", or "js_challenge", Cloudflare will use the zone's Challenge Passage time and you should not provide this value. */
		timeout: number
	}>>
	bypass: Output<Readonly<{

		/** Available values: "url". */
		name: string

		/** The URL to bypass. */
		value: string
	}>>

	/** An informative summary of the rate limit. This value is sanitized and any tags will be removed. */
	description: Output<string>

	/** When true, indicates that the rate limit is currently disabled. */
	disabled: Output<boolean>

	/** The unique identifier of the rate limit. */
	id: Output<string>
	match: Output<Readonly<{
		headers: Readonly<{

			/** The name of the response header to match. */
			name?: string

			/** The operator used when matching: `eq` means "equal" and `ne` means "not equal".
Available values: "eq", "ne". */
			op?: string

			/** The value of the response header, which must match exactly. */
			value?: string
		}>
		request: Readonly<{

			/** The HTTP methods to match. You can specify a subset (for example, `['POST','PUT']`) or all methods (`['_ALL_']`). This field is optional when creating a rate limit. */
			methods?: ReadonlyArray<string>

			/** The HTTP schemes to match. You can specify one scheme (`['HTTPS']`), both schemes (`['HTTP','HTTPS']`), or all schemes (`['_ALL_']`). This field is optional. */
			schemes?: ReadonlyArray<string>

			/** The URL pattern to match, composed of a host and a path such as `example.org/path*`. Normalization is applied before the pattern is matched. `*` wildcards are expanded to match applicable traffic. Query strings are not matched. Set the value to `*` to match all traffic to your zone. */
			url?: string
		}>
		response: Readonly<{

			/** When true, only the uncached traffic served from your origin servers will count towards rate limiting. In this case, any cached traffic served by Cloudflare will not count towards rate limiting. This field is optional.
Notes: This field is deprecated. Instead, use response headers and set "origin_traffic" to "false" to avoid legacy behaviour interacting with the "response_headers" property. */
			origin_traffic?: boolean
		}>
	}>>

	/** The time in seconds (an integer value) to count matching traffic. If the count exceeds the configured threshold within this period, Cloudflare will perform the configured action. */
	period: Output<number>

	/** The threshold that will trigger the configured mitigation action. Configure this value along with the `period` property to establish a threshold per period. */
	threshold: Output<number>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustDlpEntryProps = {
	account_id: Input<string>
	enabled: Input<boolean>
	name: Input<string>
	pattern: Input<{
		regex: Input<string>

		/** Available values: "luhn". */
		validation?: Input<string | undefined>
	}>
	profile_id: Input<string>

	/** Available values: "custom". */
	type?: Input<string | undefined>
}

type CloudflareZeroTrustDlpEntry = Readonly<{
	account_id: Output<string>
	confidence: Output<Readonly<{

		/** Indicates whether this entry has AI remote service validation */
		ai_context_available: boolean

		/** Indicates whether this entry has any form of validation that is not an AI remote service */
		available: boolean
	}>>
	created_at: Output<string>
	enabled: Output<boolean>
	id: Output<string>
	name: Output<string>
	pattern: Output<Readonly<{
		regex: string

		/** Available values: "luhn". */
		validation: string
	}>>
	profile_id: Output<string>
	secret: Output<boolean>

	/** Available values: "custom". */
	type: Output<string | undefined>
	updated_at: Output<string>
	word_list: Output<string>
}>

type CloudflareZeroTrustTunnelCloudflaredVirtualNetworkProps = {

	/** Cloudflare account ID */
	account_id: Input<string>

	/** Optional remark describing the virtual network. */
	comment?: Input<string | undefined>

	/** If `true`, this virtual network is the default for the account. */
	is_default?: Input<boolean | undefined>

	/** If `true`, this virtual network is the default for the account. */
	is_default_network?: Input<boolean | undefined>

	/** A user-friendly name for the virtual network. */
	name: Input<string>
}

type CloudflareZeroTrustTunnelCloudflaredVirtualNetwork = Readonly<{

	/** Cloudflare account ID */
	account_id: Output<string>

	/** Optional remark describing the virtual network. */
	comment: Output<string | undefined>

	/** Timestamp of when the resource was created. */
	created_at: Output<string>

	/** Timestamp of when the resource was deleted. If `null`, the resource has not been deleted. */
	deleted_at: Output<string>

	/** UUID of the virtual network. */
	id: Output<string>

	/** If `true`, this virtual network is the default for the account. */
	is_default: Output<boolean | undefined>

	/** If `true`, this virtual network is the default for the account. */
	is_default_network: Output<boolean | undefined>

	/** A user-friendly name for the virtual network. */
	name: Output<string>
}>

type CloudflareDnsZoneTransfersPeerProps = {
	account_id: Input<string>

	/** IPv4/IPv6 address of primary or secondary nameserver, depending on what zone this peer is linked to. For primary zones this IP defines the IP of the secondary nameserver Cloudflare will NOTIFY upon zone changes. For secondary zones this IP defines the IP of the primary nameserver Cloudflare will send AXFR/IXFR requests to. */
	ip?: Input<string | undefined>

	/** Enable IXFR transfer protocol, default is AXFR. Only applicable to secondary zones. */
	ixfr_enable?: Input<boolean | undefined>

	/** The name of the peer. */
	name: Input<string>

	/** DNS port of primary or secondary nameserver, depending on what zone this peer is linked to. */
	port?: Input<number | undefined>

	/** TSIG authentication will be used for zone transfer if configured. */
	tsig_id?: Input<string | undefined>
}

type CloudflareDnsZoneTransfersPeer = Readonly<{
	account_id: Output<string>
	id: Output<string>

	/** IPv4/IPv6 address of primary or secondary nameserver, depending on what zone this peer is linked to. For primary zones this IP defines the IP of the secondary nameserver Cloudflare will NOTIFY upon zone changes. For secondary zones this IP defines the IP of the primary nameserver Cloudflare will send AXFR/IXFR requests to. */
	ip: Output<string | undefined>

	/** Enable IXFR transfer protocol, default is AXFR. Only applicable to secondary zones. */
	ixfr_enable: Output<boolean | undefined>

	/** The name of the peer. */
	name: Output<string>

	/** DNS port of primary or secondary nameserver, depending on what zone this peer is linked to. */
	port: Output<number | undefined>

	/** TSIG authentication will be used for zone transfer if configured. */
	tsig_id: Output<string | undefined>
}>

type CloudflareZeroTrustRiskBehaviorProps = {
	account_id: Input<string>
	behaviors: Input<{
		enabled: Input<boolean>

		/** Available values: "low", "medium", "high". */
		risk_level: Input<string>
	}>
}

type CloudflareZeroTrustRiskBehavior = Readonly<{
	account_id: Output<string>
	behaviors: Output<Readonly<{
		enabled: boolean

		/** Available values: "low", "medium", "high". */
		risk_level: string
	}>>
}>

type CloudflareZoneCacheReserveProps = {

	/** Value of the Cache Reserve zone setting.
Available values: "on", "off". */
	value?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareZoneCacheReserve = Readonly<{

	/** Whether the setting is editable */
	editable: Output<boolean>

	/** Identifier */
	id: Output<string>

	/** Last time this setting was modified. */
	modified_on: Output<string>

	/** Value of the Cache Reserve zone setting.
Available values: "on", "off". */
	value: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareSnippetRulesProps = {
	rules?: Input<{
		description?: Input<string | undefined>
		enabled?: Input<boolean | undefined>
		expression?: Input<string | undefined>

		/** Snippet identifying name */
		snippet_name?: Input<string | undefined>
	} | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareSnippetRules = Readonly<{
	description: Output<string>
	enabled: Output<boolean>
	expression: Output<string>
	rules: Output<Readonly<{
		description: string
		enabled: boolean
		expression: string

		/** Snippet identifying name */
		snippet_name: string
	}>>

	/** Snippet identifying name */
	snippet_name: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflarePageRuleProps = {
	actions: Input<{
		always_use_https?: Input<boolean | undefined>
		automatic_https_rewrites?: Input<string | undefined>
		browser_cache_ttl?: Input<number | undefined>
		browser_check?: Input<string | undefined>
		bypass_cache_on_cookie?: Input<string | undefined>
		cache_by_device_type?: Input<string | undefined>
		cache_deception_armor?: Input<string | undefined>
		cache_key_fields?: Input<{
			cookie?: Input<{
				check_presence?: Input<Array<Input<string>> | undefined>
				include?: Input<Array<Input<string>> | undefined>
			} | undefined>
			header?: Input<{
				check_presence?: Input<Array<Input<string>> | undefined>
				exclude?: Input<Array<Input<string>> | undefined>
				include?: Input<Array<Input<string>> | undefined>
			} | undefined>
			host?: Input<{
				resolved?: Input<boolean | undefined>
			} | undefined>
			query_string?: Input<{
				exclude?: Input<Array<Input<string>> | undefined>
				include?: Input<Array<Input<string>> | undefined>
			} | undefined>
			user?: Input<{
				device_type?: Input<boolean | undefined>
				geo?: Input<boolean | undefined>
				lang?: Input<boolean | undefined>
			} | undefined>
		} | undefined>
		cache_level?: Input<string | undefined>
		cache_on_cookie?: Input<string | undefined>
		cache_ttl_by_status?: Input<unknown | undefined>
		disable_apps?: Input<boolean | undefined>
		disable_performance?: Input<boolean | undefined>
		disable_security?: Input<boolean | undefined>
		disable_zaraz?: Input<boolean | undefined>
		edge_cache_ttl?: Input<number | undefined>
		email_obfuscation?: Input<string | undefined>
		explicit_cache_control?: Input<string | undefined>
		forwarding_url?: Input<{
			status_code: Input<number>
			url: Input<string>
		} | undefined>
		host_header_override?: Input<string | undefined>
		ip_geolocation?: Input<string | undefined>
		mirage?: Input<string | undefined>
		opportunistic_encryption?: Input<string | undefined>
		origin_error_page_pass_thru?: Input<string | undefined>
		polish?: Input<string | undefined>
		resolve_override?: Input<string | undefined>
		respect_strong_etag?: Input<string | undefined>
		response_buffering?: Input<string | undefined>
		rocket_loader?: Input<string | undefined>
		security_level?: Input<string | undefined>
		sort_query_string_for_cache?: Input<string | undefined>
		ssl?: Input<string | undefined>
		true_client_ip_header?: Input<string | undefined>
		waf?: Input<string | undefined>
	}>

	/** The priority of the rule, used to define which Page Rule is processed
over another. A higher number indicates a higher priority. For example,
if you have a catch-all Page Rule (rule A: `/images/*`) but want a more
specific Page Rule to take precedence (rule B: `/images/special/*`),
specify a higher priority for rule B so it overrides rule A. */
	priority?: Input<number | undefined>

	/** The status of the Page Rule.
Available values: "active", "disabled". */
	status?: Input<string | undefined>
	target: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflarePageRule = Readonly<{
	actions: Output<Readonly<{
		always_use_https: boolean
		automatic_https_rewrites: string
		browser_cache_ttl: number
		browser_check: string
		bypass_cache_on_cookie: string
		cache_by_device_type: string
		cache_deception_armor: string
		cache_key_fields: Readonly<{
			cookie?: Readonly<{
				check_presence: ReadonlyArray<string>
				include: ReadonlyArray<string>
			}>
			header?: Readonly<{
				check_presence: ReadonlyArray<string>
				exclude: ReadonlyArray<string>
				include: ReadonlyArray<string>
			}>
			host?: Readonly<{
				resolved?: boolean
			}>
			query_string?: Readonly<{
				exclude: ReadonlyArray<string>
				include: ReadonlyArray<string>
			}>
			user?: Readonly<{
				device_type?: boolean
				geo?: boolean
				lang?: boolean
			}>
		}>
		cache_level: string
		cache_on_cookie: string
		cache_ttl_by_status: unknown
		disable_apps: boolean
		disable_performance: boolean
		disable_security: boolean
		disable_zaraz: boolean
		edge_cache_ttl: number
		email_obfuscation: string
		explicit_cache_control: string
		forwarding_url: Readonly<{
			status_code: number
			url: string
		}>
		host_header_override: string
		ip_geolocation: string
		mirage: string
		opportunistic_encryption: string
		origin_error_page_pass_thru: string
		polish: string
		resolve_override: string
		respect_strong_etag: string
		response_buffering: string
		rocket_loader: string
		security_level: string
		sort_query_string_for_cache: string
		ssl: string
		true_client_ip_header: string
		waf: string
	}>>

	/** The timestamp of when the Page Rule was created. */
	created_on: Output<string>

	/** Identifier */
	id: Output<string>

	/** The timestamp of when the Page Rule was last modified. */
	modified_on: Output<string>

	/** The priority of the rule, used to define which Page Rule is processed
over another. A higher number indicates a higher priority. For example,
if you have a catch-all Page Rule (rule A: `/images/*`) but want a more
specific Page Rule to take precedence (rule B: `/images/special/*`),
specify a higher priority for rule B so it overrides rule A. */
	priority: Output<number>

	/** The status of the Page Rule.
Available values: "active", "disabled". */
	status: Output<string>
	target: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareStreamKeyProps = {

	/** Identifier */
	account_id: Input<string>
}

type CloudflareStreamKey = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The date and time a signing key was created. */
	created: Output<string>

	/** Identifier */
	id: Output<string>

	/** The signing key in JWK format. */
	jwk: Output<string>

	/** The signing key in PEM format. */
	pem: Output<string>
}>

type CloudflareDnsZoneTransfersIncomingProps = {

	/** How often should a secondary zone auto refresh regardless of DNS NOTIFY.
Not applicable for primary zones. */
	auto_refresh_seconds: Input<number>

	/** Zone name. */
	name: Input<string>

	/** A list of peer tags. */
	peers: Input<Array<Input<string>>>
	zone_id: Input<string>
}

type CloudflareDnsZoneTransfersIncoming = Readonly<{

	/** How often should a secondary zone auto refresh regardless of DNS NOTIFY.
Not applicable for primary zones. */
	auto_refresh_seconds: Output<number>

	/** The time for a specific event. */
	checked_time: Output<string>

	/** The time for a specific event. */
	created_time: Output<string>
	id: Output<string>

	/** The time for a specific event. */
	modified_time: Output<string>

	/** Zone name. */
	name: Output<string>

	/** A list of peer tags. */
	peers: ReadonlyArray<string>

	/** The serial number of the SOA for the given zone. */
	soa_serial: Output<number>
	zone_id: Output<string>
}>

type CloudflareWorkersCustomDomainProps = {

	/** Identifer of the account. */
	account_id: Input<string>

	/** Worker environment associated with the zone and hostname. */
	environment: Input<string>

	/** Hostname of the Worker Domain. */
	hostname: Input<string>

	/** Worker service associated with the zone and hostname. */
	service: Input<string>

	/** Identifier of the zone. */
	zone_id: Input<string>
}

type CloudflareWorkersCustomDomain = Readonly<{

	/** Identifer of the account. */
	account_id: Output<string>

	/** Worker environment associated with the zone and hostname. */
	environment: Output<string>

	/** Hostname of the Worker Domain. */
	hostname: Output<string>

	/** Identifer of the Worker Domain. */
	id: Output<string>

	/** Worker service associated with the zone and hostname. */
	service: Output<string>

	/** Identifier of the zone. */
	zone_id: Output<string>

	/** Name of the zone. */
	zone_name: Output<string>
}>

type CloudflareTurnstileWidgetProps = {

	/** Identifier */
	account_id: Input<string>

	/** If bot_fight_mode is set to `true`, Cloudflare issues computationally
expensive challenges in response to malicious bots (ENT only). */
	bot_fight_mode?: Input<boolean | undefined>

	/** If Turnstile is embedded on a Cloudflare site and the widget should grant challenge clearance,
this setting can determine the clearance level to be set
Available values: "no_clearance", "jschallenge", "managed", "interactive". */
	clearance_level?: Input<string | undefined>
	domains: Input<Array<Input<string>>>

	/** Return the Ephemeral ID in /siteverify (ENT only). */
	ephemeral_id?: Input<boolean | undefined>

	/** Widget Mode
Available values: "non-interactive", "invisible", "managed". */
	mode: Input<string>

	/** Human readable widget name. Not unique. Cloudflare suggests that you
set this to a meaningful string to make it easier to identify your
widget, and where it is used. */
	name: Input<string>

	/** Do not show any Cloudflare branding on the widget (ENT only). */
	offlabel?: Input<boolean | undefined>

	/** Region where this widget can be used.
Available values: "world". */
	region?: Input<string | undefined>
}

type CloudflareTurnstileWidget = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** If bot_fight_mode is set to `true`, Cloudflare issues computationally
expensive challenges in response to malicious bots (ENT only). */
	bot_fight_mode: Output<boolean>

	/** If Turnstile is embedded on a Cloudflare site and the widget should grant challenge clearance,
this setting can determine the clearance level to be set
Available values: "no_clearance", "jschallenge", "managed", "interactive". */
	clearance_level: Output<string | undefined>

	/** When the widget was created. */
	created_on: Output<string>
	domains: ReadonlyArray<string>

	/** Return the Ephemeral ID in /siteverify (ENT only). */
	ephemeral_id: Output<boolean | undefined>

	/** Widget item identifier tag. */
	id: Output<string>

	/** Widget Mode
Available values: "non-interactive", "invisible", "managed". */
	mode: Output<string>

	/** When the widget was modified. */
	modified_on: Output<string>

	/** Human readable widget name. Not unique. Cloudflare suggests that you
set this to a meaningful string to make it easier to identify your
widget, and where it is used. */
	name: Output<string>

	/** Do not show any Cloudflare branding on the widget (ENT only). */
	offlabel: Output<boolean>

	/** Region where this widget can be used.
Available values: "world". */
	region: Output<string>

	/** Secret key for this widget. */
	secret: Output<string>

	/** Widget item identifier tag. */
	sitekey: Output<string>
}>

type CloudflareStreamWebhookProps = {

	/** The account identifier tag. */
	account_id: Input<string>

	/** The URL where webhooks will be sent. */
	notification_url: Input<string>
}

type CloudflareStreamWebhook = Readonly<{

	/** The account identifier tag. */
	account_id: Output<string>

	/** The URL where webhooks will be sent. */
	notification_url: Output<string>
}>

type CloudflareLoadBalancerMonitorProps = {

	/** Identifier */
	account_id: Input<string>

	/** Do not validate the certificate when monitor use HTTPS. This parameter is currently only valid for HTTP and HTTPS monitors. */
	allow_insecure?: Input<boolean | undefined>

	/** To be marked unhealthy the monitored origin must fail this healthcheck N consecutive times. */
	consecutive_down?: Input<number | undefined>

	/** To be marked healthy the monitored origin must pass this healthcheck N consecutive times. */
	consecutive_up?: Input<number | undefined>

	/** Object description. */
	description?: Input<string | undefined>

	/** A case-insensitive sub-string to look for in the response body. If this string is not found, the origin will be marked as unhealthy. This parameter is only valid for HTTP and HTTPS monitors. */
	expected_body?: Input<string | undefined>

	/** The expected HTTP response code or code range of the health check. This parameter is only valid for HTTP and HTTPS monitors. */
	expected_codes?: Input<string | undefined>

	/** Follow redirects if returned by the origin. This parameter is only valid for HTTP and HTTPS monitors. */
	follow_redirects?: Input<boolean | undefined>

	/** The HTTP request headers to send in the health check. It is recommended you set a Host header by default. The User-Agent header cannot be overridden. This parameter is only valid for HTTP and HTTPS monitors. */
	header?: Input<Record<string, Input<Array<Input<string>>>> | undefined>

	/** The interval between each health check. Shorter intervals may improve failover time, but will increase load on the origins as we check from multiple locations. */
	interval?: Input<number | undefined>

	/** The method to use for the health check. This defaults to 'GET' for HTTP/HTTPS based checks and 'connection_established' for TCP based health checks. */
	method?: Input<string | undefined>

	/** The endpoint path you want to conduct a health check against. This parameter is only valid for HTTP and HTTPS monitors. */
	path?: Input<string | undefined>

	/** The port number to connect to for the health check. Required for TCP, UDP, and SMTP checks. HTTP and HTTPS checks should only define the port when using a non-standard port (HTTP: default 80, HTTPS: default 443). */
	port?: Input<number | undefined>

	/** Assign this monitor to emulate the specified zone while probing. This parameter is only valid for HTTP and HTTPS monitors. */
	probe_zone?: Input<string | undefined>

	/** The number of retries to attempt in case of a timeout before marking the origin as unhealthy. Retries are attempted immediately. */
	retries?: Input<number | undefined>

	/** The timeout (in seconds) before marking the health check as failed. */
	timeout?: Input<number | undefined>

	/** The protocol to use for the health check. Currently supported protocols are 'HTTP','HTTPS', 'TCP', 'ICMP-PING', 'UDP-ICMP', and 'SMTP'.
Available values: "http", "https", "tcp", "udp_icmp", "icmp_ping", "smtp". */
	type?: Input<string | undefined>
}

type CloudflareLoadBalancerMonitor = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Do not validate the certificate when monitor use HTTPS. This parameter is currently only valid for HTTP and HTTPS monitors. */
	allow_insecure: Output<boolean>

	/** To be marked unhealthy the monitored origin must fail this healthcheck N consecutive times. */
	consecutive_down: Output<number>

	/** To be marked healthy the monitored origin must pass this healthcheck N consecutive times. */
	consecutive_up: Output<number>
	created_on: Output<string>

	/** Object description. */
	description: Output<string | undefined>

	/** A case-insensitive sub-string to look for in the response body. If this string is not found, the origin will be marked as unhealthy. This parameter is only valid for HTTP and HTTPS monitors. */
	expected_body: Output<string | undefined>

	/** The expected HTTP response code or code range of the health check. This parameter is only valid for HTTP and HTTPS monitors. */
	expected_codes: Output<string | undefined>

	/** Follow redirects if returned by the origin. This parameter is only valid for HTTP and HTTPS monitors. */
	follow_redirects: Output<boolean>

	/** The HTTP request headers to send in the health check. It is recommended you set a Host header by default. The User-Agent header cannot be overridden. This parameter is only valid for HTTP and HTTPS monitors. */
	header: Readonly<Record<string, ReadonlyArray<string>>>
	id: Output<string>

	/** The interval between each health check. Shorter intervals may improve failover time, but will increase load on the origins as we check from multiple locations. */
	interval: Output<number>

	/** The method to use for the health check. This defaults to 'GET' for HTTP/HTTPS based checks and 'connection_established' for TCP based health checks. */
	method: Output<string>
	modified_on: Output<string>

	/** The endpoint path you want to conduct a health check against. This parameter is only valid for HTTP and HTTPS monitors. */
	path: Output<string>

	/** The port number to connect to for the health check. Required for TCP, UDP, and SMTP checks. HTTP and HTTPS checks should only define the port when using a non-standard port (HTTP: default 80, HTTPS: default 443). */
	port: Output<number>

	/** Assign this monitor to emulate the specified zone while probing. This parameter is only valid for HTTP and HTTPS monitors. */
	probe_zone: Output<string | undefined>

	/** The number of retries to attempt in case of a timeout before marking the origin as unhealthy. Retries are attempted immediately. */
	retries: Output<number>

	/** The timeout (in seconds) before marking the health check as failed. */
	timeout: Output<number>

	/** The protocol to use for the health check. Currently supported protocols are 'HTTP','HTTPS', 'TCP', 'ICMP-PING', 'UDP-ICMP', and 'SMTP'.
Available values: "http", "https", "tcp", "udp_icmp", "icmp_ping", "smtp". */
	type: Output<string>
}>

type CloudflareMagicWanGreTunnelProps = {

	/** Identifier */
	account_id: Input<string>

	/** The IP address assigned to the Cloudflare side of the GRE tunnel. */
	cloudflare_gre_endpoint?: Input<string | undefined>

	/** The IP address assigned to the customer side of the GRE tunnel. */
	customer_gre_endpoint?: Input<string | undefined>

	/** An optional description of the GRE tunnel. */
	description?: Input<string | undefined>

	/** Identifier */
	gre_tunnel_id?: Input<string | undefined>
	health_check?: Input<{

		/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
		direction?: Input<string | undefined>

		/** Determines whether to run healthchecks for a tunnel. */
		enabled?: Input<boolean | undefined>

		/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
		rate?: Input<string | undefined>
		target?: Input<{

			/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
			saved?: Input<string | undefined>
		} | undefined>

		/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
		type?: Input<string | undefined>
	} | undefined>

	/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
	interface_address?: Input<string | undefined>

	/** Maximum Transmission Unit (MTU) in bytes for the GRE tunnel. The minimum value is 576. */
	mtu?: Input<number | undefined>

	/** The name of the tunnel. The name cannot contain spaces or special characters, must be 15 characters or less, and cannot share a name with another GRE tunnel. */
	name?: Input<string | undefined>

	/** Time To Live (TTL) in number of hops of the GRE tunnel. */
	ttl?: Input<number | undefined>
}

type CloudflareMagicWanGreTunnel = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The IP address assigned to the Cloudflare side of the GRE tunnel. */
	cloudflare_gre_endpoint: Output<string | undefined>

	/** The IP address assigned to the customer side of the GRE tunnel. */
	customer_gre_endpoint: Output<string | undefined>

	/** An optional description of the GRE tunnel. */
	description: Output<string | undefined>
	gre_tunnel: Output<Readonly<{

		/** The IP address assigned to the Cloudflare side of the GRE tunnel. */
		cloudflare_gre_endpoint: string

		/** The date and time the tunnel was created. */
		created_on: string

		/** The IP address assigned to the customer side of the GRE tunnel. */
		customer_gre_endpoint: string

		/** An optional description of the GRE tunnel. */
		description: string
		health_check: Readonly<{

			/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
			direction: string

			/** Determines whether to run healthchecks for a tunnel. */
			enabled: boolean

			/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
			rate: string
			target: Readonly<{

				/** The effective health check target. If 'saved' is empty, then this field will be populated with the calculated default value on GET requests. Ignored in POST, PUT, and PATCH requests. */
				effective: string

				/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
				saved: string
			}>

			/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
			type: string
		}>

		/** Tunnel identifier tag. */
		id: string

		/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
		interface_address: string

		/** The date and time the tunnel was last modified. */
		modified_on: string

		/** Maximum Transmission Unit (MTU) in bytes for the GRE tunnel. The minimum value is 576. */
		mtu: number

		/** The name of the tunnel. The name cannot contain spaces or special characters, must be 15 characters or less, and cannot share a name with another GRE tunnel. */
		name: string

		/** Time To Live (TTL) in number of hops of the GRE tunnel. */
		ttl: number
	}>>

	/** Identifier */
	gre_tunnel_id: Output<string | undefined>
	gre_tunnels: Output<Readonly<{

		/** The IP address assigned to the Cloudflare side of the GRE tunnel. */
		cloudflare_gre_endpoint: string

		/** The date and time the tunnel was created. */
		created_on: string

		/** The IP address assigned to the customer side of the GRE tunnel. */
		customer_gre_endpoint: string

		/** An optional description of the GRE tunnel. */
		description: string
		health_check: Readonly<{

			/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
			direction: string

			/** Determines whether to run healthchecks for a tunnel. */
			enabled: boolean

			/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
			rate: string
			target: Readonly<{

				/** The effective health check target. If 'saved' is empty, then this field will be populated with the calculated default value on GET requests. Ignored in POST, PUT, and PATCH requests. */
				effective: string

				/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
				saved: string
			}>

			/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
			type: string
		}>

		/** Tunnel identifier tag. */
		id: string

		/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
		interface_address: string

		/** The date and time the tunnel was last modified. */
		modified_on: string

		/** Maximum Transmission Unit (MTU) in bytes for the GRE tunnel. The minimum value is 576. */
		mtu: number

		/** The name of the tunnel. The name cannot contain spaces or special characters, must be 15 characters or less, and cannot share a name with another GRE tunnel. */
		name: string

		/** Time To Live (TTL) in number of hops of the GRE tunnel. */
		ttl: number
	}>>
	health_check: Output<Readonly<{

		/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
		direction: string

		/** Determines whether to run healthchecks for a tunnel. */
		enabled: boolean

		/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
		rate: string
		target: Readonly<{

			/** The effective health check target. If 'saved' is empty, then this field will be populated with the calculated default value on GET requests. Ignored in POST, PUT, and PATCH requests. */
			effective: string

			/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
			saved?: string
		}>

		/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
		type: string
	}>>

	/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
	interface_address: Output<string | undefined>
	modified: Output<boolean>
	modified_gre_tunnel: Output<Readonly<{

		/** The IP address assigned to the Cloudflare side of the GRE tunnel. */
		cloudflare_gre_endpoint: string

		/** The date and time the tunnel was created. */
		created_on: string

		/** The IP address assigned to the customer side of the GRE tunnel. */
		customer_gre_endpoint: string

		/** An optional description of the GRE tunnel. */
		description: string
		health_check: Readonly<{

			/** The direction of the flow of the healthcheck. Either unidirectional, where the probe comes to you via the tunnel and the result comes back to Cloudflare via the open Internet, or bidirectional where both the probe and result come and go via the tunnel.
Available values: "unidirectional", "bidirectional". */
			direction: string

			/** Determines whether to run healthchecks for a tunnel. */
			enabled: boolean

			/** How frequent the health check is run. The default value is `mid`.
Available values: "low", "mid", "high". */
			rate: string
			target: Readonly<{

				/** The effective health check target. If 'saved' is empty, then this field will be populated with the calculated default value on GET requests. Ignored in POST, PUT, and PATCH requests. */
				effective: string

				/** The saved health check target. Setting the value to the empty string indicates that the calculated default value will be used. */
				saved: string
			}>

			/** The type of healthcheck to run, reply or request. The default value is `reply`.
Available values: "reply", "request". */
			type: string
		}>

		/** Tunnel identifier tag. */
		id: string

		/** A 31-bit prefix (/31 in CIDR notation) supporting two hosts, one for each side of the tunnel. Select the subnet from the following private IP space: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255, 192.168.0.0–192.168.255.255. */
		interface_address: string

		/** The date and time the tunnel was last modified. */
		modified_on: string

		/** Maximum Transmission Unit (MTU) in bytes for the GRE tunnel. The minimum value is 576. */
		mtu: number

		/** The name of the tunnel. The name cannot contain spaces or special characters, must be 15 characters or less, and cannot share a name with another GRE tunnel. */
		name: string

		/** Time To Live (TTL) in number of hops of the GRE tunnel. */
		ttl: number
	}>>

	/** Maximum Transmission Unit (MTU) in bytes for the GRE tunnel. The minimum value is 576. */
	mtu: Output<number>

	/** The name of the tunnel. The name cannot contain spaces or special characters, must be 15 characters or less, and cannot share a name with another GRE tunnel. */
	name: Output<string | undefined>

	/** Time To Live (TTL) in number of hops of the GRE tunnel. */
	ttl: Output<number>
}>

type CloudflareApiTokenProps = {
	condition?: Input<{
		request_ip?: Input<{

			/** List of IPv4/IPv6 CIDR addresses. */
			in?: Input<Array<Input<string>> | undefined>

			/** List of IPv4/IPv6 CIDR addresses. */
			not_in?: Input<Array<Input<string>> | undefined>
		} | undefined>
	} | undefined>

	/** The expiration time on or after which the JWT MUST NOT be accepted for processing. */
	expires_on?: Input<string | undefined>

	/** Token name. */
	name: Input<string>

	/** The time before which the token MUST NOT be accepted for processing. */
	not_before?: Input<string | undefined>
	policies: Input<{

		/** Allow or deny operations against the resources.
Available values: "allow", "deny". */
		effect: Input<string>
		permission_groups: Input<{

			/** Identifier of the group. */
			id: Input<string>
			meta?: Input<{
				key?: Input<string | undefined>
				value?: Input<string | undefined>
			} | undefined>
		}>

		/** A list of resource names that the policy applies to. */
		resources: Input<Record<string, Input<string>>>
	}>

	/** Status of the token.
Available values: "active", "disabled", "expired". */
	status?: Input<string | undefined>
}

type CloudflareApiToken = Readonly<{
	condition: Output<Readonly<{
		request_ip: Readonly<{

			/** List of IPv4/IPv6 CIDR addresses. */
			in?: ReadonlyArray<string>

			/** List of IPv4/IPv6 CIDR addresses. */
			not_in?: ReadonlyArray<string>
		}>
	}>>

	/** The expiration time on or after which the JWT MUST NOT be accepted for processing. */
	expires_on: Output<string | undefined>

	/** Token identifier tag. */
	id: Output<string>

	/** The time on which the token was created. */
	issued_on: Output<string>

	/** Last time the token was used. */
	last_used_on: Output<string>

	/** Last time the token was modified. */
	modified_on: Output<string>

	/** Token name. */
	name: Output<string>

	/** The time before which the token MUST NOT be accepted for processing. */
	not_before: Output<string | undefined>
	policies: Output<Readonly<{

		/** Allow or deny operations against the resources.
Available values: "allow", "deny". */
		effect: string

		/** Policy identifier. */
		id: string
		permission_groups: Readonly<{

			/** Identifier of the group. */
			id: string
			meta?: Readonly<{
				key?: string
				value?: string
			}>

			/** Name of the group. */
			name: string
		}>

		/** A list of resource names that the policy applies to. */
		resources: Readonly<Record<string, string>>
	}>>

	/** Status of the token.
Available values: "active", "disabled", "expired". */
	status: Output<string | undefined>

	/** The token value. */
	value: Output<string>
}>

type CloudflareHealthcheckProps = {

	/** The hostname or IP address of the origin server to run health checks on. */
	address: Input<string>

	/** A list of regions from which to run health checks. Null means Cloudflare will pick a default region. */
	check_regions?: Input<Array<Input<string>> | undefined>

	/** The number of consecutive fails required from a health check before changing the health to unhealthy. */
	consecutive_fails?: Input<number | undefined>

	/** The number of consecutive successes required from a health check before changing the health to healthy. */
	consecutive_successes?: Input<number | undefined>

	/** A human-readable description of the health check. */
	description?: Input<string | undefined>
	http_config?: Input<{

		/** Do not validate the certificate when the health check uses HTTPS. */
		allow_insecure?: Input<boolean | undefined>

		/** A case-insensitive sub-string to look for in the response body. If this string is not found, the origin will be marked as unhealthy. */
		expected_body?: Input<string | undefined>

		/** The expected HTTP response codes (e.g. "200") or code ranges (e.g. "2xx" for all codes starting with 2) of the health check. */
		expected_codes?: Input<Array<Input<string>> | undefined>

		/** Follow redirects if the origin returns a 3xx status code. */
		follow_redirects?: Input<boolean | undefined>

		/** The HTTP request headers to send in the health check. It is recommended you set a Host header by default. The User-Agent header cannot be overridden. */
		header?: Input<Record<string, Input<Array<Input<string>>>> | undefined>

		/** The HTTP method to use for the health check.
Available values: "GET", "HEAD". */
		method?: Input<string | undefined>

		/** The endpoint path to health check against. */
		path?: Input<string | undefined>

		/** Port number to connect to for the health check. Defaults to 80 if type is HTTP or 443 if type is HTTPS. */
		port?: Input<number | undefined>
	} | undefined>

	/** The interval between each health check. Shorter intervals may give quicker notifications if the origin status changes, but will increase load on the origin as we check from multiple locations. */
	interval?: Input<number | undefined>

	/** A short name to identify the health check. Only alphanumeric characters, hyphens and underscores are allowed. */
	name: Input<string>

	/** The number of retries to attempt in case of a timeout before marking the origin as unhealthy. Retries are attempted immediately. */
	retries?: Input<number | undefined>

	/** If suspended, no health checks are sent to the origin. */
	suspended?: Input<boolean | undefined>
	tcp_config?: Input<{

		/** The TCP connection method to use for the health check.
Available values: "connection_established". */
		method?: Input<string | undefined>

		/** Port number to connect to for the health check. Defaults to 80. */
		port?: Input<number | undefined>
	} | undefined>

	/** The timeout (in seconds) before marking the health check as failed. */
	timeout?: Input<number | undefined>

	/** The protocol to use for the health check. Currently supported protocols are 'HTTP', 'HTTPS' and 'TCP'. */
	type?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareHealthcheck = Readonly<{

	/** The hostname or IP address of the origin server to run health checks on. */
	address: Output<string>

	/** A list of regions from which to run health checks. Null means Cloudflare will pick a default region. */
	check_regions: ReadonlyArray<string>

	/** The number of consecutive fails required from a health check before changing the health to unhealthy. */
	consecutive_fails: Output<number>

	/** The number of consecutive successes required from a health check before changing the health to healthy. */
	consecutive_successes: Output<number>
	created_on: Output<string>

	/** A human-readable description of the health check. */
	description: Output<string | undefined>

	/** The current failure reason if status is unhealthy. */
	failure_reason: Output<string>
	http_config: Output<Readonly<{

		/** Do not validate the certificate when the health check uses HTTPS. */
		allow_insecure: boolean

		/** A case-insensitive sub-string to look for in the response body. If this string is not found, the origin will be marked as unhealthy. */
		expected_body: string

		/** The expected HTTP response codes (e.g. "200") or code ranges (e.g. "2xx" for all codes starting with 2) of the health check. */
		expected_codes: ReadonlyArray<string>

		/** Follow redirects if the origin returns a 3xx status code. */
		follow_redirects: boolean

		/** The HTTP request headers to send in the health check. It is recommended you set a Host header by default. The User-Agent header cannot be overridden. */
		header: Readonly<Record<string, ReadonlyArray<string>>>

		/** The HTTP method to use for the health check.
Available values: "GET", "HEAD". */
		method: string

		/** The endpoint path to health check against. */
		path: string

		/** Port number to connect to for the health check. Defaults to 80 if type is HTTP or 443 if type is HTTPS. */
		port: number
	}>>

	/** Identifier */
	id: Output<string>

	/** The interval between each health check. Shorter intervals may give quicker notifications if the origin status changes, but will increase load on the origin as we check from multiple locations. */
	interval: Output<number>
	modified_on: Output<string>

	/** A short name to identify the health check. Only alphanumeric characters, hyphens and underscores are allowed. */
	name: Output<string>

	/** The number of retries to attempt in case of a timeout before marking the origin as unhealthy. Retries are attempted immediately. */
	retries: Output<number>

	/** The current status of the origin server according to the health check.
Available values: "unknown", "healthy", "unhealthy", "suspended". */
	status: Output<string>

	/** If suspended, no health checks are sent to the origin. */
	suspended: Output<boolean>
	tcp_config: Output<Readonly<{

		/** The TCP connection method to use for the health check.
Available values: "connection_established". */
		method: string

		/** Port number to connect to for the health check. Defaults to 80. */
		port: number
	}>>

	/** The timeout (in seconds) before marking the health check as failed. */
	timeout: Output<number>

	/** The protocol to use for the health check. Currently supported protocols are 'HTTP', 'HTTPS' and 'TCP'. */
	type: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareApiShieldProps = {
	auth_id_characteristics: Input<{

		/** The name of the characteristic field, i.e., the header or cookie name. */
		name: Input<string>

		/** The type of characteristic.
Available values: "header", "cookie". */
		type: Input<string>
	}>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareApiShield = Readonly<{
	auth_id_characteristics: Output<Readonly<{

		/** The name of the characteristic field, i.e., the header or cookie name. */
		name: string

		/** The type of characteristic.
Available values: "header", "cookie". */
		type: string
	}>>
	errors: Output<Readonly<{
		code: number
		message: string
	}>>

	/** Identifier */
	id: Output<string>
	messages: Output<Readonly<{
		code: number
		message: string
	}>>

	/** Whether the API call was successful */
	success: Output<boolean>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareWebAnalyticsRuleProps = {

	/** Identifier */
	account_id: Input<string>
	host?: Input<string | undefined>

	/** Whether the rule includes or excludes traffic from being measured. */
	inclusive?: Input<boolean | undefined>

	/** Whether the rule is paused or not. */
	is_paused?: Input<boolean | undefined>
	paths?: Input<Array<Input<string>> | undefined>

	/** The Web Analytics ruleset identifier. */
	ruleset_id: Input<string>
}

type CloudflareWebAnalyticsRule = Readonly<{

	/** Identifier */
	account_id: Output<string>
	created: Output<string>
	host: Output<string | undefined>

	/** The Web Analytics rule identifier. */
	id: Output<string>

	/** Whether the rule includes or excludes traffic from being measured. */
	inclusive: Output<boolean | undefined>

	/** Whether the rule is paused or not. */
	is_paused: Output<boolean | undefined>
	paths: ReadonlyArray<string>
	priority: Output<number>

	/** The Web Analytics ruleset identifier. */
	ruleset_id: Output<string>
}>

type CloudflareWorkersRouteProps = {
	pattern: Input<string>

	/** Identifier */
	route_id?: Input<string | undefined>

	/** Name of the script, used in URLs and route configuration. */
	script?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareWorkersRoute = Readonly<{
	errors: Output<Readonly<{
		code: number
		message: string
	}>>

	/** Identifier */
	id: Output<string>
	messages: Output<Readonly<{
		code: number
		message: string
	}>>
	pattern: Output<string>

	/** Identifier */
	route_id: Output<string | undefined>

	/** Name of the script, used in URLs and route configuration. */
	script: Output<string | undefined>

	/** Whether the API call was successful */
	success: Output<boolean>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareImageVariantProps = {

	/** Account identifier tag. */
	account_id: Input<string>
	id: Input<string>

	/** Indicates whether the variant can access an image without a signature, regardless of image access control. */
	never_require_signed_urls?: Input<boolean | undefined>
	options: Input<{

		/** The fit property describes how the width and height dimensions should be interpreted.
Available values: "scale-down", "contain", "cover", "crop", "pad". */
		fit: Input<string>

		/** Maximum height in image pixels. */
		height: Input<number>

		/** What EXIF data should be preserved in the output image.
Available values: "keep", "copyright", "none". */
		metadata: Input<string>

		/** Maximum width in image pixels. */
		width: Input<number>
	}>
}

type CloudflareImageVariant = Readonly<{

	/** Account identifier tag. */
	account_id: Output<string>
	id: Output<string>

	/** Indicates whether the variant can access an image without a signature, regardless of image access control. */
	never_require_signed_urls: Output<boolean>
	options: Output<Readonly<{

		/** The fit property describes how the width and height dimensions should be interpreted.
Available values: "scale-down", "contain", "cover", "crop", "pad". */
		fit: string

		/** Maximum height in image pixels. */
		height: number

		/** What EXIF data should be preserved in the output image.
Available values: "keep", "copyright", "none". */
		metadata: string

		/** Maximum width in image pixels. */
		width: number
	}>>
	variant: Output<Readonly<{
		id: string

		/** Indicates whether the variant can access an image without a signature, regardless of image access control. */
		never_require_signed_urls: boolean
		options: Readonly<{

			/** The fit property describes how the width and height dimensions should be interpreted.
Available values: "scale-down", "contain", "cover", "crop", "pad". */
			fit: string

			/** Maximum height in image pixels. */
			height: number

			/** What EXIF data should be preserved in the output image.
Available values: "keep", "copyright", "none". */
			metadata: string

			/** Maximum width in image pixels. */
			width: number
		}>
	}>>
}>

type CloudflareLogpushOwnershipChallengeProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** Uniquely identifies a resource (such as an s3 bucket) where data will be pushed. Additional configuration parameters supported by the destination may be included. */
	destination_conf: Input<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareLogpushOwnershipChallenge = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** Uniquely identifies a resource (such as an s3 bucket) where data will be pushed. Additional configuration parameters supported by the destination may be included. */
	destination_conf: Output<string>
	filename: Output<string>
	message: Output<string>
	valid: Output<boolean>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareAuthenticatedOriginPullsSettingsProps = {

	/** Indicates whether zone-level authenticated origin pulls is enabled. */
	enabled: Input<boolean>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareAuthenticatedOriginPullsSettings = Readonly<{

	/** Indicates whether zone-level authenticated origin pulls is enabled. */
	enabled: Output<boolean>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareCallsSfuAppProps = {

	/** The account identifier tag. */
	account_id: Input<string>

	/** A Cloudflare-generated unique identifier for a item. */
	app_id?: Input<string | undefined>

	/** A short description of Calls app, not shown to end users. */
	name?: Input<string | undefined>
}

type CloudflareCallsSfuApp = Readonly<{

	/** The account identifier tag. */
	account_id: Output<string>

	/** A Cloudflare-generated unique identifier for a item. */
	app_id: Output<string | undefined>

	/** The date and time the item was created. */
	created: Output<string>

	/** The date and time the item was last modified. */
	modified: Output<string>

	/** A short description of Calls app, not shown to end users. */
	name: Output<string>

	/** Bearer token */
	secret: Output<string>

	/** A Cloudflare-generated unique identifier for a item. */
	uid: Output<string>
}>

type CloudflarePageShieldPolicyProps = {

	/** The action to take if the expression matches
Available values: "allow", "log". */
	action: Input<string>

	/** A description for the policy */
	description: Input<string>

	/** Whether the policy is enabled */
	enabled: Input<boolean>

	/** The expression which must match for the policy to be applied, using the Cloudflare Firewall rule expression syntax */
	expression: Input<string>

	/** The policy which will be applied */
	value: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflarePageShieldPolicy = Readonly<{

	/** The action to take if the expression matches
Available values: "allow", "log". */
	action: Output<string>

	/** A description for the policy */
	description: Output<string>

	/** Whether the policy is enabled */
	enabled: Output<boolean>

	/** The expression which must match for the policy to be applied, using the Cloudflare Firewall rule expression syntax */
	expression: Output<string>

	/** Identifier */
	id: Output<string>

	/** The policy which will be applied */
	value: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareWaitingRoomEventProps = {

	/** If set, the event will override the waiting room's `custom_page_html` property while it is active. If null, the event will inherit it. */
	custom_page_html?: Input<string | undefined>

	/** A note that you can use to add more details about the event. */
	description?: Input<string | undefined>

	/** If set, the event will override the waiting room's `disable_session_renewal` property while it is active. If null, the event will inherit it. */
	disable_session_renewal?: Input<boolean | undefined>

	/** An ISO 8601 timestamp that marks the end of the event. */
	event_end_time: Input<string>

	/** An ISO 8601 timestamp that marks the start of the event. At this time, queued users will be processed with the event's configuration. The start time must be at least one minute before `event_end_time`. */
	event_start_time: Input<string>

	/** A unique name to identify the event. Only alphanumeric characters, hyphens and underscores are allowed. */
	name: Input<string>

	/** If set, the event will override the waiting room's `new_users_per_minute` property while it is active. If null, the event will inherit it. This can only be set if the event's `total_active_users` property is also set. */
	new_users_per_minute?: Input<number | undefined>

	/** An ISO 8601 timestamp that marks when to begin queueing all users before the event starts. The prequeue must start at least five minutes before `event_start_time`. */
	prequeue_start_time?: Input<string | undefined>

	/** If set, the event will override the waiting room's `queueing_method` property while it is active. If null, the event will inherit it. */
	queueing_method?: Input<string | undefined>

	/** If set, the event will override the waiting room's `session_duration` property while it is active. If null, the event will inherit it. */
	session_duration?: Input<number | undefined>

	/** If enabled, users in the prequeue will be shuffled randomly at the `event_start_time`. Requires that `prequeue_start_time` is not null. This is useful for situations when many users will join the event prequeue at the same time and you want to shuffle them to ensure fairness. Naturally, it makes the most sense to enable this feature when the `queueing_method` during the event respects ordering such as **fifo**, or else the shuffling may be unnecessary. */
	shuffle_at_event_start?: Input<boolean | undefined>

	/** Suspends or allows an event. If set to `true`, the event is ignored and traffic will be handled based on the waiting room configuration. */
	suspended?: Input<boolean | undefined>

	/** If set, the event will override the waiting room's `total_active_users` property while it is active. If null, the event will inherit it. This can only be set if the event's `new_users_per_minute` property is also set. */
	total_active_users?: Input<number | undefined>
	waiting_room_id: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareWaitingRoomEvent = Readonly<{
	created_on: Output<string>

	/** If set, the event will override the waiting room's `custom_page_html` property while it is active. If null, the event will inherit it. */
	custom_page_html: Output<string | undefined>

	/** A note that you can use to add more details about the event. */
	description: Output<string>

	/** If set, the event will override the waiting room's `disable_session_renewal` property while it is active. If null, the event will inherit it. */
	disable_session_renewal: Output<boolean | undefined>

	/** An ISO 8601 timestamp that marks the end of the event. */
	event_end_time: Output<string>

	/** An ISO 8601 timestamp that marks the start of the event. At this time, queued users will be processed with the event's configuration. The start time must be at least one minute before `event_end_time`. */
	event_start_time: Output<string>
	id: Output<string>
	modified_on: Output<string>

	/** A unique name to identify the event. Only alphanumeric characters, hyphens and underscores are allowed. */
	name: Output<string>

	/** If set, the event will override the waiting room's `new_users_per_minute` property while it is active. If null, the event will inherit it. This can only be set if the event's `total_active_users` property is also set. */
	new_users_per_minute: Output<number | undefined>

	/** An ISO 8601 timestamp that marks when to begin queueing all users before the event starts. The prequeue must start at least five minutes before `event_start_time`. */
	prequeue_start_time: Output<string | undefined>

	/** If set, the event will override the waiting room's `queueing_method` property while it is active. If null, the event will inherit it. */
	queueing_method: Output<string | undefined>

	/** If set, the event will override the waiting room's `session_duration` property while it is active. If null, the event will inherit it. */
	session_duration: Output<number | undefined>

	/** If enabled, users in the prequeue will be shuffled randomly at the `event_start_time`. Requires that `prequeue_start_time` is not null. This is useful for situations when many users will join the event prequeue at the same time and you want to shuffle them to ensure fairness. Naturally, it makes the most sense to enable this feature when the `queueing_method` during the event respects ordering such as **fifo**, or else the shuffling may be unnecessary. */
	shuffle_at_event_start: Output<boolean>

	/** Suspends or allows an event. If set to `true`, the event is ignored and traffic will be handled based on the waiting room configuration. */
	suspended: Output<boolean>

	/** If set, the event will override the waiting room's `total_active_users` property while it is active. If null, the event will inherit it. This can only be set if the event's `new_users_per_minute` property is also set. */
	total_active_users: Output<number | undefined>
	waiting_room_id: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustTunnelCloudflaredRouteProps = {

	/** Cloudflare account ID */
	account_id: Input<string>

	/** Optional remark describing the route. */
	comment?: Input<string | undefined>

	/** The private IPv4 or IPv6 range connected by the route, in CIDR notation. */
	network: Input<string>

	/** UUID of the tunnel. */
	tunnel_id: Input<string>

	/** UUID of the virtual network. */
	virtual_network_id?: Input<string | undefined>
}

type CloudflareZeroTrustTunnelCloudflaredRoute = Readonly<{

	/** Cloudflare account ID */
	account_id: Output<string>

	/** Optional remark describing the route. */
	comment: Output<string | undefined>

	/** Timestamp of when the resource was created. */
	created_at: Output<string>

	/** Timestamp of when the resource was deleted. If `null`, the resource has not been deleted. */
	deleted_at: Output<string>

	/** UUID of the route. */
	id: Output<string>

	/** The private IPv4 or IPv6 range connected by the route, in CIDR notation. */
	network: Output<string>

	/** UUID of the tunnel. */
	tunnel_id: Output<string>

	/** UUID of the virtual network. */
	virtual_network_id: Output<string | undefined>
}>

type CloudflareZeroTrustAccessGroupProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>
	exclude?: Input<{
		any_valid_service_token?: Input<{

		} | undefined>
		auth_context?: Input<{

			/** The ACID of an Authentication context. */
			ac_id: Input<string>

			/** The ID of an Authentication context. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		auth_method?: Input<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: Input<string>
		} | undefined>
		azure_ad?: Input<{

			/** The ID of an Azure group. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		certificate?: Input<{

		} | undefined>
		common_name?: Input<{

			/** The common name to match. */
			common_name: Input<string>
		} | undefined>
		device_posture?: Input<{

			/** The ID of a device posture integration. */
			integration_uid: Input<string>
		} | undefined>
		email?: Input<{

			/** The email of the user. */
			email: Input<string>
		} | undefined>
		email_domain?: Input<{

			/** The email domain to match. */
			domain: Input<string>
		} | undefined>
		email_list?: Input<{

			/** The ID of a previously created email list. */
			id: Input<string>
		} | undefined>
		everyone?: Input<{

		} | undefined>
		external_evaluation?: Input<{

			/** The API endpoint containing your business logic. */
			evaluate_url: Input<string>

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: Input<string>
		} | undefined>
		geo?: Input<{

			/** The country code that should be matched. */
			country_code: Input<string>
		} | undefined>
		github_organization?: Input<{

			/** The ID of your Github identity provider. */
			identity_provider_id: Input<string>

			/** The name of the organization. */
			name: Input<string>

			/** The name of the team */
			team?: Input<string | undefined>
		} | undefined>
		group?: Input<{

			/** The ID of a previously created Access group. */
			id: Input<string>
		} | undefined>
		gsuite?: Input<{

			/** The email of the Google Workspace group. */
			email: Input<string>

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		ip?: Input<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: Input<string>
		} | undefined>
		ip_list?: Input<{

			/** The ID of a previously created IP list. */
			id: Input<string>
		} | undefined>
		login_method?: Input<{

			/** The ID of an identity provider. */
			id: Input<string>
		} | undefined>
		okta?: Input<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: Input<string>

			/** The name of the Okta group. */
			name: Input<string>
		} | undefined>
		saml?: Input<{

			/** The name of the SAML attribute. */
			attribute_name: Input<string>

			/** The SAML attribute value to look for. */
			attribute_value: Input<string>

			/** The ID of your SAML identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		service_token?: Input<{

			/** The ID of a Service Token. */
			token_id: Input<string>
		} | undefined>
	} | undefined>
	include: Input<{
		any_valid_service_token?: Input<{

		} | undefined>
		auth_context?: Input<{

			/** The ACID of an Authentication context. */
			ac_id: Input<string>

			/** The ID of an Authentication context. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		auth_method?: Input<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: Input<string>
		} | undefined>
		azure_ad?: Input<{

			/** The ID of an Azure group. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		certificate?: Input<{

		} | undefined>
		common_name?: Input<{

			/** The common name to match. */
			common_name: Input<string>
		} | undefined>
		device_posture?: Input<{

			/** The ID of a device posture integration. */
			integration_uid: Input<string>
		} | undefined>
		email?: Input<{

			/** The email of the user. */
			email: Input<string>
		} | undefined>
		email_domain?: Input<{

			/** The email domain to match. */
			domain: Input<string>
		} | undefined>
		email_list?: Input<{

			/** The ID of a previously created email list. */
			id: Input<string>
		} | undefined>
		everyone?: Input<{

		} | undefined>
		external_evaluation?: Input<{

			/** The API endpoint containing your business logic. */
			evaluate_url: Input<string>

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: Input<string>
		} | undefined>
		geo?: Input<{

			/** The country code that should be matched. */
			country_code: Input<string>
		} | undefined>
		github_organization?: Input<{

			/** The ID of your Github identity provider. */
			identity_provider_id: Input<string>

			/** The name of the organization. */
			name: Input<string>

			/** The name of the team */
			team?: Input<string | undefined>
		} | undefined>
		group?: Input<{

			/** The ID of a previously created Access group. */
			id: Input<string>
		} | undefined>
		gsuite?: Input<{

			/** The email of the Google Workspace group. */
			email: Input<string>

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		ip?: Input<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: Input<string>
		} | undefined>
		ip_list?: Input<{

			/** The ID of a previously created IP list. */
			id: Input<string>
		} | undefined>
		login_method?: Input<{

			/** The ID of an identity provider. */
			id: Input<string>
		} | undefined>
		okta?: Input<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: Input<string>

			/** The name of the Okta group. */
			name: Input<string>
		} | undefined>
		saml?: Input<{

			/** The name of the SAML attribute. */
			attribute_name: Input<string>

			/** The SAML attribute value to look for. */
			attribute_value: Input<string>

			/** The ID of your SAML identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		service_token?: Input<{

			/** The ID of a Service Token. */
			token_id: Input<string>
		} | undefined>
	}>

	/** Whether this is the default group */
	is_default?: Input<boolean | undefined>

	/** The name of the Access group. */
	name: Input<string>
	require?: Input<{
		any_valid_service_token?: Input<{

		} | undefined>
		auth_context?: Input<{

			/** The ACID of an Authentication context. */
			ac_id: Input<string>

			/** The ID of an Authentication context. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		auth_method?: Input<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: Input<string>
		} | undefined>
		azure_ad?: Input<{

			/** The ID of an Azure group. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		certificate?: Input<{

		} | undefined>
		common_name?: Input<{

			/** The common name to match. */
			common_name: Input<string>
		} | undefined>
		device_posture?: Input<{

			/** The ID of a device posture integration. */
			integration_uid: Input<string>
		} | undefined>
		email?: Input<{

			/** The email of the user. */
			email: Input<string>
		} | undefined>
		email_domain?: Input<{

			/** The email domain to match. */
			domain: Input<string>
		} | undefined>
		email_list?: Input<{

			/** The ID of a previously created email list. */
			id: Input<string>
		} | undefined>
		everyone?: Input<{

		} | undefined>
		external_evaluation?: Input<{

			/** The API endpoint containing your business logic. */
			evaluate_url: Input<string>

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: Input<string>
		} | undefined>
		geo?: Input<{

			/** The country code that should be matched. */
			country_code: Input<string>
		} | undefined>
		github_organization?: Input<{

			/** The ID of your Github identity provider. */
			identity_provider_id: Input<string>

			/** The name of the organization. */
			name: Input<string>

			/** The name of the team */
			team?: Input<string | undefined>
		} | undefined>
		group?: Input<{

			/** The ID of a previously created Access group. */
			id: Input<string>
		} | undefined>
		gsuite?: Input<{

			/** The email of the Google Workspace group. */
			email: Input<string>

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		ip?: Input<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: Input<string>
		} | undefined>
		ip_list?: Input<{

			/** The ID of a previously created IP list. */
			id: Input<string>
		} | undefined>
		login_method?: Input<{

			/** The ID of an identity provider. */
			id: Input<string>
		} | undefined>
		okta?: Input<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: Input<string>

			/** The name of the Okta group. */
			name: Input<string>
		} | undefined>
		saml?: Input<{

			/** The name of the SAML attribute. */
			attribute_name: Input<string>

			/** The SAML attribute value to look for. */
			attribute_value: Input<string>

			/** The ID of your SAML identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		service_token?: Input<{

			/** The ID of a Service Token. */
			token_id: Input<string>
		} | undefined>
	} | undefined>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareZeroTrustAccessGroup = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>
	created_at: Output<string>
	exclude: Output<Readonly<{
		any_valid_service_token: Readonly<{

		}>
		auth_context: Readonly<{

			/** The ACID of an Authentication context. */
			ac_id: string

			/** The ID of an Authentication context. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		auth_method: Readonly<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: string
		}>
		azure_ad: Readonly<{

			/** The ID of an Azure group. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		certificate: Readonly<{

		}>
		common_name: Readonly<{

			/** The common name to match. */
			common_name: string
		}>
		device_posture: Readonly<{

			/** The ID of a device posture integration. */
			integration_uid: string
		}>
		email: Readonly<{

			/** The email of the user. */
			email: string
		}>
		email_domain: Readonly<{

			/** The email domain to match. */
			domain: string
		}>
		email_list: Readonly<{

			/** The ID of a previously created email list. */
			id: string
		}>
		everyone: Readonly<{

		}>
		external_evaluation: Readonly<{

			/** The API endpoint containing your business logic. */
			evaluate_url: string

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: string
		}>
		geo: Readonly<{

			/** The country code that should be matched. */
			country_code: string
		}>
		github_organization: Readonly<{

			/** The ID of your Github identity provider. */
			identity_provider_id: string

			/** The name of the organization. */
			name: string

			/** The name of the team */
			team?: string
		}>
		group: Readonly<{

			/** The ID of a previously created Access group. */
			id: string
		}>
		gsuite: Readonly<{

			/** The email of the Google Workspace group. */
			email: string

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: string
		}>
		ip: Readonly<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: string
		}>
		ip_list: Readonly<{

			/** The ID of a previously created IP list. */
			id: string
		}>
		login_method: Readonly<{

			/** The ID of an identity provider. */
			id: string
		}>
		okta: Readonly<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: string

			/** The name of the Okta group. */
			name: string
		}>
		saml: Readonly<{

			/** The name of the SAML attribute. */
			attribute_name: string

			/** The SAML attribute value to look for. */
			attribute_value: string

			/** The ID of your SAML identity provider. */
			identity_provider_id: string
		}>
		service_token: Readonly<{

			/** The ID of a Service Token. */
			token_id: string
		}>
	}>>

	/** UUID */
	id: Output<string>
	include: Output<Readonly<{
		any_valid_service_token: Readonly<{

		}>
		auth_context: Readonly<{

			/** The ACID of an Authentication context. */
			ac_id: string

			/** The ID of an Authentication context. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		auth_method: Readonly<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: string
		}>
		azure_ad: Readonly<{

			/** The ID of an Azure group. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		certificate: Readonly<{

		}>
		common_name: Readonly<{

			/** The common name to match. */
			common_name: string
		}>
		device_posture: Readonly<{

			/** The ID of a device posture integration. */
			integration_uid: string
		}>
		email: Readonly<{

			/** The email of the user. */
			email: string
		}>
		email_domain: Readonly<{

			/** The email domain to match. */
			domain: string
		}>
		email_list: Readonly<{

			/** The ID of a previously created email list. */
			id: string
		}>
		everyone: Readonly<{

		}>
		external_evaluation: Readonly<{

			/** The API endpoint containing your business logic. */
			evaluate_url: string

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: string
		}>
		geo: Readonly<{

			/** The country code that should be matched. */
			country_code: string
		}>
		github_organization: Readonly<{

			/** The ID of your Github identity provider. */
			identity_provider_id: string

			/** The name of the organization. */
			name: string

			/** The name of the team */
			team?: string
		}>
		group: Readonly<{

			/** The ID of a previously created Access group. */
			id: string
		}>
		gsuite: Readonly<{

			/** The email of the Google Workspace group. */
			email: string

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: string
		}>
		ip: Readonly<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: string
		}>
		ip_list: Readonly<{

			/** The ID of a previously created IP list. */
			id: string
		}>
		login_method: Readonly<{

			/** The ID of an identity provider. */
			id: string
		}>
		okta: Readonly<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: string

			/** The name of the Okta group. */
			name: string
		}>
		saml: Readonly<{

			/** The name of the SAML attribute. */
			attribute_name: string

			/** The SAML attribute value to look for. */
			attribute_value: string

			/** The ID of your SAML identity provider. */
			identity_provider_id: string
		}>
		service_token: Readonly<{

			/** The ID of a Service Token. */
			token_id: string
		}>
	}>>

	/** Whether this is the default group */
	is_default: Output<boolean | undefined>

	/** The name of the Access group. */
	name: Output<string>
	require: Output<Readonly<{
		any_valid_service_token: Readonly<{

		}>
		auth_context: Readonly<{

			/** The ACID of an Authentication context. */
			ac_id: string

			/** The ID of an Authentication context. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		auth_method: Readonly<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: string
		}>
		azure_ad: Readonly<{

			/** The ID of an Azure group. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		certificate: Readonly<{

		}>
		common_name: Readonly<{

			/** The common name to match. */
			common_name: string
		}>
		device_posture: Readonly<{

			/** The ID of a device posture integration. */
			integration_uid: string
		}>
		email: Readonly<{

			/** The email of the user. */
			email: string
		}>
		email_domain: Readonly<{

			/** The email domain to match. */
			domain: string
		}>
		email_list: Readonly<{

			/** The ID of a previously created email list. */
			id: string
		}>
		everyone: Readonly<{

		}>
		external_evaluation: Readonly<{

			/** The API endpoint containing your business logic. */
			evaluate_url: string

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: string
		}>
		geo: Readonly<{

			/** The country code that should be matched. */
			country_code: string
		}>
		github_organization: Readonly<{

			/** The ID of your Github identity provider. */
			identity_provider_id: string

			/** The name of the organization. */
			name: string

			/** The name of the team */
			team?: string
		}>
		group: Readonly<{

			/** The ID of a previously created Access group. */
			id: string
		}>
		gsuite: Readonly<{

			/** The email of the Google Workspace group. */
			email: string

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: string
		}>
		ip: Readonly<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: string
		}>
		ip_list: Readonly<{

			/** The ID of a previously created IP list. */
			id: string
		}>
		login_method: Readonly<{

			/** The ID of an identity provider. */
			id: string
		}>
		okta: Readonly<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: string

			/** The name of the Okta group. */
			name: string
		}>
		saml: Readonly<{

			/** The name of the SAML attribute. */
			attribute_name: string

			/** The SAML attribute value to look for. */
			attribute_value: string

			/** The ID of your SAML identity provider. */
			identity_provider_id: string
		}>
		service_token: Readonly<{

			/** The ID of a Service Token. */
			token_id: string
		}>
	}>>
	updated_at: Output<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareZeroTrustAccessIdentityProviderProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>
	config: Input<{

		/** Your companies TLD */
		apps_domain?: Input<string | undefined>

		/** A list of SAML attribute names that will be added to your signed JWT token and can be used in SAML policy rules. */
		attributes?: Input<Array<Input<string>> | undefined>

		/** The authorization_endpoint URL of your IdP */
		auth_url?: Input<string | undefined>

		/** Your okta authorization server id */
		authorization_server_id?: Input<string | undefined>

		/** Your centrify account url */
		centrify_account?: Input<string | undefined>

		/** Your centrify app id */
		centrify_app_id?: Input<string | undefined>

		/** The jwks_uri endpoint of your IdP to allow the IdP keys to sign the tokens */
		certs_url?: Input<string | undefined>

		/** Custom claims */
		claims?: Input<Array<Input<string>> | undefined>

		/** Your OAuth Client ID */
		client_id?: Input<string | undefined>

		/** Your OAuth Client Secret */
		client_secret?: Input<string | undefined>

		/** Should Cloudflare try to load authentication contexts from your account */
		conditional_access_enabled?: Input<boolean | undefined>

		/** Your Azure directory uuid */
		directory_id?: Input<string | undefined>

		/** The attribute name for email in the SAML response. */
		email_attribute_name?: Input<string | undefined>

		/** The claim name for email in the id_token response. */
		email_claim_name?: Input<string | undefined>
		header_attributes?: Input<{

			/** attribute name from the IDP */
			attribute_name?: Input<string | undefined>

			/** header that will be added on the request to the origin */
			header_name?: Input<string | undefined>
		} | undefined>

		/** X509 certificate to verify the signature in the SAML authentication response */
		idp_public_certs?: Input<Array<Input<string>> | undefined>

		/** IdP Entity ID or Issuer URL */
		issuer_url?: Input<string | undefined>

		/** Your okta account url */
		okta_account?: Input<string | undefined>

		/** Your OneLogin account url */
		onelogin_account?: Input<string | undefined>

		/** Your PingOne environment identifier */
		ping_env_id?: Input<string | undefined>

		/** Enable Proof Key for Code Exchange (PKCE) */
		pkce_enabled?: Input<boolean | undefined>

		/** Indicates the type of user interaction that is required. prompt=login forces the user to enter their credentials on that request, negating single-sign on. prompt=none is the opposite. It ensures that the user isn't presented with any interactive prompt. If the request can't be completed silently by using single-sign on, the Microsoft identity platform returns an interaction_required error. prompt=select_account interrupts single sign-on providing account selection experience listing all the accounts either in session or any remembered account or an option to choose to use a different account altogether.
Available values: "login", "select_account", "none". */
		prompt?: Input<string | undefined>

		/** OAuth scopes */
		scopes?: Input<Array<Input<string>> | undefined>

		/** Sign the SAML authentication request with Access credentials. To verify the signature, use the public key from the Access certs endpoints. */
		sign_request?: Input<boolean | undefined>

		/** URL to send the SAML authentication requests to */
		sso_target_url?: Input<string | undefined>

		/** Should Cloudflare try to load groups from your account */
		support_groups?: Input<boolean | undefined>

		/** The token_endpoint URL of your IdP */
		token_url?: Input<string | undefined>
	}>

	/** The name of the identity provider, shown to users on the login page. */
	name: Input<string>
	scim_config?: Input<{

		/** A flag to enable or disable SCIM for the identity provider. */
		enabled?: Input<boolean | undefined>

		/** Indicates how a SCIM event updates a user identity used for policy evaluation. Use "automatic" to automatically update a user's identity and augment it with fields from the SCIM user resource. Use "reauth" to force re-authentication on group membership updates, user identity update will only occur after successful re-authentication. With "reauth" identities will not contain fields from the SCIM user resource. With "no_action" identities will not be changed by SCIM updates in any way and users will not be prompted to reauthenticate.
Available values: "automatic", "reauth", "no_action". */
		identity_update_behavior?: Input<string | undefined>

		/** A flag to remove a user's seat in Zero Trust when they have been deprovisioned in the Identity Provider.  This cannot be enabled unless user_deprovision is also enabled. */
		seat_deprovision?: Input<boolean | undefined>

		/** A flag to enable revoking a user's session in Access and Gateway when they have been deprovisioned in the Identity Provider. */
		user_deprovision?: Input<boolean | undefined>
	} | undefined>

	/** The type of identity provider. To determine the value for a specific provider, refer to our [developer documentation](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/).
Available values: "onetimepin", "azureAD", "saml", "centrify", "facebook", "github", "google-apps", "google", "linkedin", "oidc", "okta", "onelogin", "pingone", "yandex". */
	type: Input<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareZeroTrustAccessIdentityProvider = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>
	config: Output<Readonly<{

		/** Your companies TLD */
		apps_domain: string

		/** A list of SAML attribute names that will be added to your signed JWT token and can be used in SAML policy rules. */
		attributes: ReadonlyArray<string>

		/** The authorization_endpoint URL of your IdP */
		auth_url: string

		/** Your okta authorization server id */
		authorization_server_id: string

		/** Your centrify account url */
		centrify_account: string

		/** Your centrify app id */
		centrify_app_id: string

		/** The jwks_uri endpoint of your IdP to allow the IdP keys to sign the tokens */
		certs_url: string

		/** Custom claims */
		claims: ReadonlyArray<string>

		/** Your OAuth Client ID */
		client_id: string

		/** Your OAuth Client Secret */
		client_secret: string

		/** Should Cloudflare try to load authentication contexts from your account */
		conditional_access_enabled: boolean

		/** Your Azure directory uuid */
		directory_id: string

		/** The attribute name for email in the SAML response. */
		email_attribute_name: string

		/** The claim name for email in the id_token response. */
		email_claim_name: string
		header_attributes: Readonly<{

			/** attribute name from the IDP */
			attribute_name?: string

			/** header that will be added on the request to the origin */
			header_name?: string
		}>

		/** X509 certificate to verify the signature in the SAML authentication response */
		idp_public_certs: ReadonlyArray<string>

		/** IdP Entity ID or Issuer URL */
		issuer_url: string

		/** Your okta account url */
		okta_account: string

		/** Your OneLogin account url */
		onelogin_account: string

		/** Your PingOne environment identifier */
		ping_env_id: string

		/** Enable Proof Key for Code Exchange (PKCE) */
		pkce_enabled: boolean

		/** Indicates the type of user interaction that is required. prompt=login forces the user to enter their credentials on that request, negating single-sign on. prompt=none is the opposite. It ensures that the user isn't presented with any interactive prompt. If the request can't be completed silently by using single-sign on, the Microsoft identity platform returns an interaction_required error. prompt=select_account interrupts single sign-on providing account selection experience listing all the accounts either in session or any remembered account or an option to choose to use a different account altogether.
Available values: "login", "select_account", "none". */
		prompt: string
		redirect_url: string

		/** OAuth scopes */
		scopes: ReadonlyArray<string>

		/** Sign the SAML authentication request with Access credentials. To verify the signature, use the public key from the Access certs endpoints. */
		sign_request: boolean

		/** URL to send the SAML authentication requests to */
		sso_target_url: string

		/** Should Cloudflare try to load groups from your account */
		support_groups: boolean

		/** The token_endpoint URL of your IdP */
		token_url: string
	}>>

	/** UUID */
	id: Output<string>

	/** The name of the identity provider, shown to users on the login page. */
	name: Output<string>
	scim_config: Output<Readonly<{

		/** A flag to enable or disable SCIM for the identity provider. */
		enabled: boolean

		/** Indicates how a SCIM event updates a user identity used for policy evaluation. Use "automatic" to automatically update a user's identity and augment it with fields from the SCIM user resource. Use "reauth" to force re-authentication on group membership updates, user identity update will only occur after successful re-authentication. With "reauth" identities will not contain fields from the SCIM user resource. With "no_action" identities will not be changed by SCIM updates in any way and users will not be prompted to reauthenticate.
Available values: "automatic", "reauth", "no_action". */
		identity_update_behavior: string

		/** The base URL of Cloudflare's SCIM V2.0 API endpoint. */
		scim_base_url: string

		/** A flag to remove a user's seat in Zero Trust when they have been deprovisioned in the Identity Provider.  This cannot be enabled unless user_deprovision is also enabled. */
		seat_deprovision: boolean

		/** A read-only token generated when the SCIM integration is enabled for the first time.  It is redacted on subsequent requests.  If you lose this you will need to refresh it at /access/identity_providers/:idpID/refresh_scim_secret. */
		secret: string

		/** A flag to enable revoking a user's session in Access and Gateway when they have been deprovisioned in the Identity Provider. */
		user_deprovision: boolean
	}>>

	/** The type of identity provider. To determine the value for a specific provider, refer to our [developer documentation](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/).
Available values: "onetimepin", "azureAD", "saml", "centrify", "facebook", "github", "google-apps", "google", "linkedin", "oidc", "okta", "onelogin", "pingone", "yandex". */
	type: Output<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareCustomHostnameFallbackOriginProps = {

	/** Your origin hostname that requests to your custom hostnames will be sent to. */
	origin: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareCustomHostnameFallbackOrigin = Readonly<{

	/** This is the time the fallback origin was created. */
	created_at: Output<string>

	/** These are errors that were encountered while trying to activate a fallback origin. */
	errors: ReadonlyArray<string>

	/** Identifier */
	id: Output<string>

	/** Your origin hostname that requests to your custom hostnames will be sent to. */
	origin: Output<string>

	/** Status of the fallback origin's activation.
Available values: "initializing", "pending_deployment", "pending_deletion", "active", "deployment_timed_out", "deletion_timed_out". */
	status: Output<string>

	/** This is the time the fallback origin was updated. */
	updated_at: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareArgoTieredCachingProps = {

	/** Enables Tiered Caching.
Available values: "on", "off". */
	value: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareArgoTieredCaching = Readonly<{

	/** Whether the setting is editable */
	editable: Output<boolean>

	/** Identifier */
	id: Output<string>

	/** Last time this setting was modified. */
	modified_on: Output<string>

	/** Enables Tiered Caching.
Available values: "on", "off". */
	value: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareUrlNormalizationSettingsProps = {

	/** The scope of the URL normalization.
Available values: "incoming", "both". */
	scope: Input<string>

	/** The type of URL normalization performed by Cloudflare.
Available values: "cloudflare", "rfc3986". */
	type: Input<string>

	/** The unique ID of the zone. */
	zone_id: Input<string>
}

type CloudflareUrlNormalizationSettings = Readonly<{

	/** The unique ID of the zone. */
	id: Output<string>

	/** The scope of the URL normalization.
Available values: "incoming", "both". */
	scope: Output<string>

	/** The type of URL normalization performed by Cloudflare.
Available values: "cloudflare", "rfc3986". */
	type: Output<string>

	/** The unique ID of the zone. */
	zone_id: Output<string>
}>

type CloudflareZeroTrustAccessMtlsCertificateProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** The hostnames of the applications that will use this certificate. */
	associated_hostnames?: Input<Array<Input<string>> | undefined>

	/** The certificate content. */
	certificate: Input<string>

	/** The name of the certificate. */
	name: Input<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareZeroTrustAccessMtlsCertificate = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** The hostnames of the applications that will use this certificate. */
	associated_hostnames: ReadonlyArray<string>

	/** The certificate content. */
	certificate: Output<string>
	created_at: Output<string>
	expires_on: Output<string>

	/** The MD5 fingerprint of the certificate. */
	fingerprint: Output<string>

	/** The ID of the application that will use this certificate. */
	id: Output<string>

	/** The name of the certificate. */
	name: Output<string>
	updated_at: Output<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareOriginCaCertificateProps = {

	/** The Certificate Signing Request (CSR). Must be newline-encoded. */
	csr?: Input<string | undefined>

	/** Array of hostnames or wildcard names (e.g., *.example.com) bound to the certificate. */
	hostnames?: Input<Array<Input<string>> | undefined>

	/** Signature type desired on certificate ("origin-rsa" (rsa), "origin-ecc" (ecdsa), or "keyless-certificate" (for Keyless SSL servers).
Available values: "origin-rsa", "origin-ecc", "keyless-certificate". */
	request_type?: Input<string | undefined>

	/** The number of days for which the certificate should be valid.
Available values: 7, 30, 90, 365, 730, 1095, 5475. */
	requested_validity?: Input<number | undefined>
}

type CloudflareOriginCaCertificate = Readonly<{

	/** The Origin CA certificate. Will be newline-encoded. */
	certificate: Output<string>

	/** The Certificate Signing Request (CSR). Must be newline-encoded. */
	csr: Output<string | undefined>

	/** When the certificate will expire. */
	expires_on: Output<string>

	/** Array of hostnames or wildcard names (e.g., *.example.com) bound to the certificate. */
	hostnames: ReadonlyArray<string>

	/** Identifier */
	id: Output<string>

	/** Signature type desired on certificate ("origin-rsa" (rsa), "origin-ecc" (ecdsa), or "keyless-certificate" (for Keyless SSL servers).
Available values: "origin-rsa", "origin-ecc", "keyless-certificate". */
	request_type: Output<string | undefined>

	/** The number of days for which the certificate should be valid.
Available values: 7, 30, 90, 365, 730, 1095, 5475. */
	requested_validity: Output<number>
}>

type CloudflareZeroTrustGatewayLoggingProps = {
	account_id: Input<string>

	/** Redact personally identifiable information from activity logging (PII fields are: source IP, user email, user ID, device ID, URL, referrer, user agent). */
	redact_pii?: Input<boolean | undefined>
	settings_by_rule_type?: Input<{

		/** Logging settings for DNS firewall. */
		dns?: Input<string | undefined>

		/** Logging settings for HTTP/HTTPS firewall. */
		http?: Input<string | undefined>

		/** Logging settings for Network firewall. */
		l4?: Input<string | undefined>
	} | undefined>
}

type CloudflareZeroTrustGatewayLogging = Readonly<{
	account_id: Output<string>

	/** Redact personally identifiable information from activity logging (PII fields are: source IP, user email, user ID, device ID, URL, referrer, user agent). */
	redact_pii: Output<boolean | undefined>
	settings_by_rule_type: Output<Readonly<{

		/** Logging settings for DNS firewall. */
		dns: string

		/** Logging settings for HTTP/HTTPS firewall. */
		http: string

		/** Logging settings for Network firewall. */
		l4: string
	}>>
}>

type CloudflareCertificatePackProps = {

	/** Certificate Authority selected for the order.  For information on any certificate authority specific details or restrictions [see this page for more details.](https://developers.cloudflare.com/ssl/reference/certificate-authorities)
Available values: "google", "lets_encrypt", "ssl_com". */
	certificate_authority: Input<string>

	/** Whether or not to add Cloudflare Branding for the order.  This will add a subdomain of sni.cloudflaressl.com as the Common Name if set to true. */
	cloudflare_branding?: Input<boolean | undefined>

	/** Comma separated list of valid host names for the certificate packs. Must contain the zone apex, may not contain more than 50 hosts, and may not be empty. */
	hosts: Input<Array<Input<string>>>

	/** Type of certificate pack.
Available values: "advanced". */
	type: Input<string>

	/** Validation Method selected for the order.
Available values: "txt", "http", "email". */
	validation_method: Input<string>

	/** Validity Days selected for the order.
Available values: 14, 30, 90, 365. */
	validity_days: Input<number>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareCertificatePack = Readonly<{

	/** Certificate Authority selected for the order.  For information on any certificate authority specific details or restrictions [see this page for more details.](https://developers.cloudflare.com/ssl/reference/certificate-authorities)
Available values: "google", "lets_encrypt", "ssl_com". */
	certificate_authority: Output<string>

	/** Whether or not to add Cloudflare Branding for the order.  This will add a subdomain of sni.cloudflaressl.com as the Common Name if set to true. */
	cloudflare_branding: Output<boolean | undefined>

	/** Comma separated list of valid host names for the certificate packs. Must contain the zone apex, may not contain more than 50 hosts, and may not be empty. */
	hosts: ReadonlyArray<string>

	/** Identifier */
	id: Output<string>

	/** Status of certificate pack.
Available values: "initializing", "pending_validation", "deleted", "pending_issuance", "pending_deployment", "pending_deletion", "pending_expiration", "expired", "active", "initializing_timed_out", "validation_timed_out", "issuance_timed_out", "deployment_timed_out", "deletion_timed_out", "pending_cleanup", "staging_deployment", "staging_active", "deactivating", "inactive", "backup_issued", "holding_deployment". */
	status: Output<string>

	/** Type of certificate pack.
Available values: "advanced". */
	type: Output<string>

	/** Validation Method selected for the order.
Available values: "txt", "http", "email". */
	validation_method: Output<string>

	/** Validity Days selected for the order.
Available values: 14, 30, 90, 365. */
	validity_days: Output<number>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareLoadBalancerPoolProps = {

	/** Identifier */
	account_id: Input<string>

	/** A list of regions from which to run health checks. Null means every Cloudflare data center. */
	check_regions?: Input<Array<Input<string>> | undefined>

	/** A human-readable description of the pool. */
	description?: Input<string | undefined>

	/** Whether to enable (the default) or disable this pool. Disabled pools will not receive traffic and are excluded from health checks. Disabling a pool will cause any load balancers using it to failover to the next pool (if any). */
	enabled?: Input<boolean | undefined>

	/** The latitude of the data center containing the origins used in this pool in decimal degrees. If this is set, longitude must also be set. */
	latitude?: Input<number | undefined>
	load_shedding?: Input<{

		/** The percent of traffic to shed from the pool, according to the default policy. Applies to new sessions and traffic without session affinity. */
		default_percent?: Input<number | undefined>

		/** The default policy to use when load shedding. A random policy randomly sheds a given percent of requests. A hash policy computes a hash over the CF-Connecting-IP address and sheds all requests originating from a percent of IPs.
Available values: "random", "hash". */
		default_policy?: Input<string | undefined>

		/** The percent of existing sessions to shed from the pool, according to the session policy. */
		session_percent?: Input<number | undefined>

		/** Only the hash policy is supported for existing sessions (to avoid exponential decay).
Available values: "hash". */
		session_policy?: Input<string | undefined>
	} | undefined>

	/** The longitude of the data center containing the origins used in this pool in decimal degrees. If this is set, latitude must also be set. */
	longitude?: Input<number | undefined>

	/** The minimum number of origins that must be healthy for this pool to serve traffic. If the number of healthy origins falls below this number, the pool will be marked unhealthy and will failover to the next available pool. */
	minimum_origins?: Input<number | undefined>

	/** The ID of the Monitor to use for checking the health of origins within this pool. */
	monitor?: Input<string | undefined>

	/** A short name (tag) for the pool. Only alphanumeric characters, hyphens, and underscores are allowed. */
	name: Input<string>

	/** This field is now deprecated. It has been moved to Cloudflare's Centralized Notification service https://developers.cloudflare.com/fundamentals/notifications/. The email address to send health status notifications to. This can be an individual mailbox or a mailing list. Multiple emails can be supplied as a comma delimited list. */
	notification_email?: Input<string | undefined>
	notification_filter?: Input<{
		origin?: Input<{

			/** If set true, disable notifications for this type of resource (pool or origin). */
			disable?: Input<boolean | undefined>

			/** If present, send notifications only for this health status (e.g. false for only DOWN events). Use null to reset (all events). */
			healthy?: Input<boolean | undefined>
		} | undefined>
		pool?: Input<{

			/** If set true, disable notifications for this type of resource (pool or origin). */
			disable?: Input<boolean | undefined>

			/** If present, send notifications only for this health status (e.g. false for only DOWN events). Use null to reset (all events). */
			healthy?: Input<boolean | undefined>
		} | undefined>
	} | undefined>
	origin_steering?: Input<{

		/** The type of origin steering policy to use.
- `"random"`: Select an origin randomly.
- `"hash"`: Select an origin by computing a hash over the CF-Connecting-IP address.
- `"least_outstanding_requests"`: Select an origin by taking into consideration origin weights, as well as each origin's number of outstanding requests. Origins with more pending requests are weighted proportionately less relative to others.
- `"least_connections"`: Select an origin by taking into consideration origin weights, as well as each origin's number of open connections. Origins with more open connections are weighted proportionately less relative to others. Supported for HTTP/1 and HTTP/2 connections.
Available values: "random", "hash", "least_outstanding_requests", "least_connections". */
		policy?: Input<string | undefined>
	} | undefined>
	origins: Input<{

		/** The IP address (IPv4 or IPv6) of the origin, or its publicly addressable hostname. Hostnames entered here should resolve directly to the origin, and not be a hostname proxied by Cloudflare. To set an internal/reserved address, virtual_network_id must also be set. */
		address?: Input<string | undefined>

		/** Whether to enable (the default) this origin within the pool. Disabled origins will not receive traffic and are excluded from health checks. The origin will only be disabled for the current pool. */
		enabled?: Input<boolean | undefined>
		header?: Input<{

			/** The 'Host' header allows to override the hostname set in the HTTP request. Current support is 1 'Host' header override per origin. */
			host?: Input<Array<Input<string>> | undefined>
		} | undefined>

		/** A human-identifiable name for the origin. */
		name?: Input<string | undefined>

		/** The virtual network subnet ID the origin belongs in. Virtual network must also belong to the account. */
		virtual_network_id?: Input<string | undefined>

		/** The weight of this origin relative to other origins in the pool. Based on the configured weight the total traffic is distributed among origins within the pool.
- `origin_steering.policy="least_outstanding_requests"`: Use weight to scale the origin's outstanding requests.
- `origin_steering.policy="least_connections"`: Use weight to scale the origin's open connections. */
		weight?: Input<number | undefined>
	}>
}

type CloudflareLoadBalancerPool = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** A list of regions from which to run health checks. Null means every Cloudflare data center. */
	check_regions: ReadonlyArray<string>
	created_on: Output<string>

	/** A human-readable description of the pool. */
	description: Output<string | undefined>

	/** This field shows up only if the pool is disabled. This field is set with the time the pool was disabled at. */
	disabled_at: Output<string>

	/** Whether to enable (the default) or disable this pool. Disabled pools will not receive traffic and are excluded from health checks. Disabling a pool will cause any load balancers using it to failover to the next pool (if any). */
	enabled: Output<boolean>
	id: Output<string>

	/** The latitude of the data center containing the origins used in this pool in decimal degrees. If this is set, longitude must also be set. */
	latitude: Output<number | undefined>
	load_shedding: Output<Readonly<{

		/** The percent of traffic to shed from the pool, according to the default policy. Applies to new sessions and traffic without session affinity. */
		default_percent: number

		/** The default policy to use when load shedding. A random policy randomly sheds a given percent of requests. A hash policy computes a hash over the CF-Connecting-IP address and sheds all requests originating from a percent of IPs.
Available values: "random", "hash". */
		default_policy: string

		/** The percent of existing sessions to shed from the pool, according to the session policy. */
		session_percent: number

		/** Only the hash policy is supported for existing sessions (to avoid exponential decay).
Available values: "hash". */
		session_policy: string
	}>>

	/** The longitude of the data center containing the origins used in this pool in decimal degrees. If this is set, latitude must also be set. */
	longitude: Output<number | undefined>

	/** The minimum number of origins that must be healthy for this pool to serve traffic. If the number of healthy origins falls below this number, the pool will be marked unhealthy and will failover to the next available pool. */
	minimum_origins: Output<number>
	modified_on: Output<string>

	/** The ID of the Monitor to use for checking the health of origins within this pool. */
	monitor: Output<string | undefined>

	/** A short name (tag) for the pool. Only alphanumeric characters, hyphens, and underscores are allowed. */
	name: Output<string>

	/** List of networks where Load Balancer or Pool is enabled. */
	networks: ReadonlyArray<string>

	/** This field is now deprecated. It has been moved to Cloudflare's Centralized Notification service https://developers.cloudflare.com/fundamentals/notifications/. The email address to send health status notifications to. This can be an individual mailbox or a mailing list. Multiple emails can be supplied as a comma delimited list. */
	notification_email: Output<string | undefined>
	notification_filter: Output<Readonly<{
		origin: Readonly<{

			/** If set true, disable notifications for this type of resource (pool or origin). */
			disable: boolean

			/** If present, send notifications only for this health status (e.g. false for only DOWN events). Use null to reset (all events). */
			healthy?: boolean
		}>
		pool: Readonly<{

			/** If set true, disable notifications for this type of resource (pool or origin). */
			disable: boolean

			/** If present, send notifications only for this health status (e.g. false for only DOWN events). Use null to reset (all events). */
			healthy?: boolean
		}>
	}>>
	origin_steering: Output<Readonly<{

		/** The type of origin steering policy to use.
- `"random"`: Select an origin randomly.
- `"hash"`: Select an origin by computing a hash over the CF-Connecting-IP address.
- `"least_outstanding_requests"`: Select an origin by taking into consideration origin weights, as well as each origin's number of outstanding requests. Origins with more pending requests are weighted proportionately less relative to others.
- `"least_connections"`: Select an origin by taking into consideration origin weights, as well as each origin's number of open connections. Origins with more open connections are weighted proportionately less relative to others. Supported for HTTP/1 and HTTP/2 connections.
Available values: "random", "hash", "least_outstanding_requests", "least_connections". */
		policy: string
	}>>
	origins: Output<Readonly<{

		/** The IP address (IPv4 or IPv6) of the origin, or its publicly addressable hostname. Hostnames entered here should resolve directly to the origin, and not be a hostname proxied by Cloudflare. To set an internal/reserved address, virtual_network_id must also be set. */
		address: string

		/** This field shows up only if the origin is disabled. This field is set with the time the origin was disabled. */
		disabled_at: string

		/** Whether to enable (the default) this origin within the pool. Disabled origins will not receive traffic and are excluded from health checks. The origin will only be disabled for the current pool. */
		enabled: boolean
		header: Readonly<{

			/** The 'Host' header allows to override the hostname set in the HTTP request. Current support is 1 'Host' header override per origin. */
			host?: ReadonlyArray<string>
		}>

		/** A human-identifiable name for the origin. */
		name: string

		/** The virtual network subnet ID the origin belongs in. Virtual network must also belong to the account. */
		virtual_network_id: string

		/** The weight of this origin relative to other origins in the pool. Based on the configured weight the total traffic is distributed among origins within the pool.
- `origin_steering.policy="least_outstanding_requests"`: Use weight to scale the origin's outstanding requests.
- `origin_steering.policy="least_connections"`: Use weight to scale the origin's open connections. */
		weight: number
	}>>
}>

type CloudflareNotificationPolicyProps = {

	/** The account id */
	account_id: Input<string>

	/** Optional specification of how often to re-alert from the same incident, not support on all alert types. */
	alert_interval?: Input<string | undefined>

	/** Refers to which event will trigger a Notification dispatch. You can use the endpoint to get available alert types which then will give you a list of possible values.
Available values: "access_custom_certificate_expiration_type", "advanced_ddos_attack_l4_alert", "advanced_ddos_attack_l7_alert", "advanced_http_alert_error", "bgp_hijack_notification", "billing_usage_alert", "block_notification_block_removed", "block_notification_new_block", "block_notification_review_rejected", "brand_protection_alert", "brand_protection_digest", "clickhouse_alert_fw_anomaly", "clickhouse_alert_fw_ent_anomaly", "cloudforce_one_request_notification", "custom_analytics", "custom_ssl_certificate_event_type", "dedicated_ssl_certificate_event_type", "device_connectivity_anomaly_alert", "dos_attack_l4", "dos_attack_l7", "expiring_service_token_alert", "failing_logpush_job_disabled_alert", "fbm_auto_advertisement", "fbm_dosd_attack", "fbm_volumetric_attack", "health_check_status_notification", "hostname_aop_custom_certificate_expiration_type", "http_alert_edge_error", "http_alert_origin_error", "image_notification", "image_resizing_notification", "incident_alert", "load_balancing_health_alert", "load_balancing_pool_enablement_alert", "logo_match_alert", "magic_tunnel_health_check_event", "magic_wan_tunnel_health", "maintenance_event_notification", "mtls_certificate_store_certificate_expiration_type", "pages_event_alert", "radar_notification", "real_origin_monitoring", "scriptmonitor_alert_new_code_change_detections", "scriptmonitor_alert_new_hosts", "scriptmonitor_alert_new_malicious_hosts", "scriptmonitor_alert_new_malicious_scripts", "scriptmonitor_alert_new_malicious_url", "scriptmonitor_alert_new_max_length_resource_url", "scriptmonitor_alert_new_resources", "secondary_dns_all_primaries_failing", "secondary_dns_primaries_failing", "secondary_dns_warning", "secondary_dns_zone_successfully_updated", "secondary_dns_zone_validation_warning", "security_insights_alert", "sentinel_alert", "stream_live_notifications", "synthetic_test_latency_alert", "synthetic_test_low_availability_alert", "traffic_anomalies_alert", "tunnel_health_event", "tunnel_update_event", "universal_ssl_event_type", "web_analytics_metrics_update", "zone_aop_custom_certificate_expiration_type". */
	alert_type: Input<string>

	/** Optional description for the Notification policy. */
	description?: Input<string | undefined>

	/** Whether or not the Notification policy is enabled. */
	enabled?: Input<boolean | undefined>
	filters?: Input<{

		/** Usage depends on specific alert type */
		actions?: Input<Array<Input<string>> | undefined>

		/** Used for configuring radar_notification */
		affected_asns?: Input<Array<Input<string>> | undefined>

		/** Used for configuring incident_alert */
		affected_components?: Input<Array<Input<string>> | undefined>

		/** Used for configuring radar_notification */
		affected_locations?: Input<Array<Input<string>> | undefined>

		/** Used for configuring maintenance_event_notification */
		airport_code?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		alert_trigger_preferences?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		alert_trigger_preferences_value?: Input<Array<Input<string>> | undefined>

		/** Used for configuring load_balancing_pool_enablement_alert */
		enabled?: Input<Array<Input<string>> | undefined>

		/** Used for configuring pages_event_alert */
		environment?: Input<Array<Input<string>> | undefined>

		/** Used for configuring pages_event_alert */
		event?: Input<Array<Input<string>> | undefined>

		/** Used for configuring load_balancing_health_alert */
		event_source?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		event_type?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		group_by?: Input<Array<Input<string>> | undefined>

		/** Used for configuring health_check_status_notification */
		health_check_id?: Input<Array<Input<string>> | undefined>

		/** Used for configuring incident_alert */
		incident_impact?: Input<Array<Input<string>> | undefined>

		/** Used for configuring stream_live_notifications */
		input_id?: Input<Array<Input<string>> | undefined>

		/** Used for configuring security_insights_alert */
		insight_class?: Input<Array<Input<string>> | undefined>

		/** Used for configuring billing_usage_alert */
		limit?: Input<Array<Input<string>> | undefined>

		/** Used for configuring logo_match_alert */
		logo_tag?: Input<Array<Input<string>> | undefined>

		/** Used for configuring advanced_ddos_attack_l4_alert */
		megabits_per_second?: Input<Array<Input<string>> | undefined>

		/** Used for configuring load_balancing_health_alert */
		new_health?: Input<Array<Input<string>> | undefined>

		/** Used for configuring tunnel_health_event */
		new_status?: Input<Array<Input<string>> | undefined>

		/** Used for configuring advanced_ddos_attack_l4_alert */
		packets_per_second?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		pool_id?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		pop_names?: Input<Array<Input<string>> | undefined>

		/** Used for configuring billing_usage_alert */
		product?: Input<Array<Input<string>> | undefined>

		/** Used for configuring pages_event_alert */
		project_id?: Input<Array<Input<string>> | undefined>

		/** Used for configuring advanced_ddos_attack_l4_alert */
		protocol?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		query_tag?: Input<Array<Input<string>> | undefined>

		/** Used for configuring advanced_ddos_attack_l7_alert */
		requests_per_second?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		selectors?: Input<Array<Input<string>> | undefined>

		/** Used for configuring clickhouse_alert_fw_ent_anomaly */
		services?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		slo?: Input<Array<Input<string>> | undefined>

		/** Used for configuring health_check_status_notification */
		status?: Input<Array<Input<string>> | undefined>

		/** Used for configuring advanced_ddos_attack_l7_alert */
		target_hostname?: Input<Array<Input<string>> | undefined>

		/** Used for configuring advanced_ddos_attack_l4_alert */
		target_ip?: Input<Array<Input<string>> | undefined>

		/** Used for configuring advanced_ddos_attack_l7_alert */
		target_zone_name?: Input<Array<Input<string>> | undefined>

		/** Used for configuring traffic_anomalies_alert */
		traffic_exclusions?: Input<Array<Input<string>> | undefined>

		/** Used for configuring tunnel_health_event */
		tunnel_id?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		tunnel_name?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		where?: Input<Array<Input<string>> | undefined>

		/** Usage depends on specific alert type */
		zones?: Input<Array<Input<string>> | undefined>
	} | undefined>
	mechanisms: Input<{
		email?: Input<{

			/** The email address */
			id?: Input<string | undefined>
		} | undefined>
		pagerduty?: Input<{

			/** UUID */
			id?: Input<string | undefined>
		} | undefined>
		webhooks?: Input<{

			/** UUID */
			id?: Input<string | undefined>
		} | undefined>
	}>

	/** Name of the policy. */
	name: Input<string>
}

type CloudflareNotificationPolicy = Readonly<{

	/** The account id */
	account_id: Output<string>

	/** Optional specification of how often to re-alert from the same incident, not support on all alert types. */
	alert_interval: Output<string | undefined>

	/** Refers to which event will trigger a Notification dispatch. You can use the endpoint to get available alert types which then will give you a list of possible values.
Available values: "access_custom_certificate_expiration_type", "advanced_ddos_attack_l4_alert", "advanced_ddos_attack_l7_alert", "advanced_http_alert_error", "bgp_hijack_notification", "billing_usage_alert", "block_notification_block_removed", "block_notification_new_block", "block_notification_review_rejected", "brand_protection_alert", "brand_protection_digest", "clickhouse_alert_fw_anomaly", "clickhouse_alert_fw_ent_anomaly", "cloudforce_one_request_notification", "custom_analytics", "custom_ssl_certificate_event_type", "dedicated_ssl_certificate_event_type", "device_connectivity_anomaly_alert", "dos_attack_l4", "dos_attack_l7", "expiring_service_token_alert", "failing_logpush_job_disabled_alert", "fbm_auto_advertisement", "fbm_dosd_attack", "fbm_volumetric_attack", "health_check_status_notification", "hostname_aop_custom_certificate_expiration_type", "http_alert_edge_error", "http_alert_origin_error", "image_notification", "image_resizing_notification", "incident_alert", "load_balancing_health_alert", "load_balancing_pool_enablement_alert", "logo_match_alert", "magic_tunnel_health_check_event", "magic_wan_tunnel_health", "maintenance_event_notification", "mtls_certificate_store_certificate_expiration_type", "pages_event_alert", "radar_notification", "real_origin_monitoring", "scriptmonitor_alert_new_code_change_detections", "scriptmonitor_alert_new_hosts", "scriptmonitor_alert_new_malicious_hosts", "scriptmonitor_alert_new_malicious_scripts", "scriptmonitor_alert_new_malicious_url", "scriptmonitor_alert_new_max_length_resource_url", "scriptmonitor_alert_new_resources", "secondary_dns_all_primaries_failing", "secondary_dns_primaries_failing", "secondary_dns_warning", "secondary_dns_zone_successfully_updated", "secondary_dns_zone_validation_warning", "security_insights_alert", "sentinel_alert", "stream_live_notifications", "synthetic_test_latency_alert", "synthetic_test_low_availability_alert", "traffic_anomalies_alert", "tunnel_health_event", "tunnel_update_event", "universal_ssl_event_type", "web_analytics_metrics_update", "zone_aop_custom_certificate_expiration_type". */
	alert_type: Output<string>
	created: Output<string>

	/** Optional description for the Notification policy. */
	description: Output<string | undefined>

	/** Whether or not the Notification policy is enabled. */
	enabled: Output<boolean>
	filters: Output<Readonly<{

		/** Usage depends on specific alert type */
		actions: ReadonlyArray<string>

		/** Used for configuring radar_notification */
		affected_asns: ReadonlyArray<string>

		/** Used for configuring incident_alert */
		affected_components: ReadonlyArray<string>

		/** Used for configuring radar_notification */
		affected_locations: ReadonlyArray<string>

		/** Used for configuring maintenance_event_notification */
		airport_code: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		alert_trigger_preferences: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		alert_trigger_preferences_value: ReadonlyArray<string>

		/** Used for configuring load_balancing_pool_enablement_alert */
		enabled: ReadonlyArray<string>

		/** Used for configuring pages_event_alert */
		environment: ReadonlyArray<string>

		/** Used for configuring pages_event_alert */
		event: ReadonlyArray<string>

		/** Used for configuring load_balancing_health_alert */
		event_source: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		event_type: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		group_by: ReadonlyArray<string>

		/** Used for configuring health_check_status_notification */
		health_check_id: ReadonlyArray<string>

		/** Used for configuring incident_alert */
		incident_impact: ReadonlyArray<string>

		/** Used for configuring stream_live_notifications */
		input_id: ReadonlyArray<string>

		/** Used for configuring security_insights_alert */
		insight_class: ReadonlyArray<string>

		/** Used for configuring billing_usage_alert */
		limit: ReadonlyArray<string>

		/** Used for configuring logo_match_alert */
		logo_tag: ReadonlyArray<string>

		/** Used for configuring advanced_ddos_attack_l4_alert */
		megabits_per_second: ReadonlyArray<string>

		/** Used for configuring load_balancing_health_alert */
		new_health: ReadonlyArray<string>

		/** Used for configuring tunnel_health_event */
		new_status: ReadonlyArray<string>

		/** Used for configuring advanced_ddos_attack_l4_alert */
		packets_per_second: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		pool_id: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		pop_names: ReadonlyArray<string>

		/** Used for configuring billing_usage_alert */
		product: ReadonlyArray<string>

		/** Used for configuring pages_event_alert */
		project_id: ReadonlyArray<string>

		/** Used for configuring advanced_ddos_attack_l4_alert */
		protocol: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		query_tag: ReadonlyArray<string>

		/** Used for configuring advanced_ddos_attack_l7_alert */
		requests_per_second: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		selectors: ReadonlyArray<string>

		/** Used for configuring clickhouse_alert_fw_ent_anomaly */
		services: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		slo: ReadonlyArray<string>

		/** Used for configuring health_check_status_notification */
		status: ReadonlyArray<string>

		/** Used for configuring advanced_ddos_attack_l7_alert */
		target_hostname: ReadonlyArray<string>

		/** Used for configuring advanced_ddos_attack_l4_alert */
		target_ip: ReadonlyArray<string>

		/** Used for configuring advanced_ddos_attack_l7_alert */
		target_zone_name: ReadonlyArray<string>

		/** Used for configuring traffic_anomalies_alert */
		traffic_exclusions: ReadonlyArray<string>

		/** Used for configuring tunnel_health_event */
		tunnel_id: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		tunnel_name: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		where: ReadonlyArray<string>

		/** Usage depends on specific alert type */
		zones: ReadonlyArray<string>
	}>>

	/** UUID */
	id: Output<string>
	mechanisms: Output<Readonly<{
		email: Readonly<{

			/** The email address */
			id?: string
		}>
		pagerduty: Readonly<{

			/** UUID */
			id?: string
		}>
		webhooks: Readonly<{

			/** UUID */
			id?: string
		}>
	}>>
	modified: Output<string>

	/** Name of the policy. */
	name: Output<string>
}>

type CloudflareZeroTrustGatewaySettingsProps = {
	account_id: Input<string>
	settings?: Input<{
		activity_log?: Input<{

			/** Enable activity logging. */
			enabled?: Input<boolean | undefined>
		} | undefined>
		antivirus?: Input<{

			/** Enable anti-virus scanning on downloads. */
			enabled_download_phase?: Input<boolean | undefined>

			/** Enable anti-virus scanning on uploads. */
			enabled_upload_phase?: Input<boolean | undefined>

			/** Block requests for files that cannot be scanned. */
			fail_closed?: Input<boolean | undefined>
			notification_settings?: Input<{

				/** Set notification on */
				enabled?: Input<boolean | undefined>

				/** Customize the message shown in the notification. */
				msg?: Input<string | undefined>

				/** Optional URL to direct users to additional information. If not set, the notification will open a block page. */
				support_url?: Input<string | undefined>
			} | undefined>
		} | undefined>
		block_page?: Input<{

			/** Block page background color in #rrggbb format. */
			background_color?: Input<string | undefined>

			/** Enable only cipher suites and TLS versions compliant with FIPS 140-2. */
			enabled?: Input<boolean | undefined>

			/** Block page footer text. */
			footer_text?: Input<string | undefined>

			/** Block page header text. */
			header_text?: Input<string | undefined>

			/** Full URL to the logo file. */
			logo_path?: Input<string | undefined>

			/** Admin email for users to contact. */
			mailto_address?: Input<string | undefined>

			/** Subject line for emails created from block page. */
			mailto_subject?: Input<string | undefined>

			/** Block page title. */
			name?: Input<string | undefined>

			/** Suppress detailed info at the bottom of the block page. */
			suppress_footer?: Input<boolean | undefined>
		} | undefined>
		body_scanning?: Input<{

			/** Set the inspection mode to either `deep` or `shallow`. */
			inspection_mode?: Input<string | undefined>
		} | undefined>
		browser_isolation?: Input<{

			/** Enable non-identity onramp support for Browser Isolation. */
			non_identity_enabled?: Input<boolean | undefined>

			/** Enable Clientless Browser Isolation. */
			url_browser_isolation_enabled?: Input<boolean | undefined>
		} | undefined>
		certificate?: Input<{

			/** UUID of certificate to be used for interception. Certificate must be available (previously called 'active') on the edge. A nil UUID will indicate the Cloudflare Root CA should be used. */
			id: Input<string>
		} | undefined>
		custom_certificate?: Input<{

			/** Enable use of custom certificate authority for signing Gateway traffic. */
			enabled: Input<boolean>

			/** UUID of certificate (ID from MTLS certificate store). */
			id?: Input<string | undefined>
		} | undefined>
		extended_email_matching?: Input<{

			/** Enable matching all variants of user emails (with + or . modifiers) used as criteria in Firewall policies. */
			enabled?: Input<boolean | undefined>
		} | undefined>
		fips?: Input<{

			/** Enable only cipher suites and TLS versions compliant with FIPS 140-2. */
			tls?: Input<boolean | undefined>
		} | undefined>
		protocol_detection?: Input<{

			/** Enable detecting protocol on initial bytes of client traffic. */
			enabled?: Input<boolean | undefined>
		} | undefined>
		sandbox?: Input<{

			/** Enable sandbox. */
			enabled?: Input<boolean | undefined>

			/** Action to take when the file cannot be scanned.
Available values: "allow", "block". */
			fallback_action?: Input<string | undefined>
		} | undefined>
		tls_decrypt?: Input<{

			/** Enable inspecting encrypted HTTP traffic. */
			enabled?: Input<boolean | undefined>
		} | undefined>
	} | undefined>
}

type CloudflareZeroTrustGatewaySettings = Readonly<{
	account_id: Output<string>
	created_at: Output<string>
	id: Output<string>
	settings: Output<Readonly<{
		activity_log: Readonly<{

			/** Enable activity logging. */
			enabled?: boolean
		}>
		antivirus: Readonly<{

			/** Enable anti-virus scanning on downloads. */
			enabled_download_phase?: boolean

			/** Enable anti-virus scanning on uploads. */
			enabled_upload_phase?: boolean

			/** Block requests for files that cannot be scanned. */
			fail_closed?: boolean
			notification_settings: Readonly<{

				/** Set notification on */
				enabled?: boolean

				/** Customize the message shown in the notification. */
				msg?: string

				/** Optional URL to direct users to additional information. If not set, the notification will open a block page. */
				support_url?: string
			}>
		}>
		block_page: Readonly<{

			/** Block page background color in #rrggbb format. */
			background_color?: string

			/** Enable only cipher suites and TLS versions compliant with FIPS 140-2. */
			enabled?: boolean

			/** Block page footer text. */
			footer_text?: string

			/** Block page header text. */
			header_text?: string

			/** Full URL to the logo file. */
			logo_path?: string

			/** Admin email for users to contact. */
			mailto_address?: string

			/** Subject line for emails created from block page. */
			mailto_subject?: string

			/** Block page title. */
			name?: string

			/** Suppress detailed info at the bottom of the block page. */
			suppress_footer?: boolean
		}>
		body_scanning: Readonly<{

			/** Set the inspection mode to either `deep` or `shallow`. */
			inspection_mode?: string
		}>
		browser_isolation: Readonly<{

			/** Enable non-identity onramp support for Browser Isolation. */
			non_identity_enabled?: boolean

			/** Enable Clientless Browser Isolation. */
			url_browser_isolation_enabled?: boolean
		}>
		certificate: Readonly<{

			/** UUID of certificate to be used for interception. Certificate must be available (previously called 'active') on the edge. A nil UUID will indicate the Cloudflare Root CA should be used. */
			id: string
		}>
		custom_certificate: Readonly<{

			/** Certificate status (internal). */
			binding_status: string

			/** Enable use of custom certificate authority for signing Gateway traffic. */
			enabled: boolean

			/** UUID of certificate (ID from MTLS certificate store). */
			id?: string
			updated_at: string
		}>
		extended_email_matching: Readonly<{

			/** Enable matching all variants of user emails (with + or . modifiers) used as criteria in Firewall policies. */
			enabled?: boolean
		}>
		fips: Readonly<{

			/** Enable only cipher suites and TLS versions compliant with FIPS 140-2. */
			tls?: boolean
		}>
		protocol_detection: Readonly<{

			/** Enable detecting protocol on initial bytes of client traffic. */
			enabled?: boolean
		}>
		sandbox: Readonly<{

			/** Enable sandbox. */
			enabled?: boolean

			/** Action to take when the file cannot be scanned.
Available values: "allow", "block". */
			fallback_action?: string
		}>
		tls_decrypt: Readonly<{

			/** Enable inspecting encrypted HTTP traffic. */
			enabled?: boolean
		}>
	}>>
	updated_at: Output<string>
}>

type CloudflareR2CustomDomainProps = {

	/** Account ID */
	account_id: Input<string>

	/** Name of the bucket */
	bucket_name: Input<string>

	/** Name of the custom domain to be added */
	domain: Input<string>

	/** Whether to enable public bucket access at the custom domain. If undefined, the domain will be enabled. */
	enabled: Input<boolean>

	/** Minimum TLS Version the custom domain will accept for incoming connections. If not set, defaults to 1.0.
Available values: "1.0", "1.1", "1.2", "1.3". */
	min_tls?: Input<string | undefined>

	/** Zone ID of the custom domain */
	zone_id: Input<string>
}

type CloudflareR2CustomDomain = Readonly<{

	/** Account ID */
	account_id: Output<string>

	/** Name of the bucket */
	bucket_name: Output<string>

	/** Name of the custom domain to be added */
	domain: Output<string>

	/** Whether to enable public bucket access at the custom domain. If undefined, the domain will be enabled. */
	enabled: Output<boolean>

	/** Minimum TLS Version the custom domain will accept for incoming connections. If not set, defaults to 1.0.
Available values: "1.0", "1.1", "1.2", "1.3". */
	min_tls: Output<string | undefined>
	status: Output<Readonly<{

		/** Ownership status of the domain
Available values: "pending", "active", "deactivated", "blocked", "error", "unknown". */
		ownership: string

		/** SSL certificate status
Available values: "initializing", "pending", "active", "deactivated", "error", "unknown". */
		ssl: string
	}>>

	/** Zone ID of the custom domain */
	zone_id: Output<string>

	/** Zone that the custom domain resides in */
	zone_name: Output<string>
}>

type CloudflareMagicNetworkMonitoringConfigurationProps = {
	account_id: Input<string>

	/** Fallback sampling rate of flow messages being sent in packets per second. This should match the packet sampling rate configured on the router. */
	default_sampling?: Input<number | undefined>

	/** The account name. */
	name: Input<string>
	router_ips?: Input<Array<Input<string>> | undefined>
	warp_devices?: Input<{

		/** Unique identifier for the warp device. */
		id: Input<string>

		/** Name of the warp device. */
		name: Input<string>

		/** IPv4 CIDR of the router sourcing flow data associated with this warp device. Only /32 addresses are currently supported. */
		router_ip: Input<string>
	} | undefined>
}

type CloudflareMagicNetworkMonitoringConfiguration = Readonly<{
	account_id: Output<string>

	/** Fallback sampling rate of flow messages being sent in packets per second. This should match the packet sampling rate configured on the router. */
	default_sampling: Output<number>

	/** The account name. */
	name: Output<string>
	router_ips: ReadonlyArray<string>
	warp_devices: Output<Readonly<{

		/** Unique identifier for the warp device. */
		id: string

		/** Name of the warp device. */
		name: string

		/** IPv4 CIDR of the router sourcing flow data associated with this warp device. Only /32 addresses are currently supported. */
		router_ip: string
	}>>
}>

type CloudflareCallsTurnAppProps = {

	/** The account identifier tag. */
	account_id: Input<string>

	/** A Cloudflare-generated unique identifier for a item. */
	key_id?: Input<string | undefined>

	/** A short description of a TURN key, not shown to end users. */
	name?: Input<string | undefined>
}

type CloudflareCallsTurnApp = Readonly<{

	/** The account identifier tag. */
	account_id: Output<string>

	/** The date and time the item was created. */
	created: Output<string>

	/** Bearer token */
	key: Output<string>

	/** A Cloudflare-generated unique identifier for a item. */
	key_id: Output<string | undefined>

	/** The date and time the item was last modified. */
	modified: Output<string>

	/** A short description of a TURN key, not shown to end users. */
	name: Output<string>

	/** A Cloudflare-generated unique identifier for a item. */
	uid: Output<string>
}>

type CloudflareApiShieldDiscoveryOperationProps = {

	/** UUID */
	operation_id: Input<string>

	/** Mark state of operation in API Discovery
  * `review` - Mark operation as for review
  * `ignored` - Mark operation as ignored
Available values: "review", "ignored". */
	state?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareApiShieldDiscoveryOperation = Readonly<{

	/** UUID */
	id: Output<string>

	/** UUID */
	operation_id: Output<string>

	/** Mark state of operation in API Discovery
  * `review` - Mark operation as for review
  * `ignored` - Mark operation as ignored
Available values: "review", "ignored". */
	state: Output<string | undefined>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustGatewayProxyEndpointProps = {
	account_id: Input<string>

	/** A list of CIDRs to restrict ingress connections. */
	ips: Input<Array<Input<string>>>

	/** The name of the proxy endpoint. */
	name: Input<string>
}

type CloudflareZeroTrustGatewayProxyEndpoint = Readonly<{
	account_id: Output<string>
	created_at: Output<string>
	id: Output<string>

	/** A list of CIDRs to restrict ingress connections. */
	ips: ReadonlyArray<string>

	/** The name of the proxy endpoint. */
	name: Output<string>

	/** The subdomain to be used as the destination in the proxy client. */
	subdomain: Output<string>
	updated_at: Output<string>
}>

type CloudflareMtlsCertificateProps = {

	/** Identifier */
	account_id: Input<string>

	/** Indicates whether the certificate is a CA or leaf certificate. */
	ca: Input<boolean>

	/** The uploaded root CA certificate. */
	certificates: Input<string>

	/** Optional unique name for the certificate. Only used for human readability. */
	name?: Input<string | undefined>

	/** The private key for the certificate */
	private_key?: Input<string | undefined>
}

type CloudflareMtlsCertificate = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Indicates whether the certificate is a CA or leaf certificate. */
	ca: Output<boolean>

	/** The uploaded root CA certificate. */
	certificates: Output<string>

	/** When the certificate expires. */
	expires_on: Output<string>

	/** Identifier */
	id: Output<string>

	/** The certificate authority that issued the certificate. */
	issuer: Output<string>

	/** Optional unique name for the certificate. Only used for human readability. */
	name: Output<string | undefined>

	/** The private key for the certificate */
	private_key: Output<string | undefined>

	/** The certificate serial number. */
	serial_number: Output<string>

	/** The type of hash used for the certificate. */
	signature: Output<string>

	/** This is the time the certificate was updated. */
	updated_at: Output<string>

	/** This is the time the certificate was uploaded. */
	uploaded_on: Output<string>
}>

type CloudflareWeb3HostnameProps = {

	/** An optional description of the hostname. */
	description?: Input<string | undefined>

	/** DNSLink value used if the target is ipfs. */
	dnslink?: Input<string | undefined>

	/** The hostname that will point to the target gateway via CNAME. */
	name: Input<string>

	/** Target gateway of the hostname.
Available values: "ethereum", "ipfs", "ipfs_universal_path". */
	target: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareWeb3Hostname = Readonly<{
	created_on: Output<string>

	/** An optional description of the hostname. */
	description: Output<string | undefined>

	/** DNSLink value used if the target is ipfs. */
	dnslink: Output<string | undefined>

	/** Identifier */
	id: Output<string>
	modified_on: Output<string>

	/** The hostname that will point to the target gateway via CNAME. */
	name: Output<string>

	/** Status of the hostname's activation.
Available values: "active", "pending", "deleting", "error". */
	status: Output<string>

	/** Target gateway of the hostname.
Available values: "ethereum", "ipfs", "ipfs_universal_path". */
	target: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustDeviceManagedNetworksProps = {
	account_id: Input<string>
	config: Input<{

		/** The SHA-256 hash of the TLS certificate presented by the host found at tls_sockaddr. If absent, regular certificate verification (trusted roots, valid timestamp, etc) will be used to validate the certificate. */
		sha256?: Input<string | undefined>

		/** A network address of the form "host:port" that the WARP client will use to detect the presence of a TLS host. */
		tls_sockaddr: Input<string>
	}>

	/** The name of the device managed network. This name must be unique. */
	name: Input<string>

	/** The type of device managed network.
Available values: "tls". */
	type: Input<string>
}

type CloudflareZeroTrustDeviceManagedNetworks = Readonly<{
	account_id: Output<string>
	config: Output<Readonly<{

		/** The SHA-256 hash of the TLS certificate presented by the host found at tls_sockaddr. If absent, regular certificate verification (trusted roots, valid timestamp, etc) will be used to validate the certificate. */
		sha256: string

		/** A network address of the form "host:port" that the WARP client will use to detect the presence of a TLS host. */
		tls_sockaddr: string
	}>>

	/** API UUID. */
	id: Output<string>

	/** The name of the device managed network. This name must be unique. */
	name: Output<string>

	/** API UUID. */
	network_id: Output<string>

	/** The type of device managed network.
Available values: "tls". */
	type: Output<string>
}>

type CloudflareEmailRoutingRuleProps = {
	actions: Input<{

		/** Type of supported action.
Available values: "drop", "forward", "worker". */
		type: Input<string>
		value: Input<Array<Input<string>>>
	}>

	/** Routing rule status. */
	enabled?: Input<boolean | undefined>
	matchers: Input<{

		/** Field for type matcher.
Available values: "to". */
		field: Input<string>

		/** Type of matcher.
Available values: "literal". */
		type: Input<string>

		/** Value for matcher. */
		value: Input<string>
	}>

	/** Routing rule name. */
	name?: Input<string | undefined>

	/** Priority of the routing rule. */
	priority?: Input<number | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareEmailRoutingRule = Readonly<{
	actions: Output<Readonly<{

		/** Type of supported action.
Available values: "drop", "forward", "worker". */
		type: string
		value: ReadonlyArray<string>
	}>>

	/** Routing rule status. */
	enabled: Output<boolean>

	/** Routing rule identifier. */
	id: Output<string>
	matchers: Output<Readonly<{

		/** Field for type matcher.
Available values: "to". */
		field: string

		/** Type of matcher.
Available values: "literal". */
		type: string

		/** Value for matcher. */
		value: string
	}>>

	/** Routing rule name. */
	name: Output<string | undefined>

	/** Priority of the routing rule. */
	priority: Output<number>

	/** Routing rule tag. (Deprecated, replaced by routing rule identifier) */
	tag: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustGatewayPolicyProps = {
	account_id: Input<string>

	/** The action to preform when the associated traffic, identity, and device posture expressions are either absent or evaluate to `true`.
Available values: "on", "off", "allow", "block", "scan", "noscan", "safesearch", "ytrestricted", "isolate", "noisolate", "override", "l4_override", "egress", "resolve", "quarantine". */
	action: Input<string>

	/** The description of the rule. */
	description?: Input<string | undefined>

	/** The wirefilter expression used for device posture check matching. */
	device_posture?: Input<string | undefined>

	/** True if the rule is enabled. */
	enabled?: Input<boolean | undefined>
	expiration?: Input<{

		/** The default duration a policy will be active in minutes. Must be set in order to use the `reset_expiration` endpoint on this rule. */
		duration?: Input<number | undefined>

		/** Whether the policy has expired. */
		expired?: Input<boolean | undefined>

		/** The time stamp at which the policy will expire and cease to be
applied.

Must adhere to RFC 3339 and include a UTC offset. Non-zero
offsets are accepted but will be converted to the equivalent
value with offset zero (UTC+00:00) and will be returned as time
stamps with offset zero denoted by a trailing 'Z'.

Policies with an expiration do not consider the timezone of
clients they are applied to, and expire "globally" at the point
given by their `expires_at` value. */
		expires_at: Input<string>
	} | undefined>

	/** The protocol or layer to evaluate the traffic, identity, and device posture expressions. */
	filters?: Input<Array<Input<string>> | undefined>

	/** The wirefilter expression used for identity matching. */
	identity?: Input<string | undefined>

	/** The name of the rule. */
	name: Input<string>

	/** Precedence sets the order of your rules. Lower values indicate higher precedence. At each processing phase, applicable rules are evaluated in ascending order of this value. */
	precedence?: Input<number | undefined>
	rule_settings?: Input<{

		/** Add custom headers to allowed requests, in the form of key-value pairs. Keys are header names, pointing to an array with its header value(s). */
		add_headers?: Input<Record<string, Input<string>> | undefined>

		/** Set by parent MSP accounts to enable their children to bypass this rule. */
		allow_child_bypass?: Input<boolean | undefined>
		audit_ssh?: Input<{

			/** Enable to turn on SSH command logging. */
			command_logging?: Input<boolean | undefined>
		} | undefined>
		biso_admin_controls?: Input<{

			/** Configure whether copy is enabled or not. When set with "remote_only", copying isolated content from the remote browser to the user's local clipboard is disabled. When absent, copy is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled", "remote_only". */
			copy?: Input<string | undefined>

			/** Set to false to enable copy-pasting. Only applies when `version == "v1"`. */
			dcp?: Input<boolean | undefined>

			/** Set to false to enable downloading. Only applies when `version == "v1"`. */
			dd?: Input<boolean | undefined>

			/** Set to false to enable keyboard usage. Only applies when `version == "v1"`. */
			dk?: Input<boolean | undefined>

			/** Configure whether downloading enabled or not. When absent, downloading is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled". */
			download?: Input<string | undefined>

			/** Set to false to enable printing. Only applies when `version == "v1"`. */
			dp?: Input<boolean | undefined>

			/** Set to false to enable uploading. Only applies when `version == "v1"`. */
			du?: Input<boolean | undefined>

			/** Configure whether keyboard usage is enabled or not. When absent, keyboard usage is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled". */
			keyboard?: Input<string | undefined>

			/** Configure whether pasting is enabled or not. When set with "remote_only", pasting content from the user's local clipboard into isolated pages is disabled. When absent, paste is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled", "remote_only". */
			paste?: Input<string | undefined>

			/** Configure whether printing is enabled or not. When absent, printing is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled". */
			printing?: Input<string | undefined>

			/** Configure whether uploading is enabled or not. When absent, uploading is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled". */
			upload?: Input<string | undefined>

			/** Indicates which version of the browser isolation controls should apply.
Available values: "v1", "v2". */
			version?: Input<string | undefined>
		} | undefined>

		/** Enable the custom block page. */
		block_page_enabled?: Input<boolean | undefined>

		/** The text describing why this block occurred, displayed on the custom block page (if enabled). */
		block_reason?: Input<string | undefined>

		/** Set by children MSP accounts to bypass their parent's rules. */
		bypass_parent_rule?: Input<boolean | undefined>
		check_session?: Input<{

			/** Configure how fresh the session needs to be to be considered valid. */
			duration?: Input<string | undefined>

			/** Set to true to enable session enforcement. */
			enforce?: Input<boolean | undefined>
		} | undefined>
		dns_resolvers?: Input<{
			ipv4?: Input<{

				/** IPv4 address of upstream resolver. */
				ip: Input<string>

				/** A port number to use for upstream resolver. Defaults to 53 if unspecified. */
				port?: Input<number | undefined>

				/** Whether to connect to this resolver over a private network. Must be set when vnet_id is set. */
				route_through_private_network?: Input<boolean | undefined>

				/** Optionally specify a virtual network for this resolver. Uses default virtual network id if omitted. */
				vnet_id?: Input<string | undefined>
			} | undefined>
			ipv6?: Input<{

				/** IPv6 address of upstream resolver. */
				ip: Input<string>

				/** A port number to use for upstream resolver. Defaults to 53 if unspecified. */
				port?: Input<number | undefined>

				/** Whether to connect to this resolver over a private network. Must be set when vnet_id is set. */
				route_through_private_network?: Input<boolean | undefined>

				/** Optionally specify a virtual network for this resolver. Uses default virtual network id if omitted. */
				vnet_id?: Input<string | undefined>
			} | undefined>
		} | undefined>
		egress?: Input<{

			/** The IPv4 address to be used for egress. */
			ipv4?: Input<string | undefined>

			/** The fallback IPv4 address to be used for egress in the event of an error egressing with the primary IPv4. Can be '0.0.0.0' to indicate local egress via WARP IPs. */
			ipv4_fallback?: Input<string | undefined>

			/** The IPv6 range to be used for egress. */
			ipv6?: Input<string | undefined>
		} | undefined>

		/** Set to true, to ignore the category matches at CNAME domains in a response. If unchecked, the categories in this rule will be checked against all the CNAME domain categories in a response. */
		ignore_cname_category_matches?: Input<boolean | undefined>

		/** INSECURE - disable DNSSEC validation (for Allow actions). */
		insecure_disable_dnssec_validation?: Input<boolean | undefined>

		/** Set to true to enable IPs in DNS resolver category blocks. By default categories only block based on domain names. */
		ip_categories?: Input<boolean | undefined>

		/** Set to true to include IPs in DNS resolver indicator feed blocks. By default indicator feeds only block based on domain names. */
		ip_indicator_feeds?: Input<boolean | undefined>
		l4override?: Input<{

			/** IPv4 or IPv6 address. */
			ip?: Input<string | undefined>

			/** A port number to use for TCP/UDP overrides. */
			port?: Input<number | undefined>
		} | undefined>
		notification_settings?: Input<{

			/** Set notification on */
			enabled?: Input<boolean | undefined>

			/** Customize the message shown in the notification. */
			msg?: Input<string | undefined>

			/** Optional URL to direct users to additional information. If not set, the notification will open a block page. */
			support_url?: Input<string | undefined>
		} | undefined>

		/** Override matching DNS queries with a hostname. */
		override_host?: Input<string | undefined>

		/** Override matching DNS queries with an IP or set of IPs. */
		override_ips?: Input<Array<Input<string>> | undefined>
		payload_log?: Input<{

			/** Set to true to enable DLP payload logging for this rule. */
			enabled?: Input<boolean | undefined>
		} | undefined>
		quarantine?: Input<{

			/** Types of files to sandbox. */
			file_types?: Input<Array<Input<string>> | undefined>
		} | undefined>
		resolve_dns_internally?: Input<{

			/** The fallback behavior to apply when the internal DNS response code is different from 'NOERROR' or when the response data only contains CNAME records for 'A' or 'AAAA' queries.
Available values: "none", "public_dns". */
			fallback?: Input<string | undefined>

			/** The internal DNS view identifier that's passed to the internal DNS service. */
			view_id?: Input<string | undefined>
		} | undefined>

		/** Enable to send queries that match the policy to Cloudflare's default 1.1.1.1 DNS resolver. Cannot be set when 'dns_resolvers' are specified or 'resolve_dns_internally' is set. Only valid when a rule's action is set to 'resolve'. */
		resolve_dns_through_cloudflare?: Input<boolean | undefined>
		untrusted_cert?: Input<{

			/** The action performed when an untrusted certificate is seen. The default action is an error with HTTP code 526.
Available values: "pass_through", "block", "error". */
			action?: Input<string | undefined>
		} | undefined>
	} | undefined>
	schedule?: Input<{

		/** The time intervals when the rule will be active on Fridays, in increasing order from 00:00-24:00.  If this parameter is omitted, the rule will be deactivated on Fridays. */
		fri?: Input<string | undefined>

		/** The time intervals when the rule will be active on Mondays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Mondays. */
		mon?: Input<string | undefined>

		/** The time intervals when the rule will be active on Saturdays, in increasing order from 00:00-24:00.  If this parameter is omitted, the rule will be deactivated on Saturdays. */
		sat?: Input<string | undefined>

		/** The time intervals when the rule will be active on Sundays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Sundays. */
		sun?: Input<string | undefined>

		/** The time intervals when the rule will be active on Thursdays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Thursdays. */
		thu?: Input<string | undefined>

		/** The time zone the rule will be evaluated against. If a [valid time zone city name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List) is provided, Gateway will always use the current time at that time zone. If this parameter is omitted, then Gateway will use the time zone inferred from the user's source IP to evaluate the rule. If Gateway cannot determine the time zone from the IP, we will fall back to the time zone of the user's connected data center. */
		time_zone?: Input<string | undefined>

		/** The time intervals when the rule will be active on Tuesdays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Tuesdays. */
		tue?: Input<string | undefined>

		/** The time intervals when the rule will be active on Wednesdays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Wednesdays. */
		wed?: Input<string | undefined>
	} | undefined>

	/** The wirefilter expression used for traffic matching. */
	traffic?: Input<string | undefined>
}

type CloudflareZeroTrustGatewayPolicy = Readonly<{
	account_id: Output<string>

	/** The action to preform when the associated traffic, identity, and device posture expressions are either absent or evaluate to `true`.
Available values: "on", "off", "allow", "block", "scan", "noscan", "safesearch", "ytrestricted", "isolate", "noisolate", "override", "l4_override", "egress", "resolve", "quarantine". */
	action: Output<string>
	created_at: Output<string>

	/** Date of deletion, if any. */
	deleted_at: Output<string>

	/** The description of the rule. */
	description: Output<string | undefined>

	/** The wirefilter expression used for device posture check matching. */
	device_posture: Output<string | undefined>

	/** True if the rule is enabled. */
	enabled: Output<boolean | undefined>
	expiration: Output<Readonly<{

		/** The default duration a policy will be active in minutes. Must be set in order to use the `reset_expiration` endpoint on this rule. */
		duration: number

		/** Whether the policy has expired. */
		expired: boolean

		/** The time stamp at which the policy will expire and cease to be
applied.

Must adhere to RFC 3339 and include a UTC offset. Non-zero
offsets are accepted but will be converted to the equivalent
value with offset zero (UTC+00:00) and will be returned as time
stamps with offset zero denoted by a trailing 'Z'.

Policies with an expiration do not consider the timezone of
clients they are applied to, and expire "globally" at the point
given by their `expires_at` value. */
		expires_at: string
	}>>

	/** The protocol or layer to evaluate the traffic, identity, and device posture expressions. */
	filters: ReadonlyArray<string>

	/** The API resource UUID. */
	id: Output<string>

	/** The wirefilter expression used for identity matching. */
	identity: Output<string | undefined>

	/** The name of the rule. */
	name: Output<string>

	/** Precedence sets the order of your rules. Lower values indicate higher precedence. At each processing phase, applicable rules are evaluated in ascending order of this value. */
	precedence: Output<number | undefined>
	rule_settings: Output<Readonly<{

		/** Add custom headers to allowed requests, in the form of key-value pairs. Keys are header names, pointing to an array with its header value(s). */
		add_headers: Readonly<Record<string, string>>

		/** Set by parent MSP accounts to enable their children to bypass this rule. */
		allow_child_bypass: boolean
		audit_ssh: Readonly<{

			/** Enable to turn on SSH command logging. */
			command_logging?: boolean
		}>
		biso_admin_controls: Readonly<{

			/** Configure whether copy is enabled or not. When set with "remote_only", copying isolated content from the remote browser to the user's local clipboard is disabled. When absent, copy is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled", "remote_only". */
			copy?: string

			/** Set to false to enable copy-pasting. Only applies when `version == "v1"`. */
			dcp?: boolean

			/** Set to false to enable downloading. Only applies when `version == "v1"`. */
			dd?: boolean

			/** Set to false to enable keyboard usage. Only applies when `version == "v1"`. */
			dk?: boolean

			/** Configure whether downloading enabled or not. When absent, downloading is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled". */
			download?: string

			/** Set to false to enable printing. Only applies when `version == "v1"`. */
			dp?: boolean

			/** Set to false to enable uploading. Only applies when `version == "v1"`. */
			du?: boolean

			/** Configure whether keyboard usage is enabled or not. When absent, keyboard usage is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled". */
			keyboard?: string

			/** Configure whether pasting is enabled or not. When set with "remote_only", pasting content from the user's local clipboard into isolated pages is disabled. When absent, paste is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled", "remote_only". */
			paste?: string

			/** Configure whether printing is enabled or not. When absent, printing is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled". */
			printing?: string

			/** Configure whether uploading is enabled or not. When absent, uploading is enabled. Only applies when `version == "v2"`.
Available values: "enabled", "disabled". */
			upload?: string

			/** Indicates which version of the browser isolation controls should apply.
Available values: "v1", "v2". */
			version: string
		}>

		/** Enable the custom block page. */
		block_page_enabled: boolean

		/** The text describing why this block occurred, displayed on the custom block page (if enabled). */
		block_reason: string

		/** Set by children MSP accounts to bypass their parent's rules. */
		bypass_parent_rule: boolean
		check_session: Readonly<{

			/** Configure how fresh the session needs to be to be considered valid. */
			duration?: string

			/** Set to true to enable session enforcement. */
			enforce?: boolean
		}>
		dns_resolvers: Readonly<{
			ipv4: Readonly<{

				/** IPv4 address of upstream resolver. */
				ip: string

				/** A port number to use for upstream resolver. Defaults to 53 if unspecified. */
				port?: number

				/** Whether to connect to this resolver over a private network. Must be set when vnet_id is set. */
				route_through_private_network?: boolean

				/** Optionally specify a virtual network for this resolver. Uses default virtual network id if omitted. */
				vnet_id?: string
			}>
			ipv6: Readonly<{

				/** IPv6 address of upstream resolver. */
				ip: string

				/** A port number to use for upstream resolver. Defaults to 53 if unspecified. */
				port?: number

				/** Whether to connect to this resolver over a private network. Must be set when vnet_id is set. */
				route_through_private_network?: boolean

				/** Optionally specify a virtual network for this resolver. Uses default virtual network id if omitted. */
				vnet_id?: string
			}>
		}>
		egress: Readonly<{

			/** The IPv4 address to be used for egress. */
			ipv4?: string

			/** The fallback IPv4 address to be used for egress in the event of an error egressing with the primary IPv4. Can be '0.0.0.0' to indicate local egress via WARP IPs. */
			ipv4_fallback?: string

			/** The IPv6 range to be used for egress. */
			ipv6?: string
		}>

		/** Set to true, to ignore the category matches at CNAME domains in a response. If unchecked, the categories in this rule will be checked against all the CNAME domain categories in a response. */
		ignore_cname_category_matches: boolean

		/** INSECURE - disable DNSSEC validation (for Allow actions). */
		insecure_disable_dnssec_validation: boolean

		/** Set to true to enable IPs in DNS resolver category blocks. By default categories only block based on domain names. */
		ip_categories: boolean

		/** Set to true to include IPs in DNS resolver indicator feed blocks. By default indicator feeds only block based on domain names. */
		ip_indicator_feeds: boolean
		l4override: Readonly<{

			/** IPv4 or IPv6 address. */
			ip?: string

			/** A port number to use for TCP/UDP overrides. */
			port?: number
		}>
		notification_settings: Readonly<{

			/** Set notification on */
			enabled?: boolean

			/** Customize the message shown in the notification. */
			msg?: string

			/** Optional URL to direct users to additional information. If not set, the notification will open a block page. */
			support_url?: string
		}>

		/** Override matching DNS queries with a hostname. */
		override_host: string

		/** Override matching DNS queries with an IP or set of IPs. */
		override_ips: ReadonlyArray<string>
		payload_log: Readonly<{

			/** Set to true to enable DLP payload logging for this rule. */
			enabled?: boolean
		}>
		quarantine: Readonly<{

			/** Types of files to sandbox. */
			file_types?: ReadonlyArray<string>
		}>
		resolve_dns_internally: Readonly<{

			/** The fallback behavior to apply when the internal DNS response code is different from 'NOERROR' or when the response data only contains CNAME records for 'A' or 'AAAA' queries.
Available values: "none", "public_dns". */
			fallback: string

			/** The internal DNS view identifier that's passed to the internal DNS service. */
			view_id?: string
		}>

		/** Enable to send queries that match the policy to Cloudflare's default 1.1.1.1 DNS resolver. Cannot be set when 'dns_resolvers' are specified or 'resolve_dns_internally' is set. Only valid when a rule's action is set to 'resolve'. */
		resolve_dns_through_cloudflare: boolean
		untrusted_cert: Readonly<{

			/** The action performed when an untrusted certificate is seen. The default action is an error with HTTP code 526.
Available values: "pass_through", "block", "error". */
			action?: string
		}>
	}>>
	schedule: Output<Readonly<{

		/** The time intervals when the rule will be active on Fridays, in increasing order from 00:00-24:00.  If this parameter is omitted, the rule will be deactivated on Fridays. */
		fri: string

		/** The time intervals when the rule will be active on Mondays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Mondays. */
		mon: string

		/** The time intervals when the rule will be active on Saturdays, in increasing order from 00:00-24:00.  If this parameter is omitted, the rule will be deactivated on Saturdays. */
		sat: string

		/** The time intervals when the rule will be active on Sundays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Sundays. */
		sun: string

		/** The time intervals when the rule will be active on Thursdays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Thursdays. */
		thu: string

		/** The time zone the rule will be evaluated against. If a [valid time zone city name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List) is provided, Gateway will always use the current time at that time zone. If this parameter is omitted, then Gateway will use the time zone inferred from the user's source IP to evaluate the rule. If Gateway cannot determine the time zone from the IP, we will fall back to the time zone of the user's connected data center. */
		time_zone: string

		/** The time intervals when the rule will be active on Tuesdays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Tuesdays. */
		tue: string

		/** The time intervals when the rule will be active on Wednesdays, in increasing order from 00:00-24:00. If this parameter is omitted, the rule will be deactivated on Wednesdays. */
		wed: string
	}>>

	/** The wirefilter expression used for traffic matching. */
	traffic: Output<string | undefined>
	updated_at: Output<string>

	/** version number of the rule */
	version: Output<number>
}>

type CloudflareTotalTlsProps = {

	/** The Certificate Authority that Total TLS certificates will be issued through.
Available values: "google", "lets_encrypt", "ssl_com". */
	certificate_authority?: Input<string | undefined>

	/** If enabled, Total TLS will order a hostname specific TLS certificate for any proxied A, AAAA, or CNAME record in your zone. */
	enabled: Input<boolean>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareTotalTls = Readonly<{

	/** The Certificate Authority that Total TLS certificates will be issued through.
Available values: "google", "lets_encrypt", "ssl_com". */
	certificate_authority: Output<string | undefined>

	/** If enabled, Total TLS will order a hostname specific TLS certificate for any proxied A, AAAA, or CNAME record in your zone. */
	enabled: Output<boolean>

	/** Identifier */
	id: Output<string>

	/** The validity period in days for the certificates ordered via Total TLS.
Available values: 90. */
	validity_period: Output<number>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareAccountSubscriptionProps = {

	/** Identifier */
	account_id: Input<string>

	/** How often the subscription is renewed automatically.
Available values: "weekly", "monthly", "quarterly", "yearly". */
	frequency?: Input<string | undefined>
	rate_plan?: Input<{

		/** The currency applied to the rate plan subscription. */
		currency?: Input<string | undefined>

		/** Whether this rate plan is managed externally from Cloudflare. */
		externally_managed?: Input<boolean | undefined>

		/** The ID of the rate plan.
Available values: "free", "lite", "pro", "pro_plus", "business", "enterprise", "partners_free", "partners_pro", "partners_business", "partners_enterprise". */
		id?: Input<string | undefined>

		/** Whether a rate plan is enterprise-based (or newly adopted term contract). */
		is_contract?: Input<boolean | undefined>

		/** The full name of the rate plan. */
		public_name?: Input<string | undefined>

		/** The scope that this rate plan applies to. */
		scope?: Input<string | undefined>

		/** The list of sets this rate plan applies to. */
		sets?: Input<Array<Input<string>> | undefined>
	} | undefined>

	/** Subscription identifier tag. */
	subscription_identifier?: Input<string | undefined>
}

type CloudflareAccountSubscription = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The monetary unit in which pricing information is displayed. */
	currency: Output<string>

	/** The end of the current period and also when the next billing is due. */
	current_period_end: Output<string>

	/** When the current billing period started. May match initial_period_start if this is the first period. */
	current_period_start: Output<string>

	/** How often the subscription is renewed automatically.
Available values: "weekly", "monthly", "quarterly", "yearly". */
	frequency: Output<string | undefined>

	/** Subscription identifier tag. */
	id: Output<string>

	/** The price of the subscription that will be billed, in US dollars. */
	price: Output<number>
	rate_plan: Output<Readonly<{

		/** The currency applied to the rate plan subscription. */
		currency: string

		/** Whether this rate plan is managed externally from Cloudflare. */
		externally_managed: boolean

		/** The ID of the rate plan.
Available values: "free", "lite", "pro", "pro_plus", "business", "enterprise", "partners_free", "partners_pro", "partners_business", "partners_enterprise". */
		id: string

		/** Whether a rate plan is enterprise-based (or newly adopted term contract). */
		is_contract: boolean

		/** The full name of the rate plan. */
		public_name: string

		/** The scope that this rate plan applies to. */
		scope: string

		/** The list of sets this rate plan applies to. */
		sets: ReadonlyArray<string>
	}>>

	/** The state that the subscription is in.
Available values: "Trial", "Provisioned", "Paid", "AwaitingPayment", "Cancelled", "Failed", "Expired". */
	state: Output<string>

	/** Subscription identifier tag. */
	subscription_identifier: Output<string | undefined>
}>

type CloudflareByoIpPrefixProps = {

	/** Identifier of a Cloudflare account. */
	account_id: Input<string>

	/** Autonomous System Number (ASN) the prefix will be advertised under. */
	asn: Input<number>

	/** IP Prefix in Classless Inter-Domain Routing format. */
	cidr: Input<string>

	/** Description of the prefix. */
	description?: Input<string | undefined>

	/** Identifier for the uploaded LOA document. */
	loa_document_id: Input<string>
}

type CloudflareByoIpPrefix = Readonly<{

	/** Identifier of a Cloudflare account. */
	account_id: Output<string>

	/** Prefix advertisement status to the Internet. This field is only not 'null' if on demand is enabled. */
	advertised: Output<boolean>

	/** Last time the advertisement status was changed. This field is only not 'null' if on demand is enabled. */
	advertised_modified_at: Output<string>

	/** Approval state of the prefix (P = pending, V = active). */
	approved: Output<string>

	/** Autonomous System Number (ASN) the prefix will be advertised under. */
	asn: Output<number>

	/** IP Prefix in Classless Inter-Domain Routing format. */
	cidr: Output<string>
	created_at: Output<string>

	/** Description of the prefix. */
	description: Output<string | undefined>

	/** Identifier of an IP Prefix. */
	id: Output<string>

	/** Identifier for the uploaded LOA document. */
	loa_document_id: Output<string>
	modified_at: Output<string>

	/** Whether advertisement of the prefix to the Internet may be dynamically enabled or disabled. */
	on_demand_enabled: Output<boolean>

	/** Whether advertisement status of the prefix is locked, meaning it cannot be changed. */
	on_demand_locked: Output<boolean>
}>

type CloudflareApiShieldOperationSchemaValidationSettingsProps = {

	/** When set, this applies a mitigation action to this operation

  - `log` log request when request does not conform to schema for this operation
  - `block` deny access to the site when request does not conform to schema for this operation
  - `none` will skip mitigation for this operation
  - `null` indicates that no operation level mitigation is in place, see Zone Level Schema Validation Settings for mitigation action that will be applied
Available values: "log", "block", "none". */
	mitigation_action?: Input<string | undefined>

	/** UUID */
	operation_id: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareApiShieldOperationSchemaValidationSettings = Readonly<{

	/** UUID */
	id: Output<string>

	/** When set, this applies a mitigation action to this operation

  - `log` log request when request does not conform to schema for this operation
  - `block` deny access to the site when request does not conform to schema for this operation
  - `none` will skip mitigation for this operation
  - `null` indicates that no operation level mitigation is in place, see Zone Level Schema Validation Settings for mitigation action that will be applied
Available values: "log", "block", "none". */
	mitigation_action: Output<string | undefined>

	/** UUID */
	operation_id: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustAccessServiceTokenProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** The duration for how long the service token will be valid. Must be in the format `300ms` or `2h45m`. Valid time units are: ns, us (or µs), ms, s, m, h. The default is 1 year in hours (8760h). */
	duration?: Input<string | undefined>

	/** The name of the service token. */
	name: Input<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareZeroTrustAccessServiceToken = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** The Client ID for the service token. Access will check for this value in the `CF-Access-Client-ID` request header. */
	client_id: Output<string>

	/** The Client Secret for the service token. Access will check for this value in the `CF-Access-Client-Secret` request header. */
	client_secret: Output<string>
	created_at: Output<string>

	/** The duration for how long the service token will be valid. Must be in the format `300ms` or `2h45m`. Valid time units are: ns, us (or µs), ms, s, m, h. The default is 1 year in hours (8760h). */
	duration: Output<string>
	expires_at: Output<string>

	/** The ID of the service token. */
	id: Output<string>
	last_seen_at: Output<string>

	/** The name of the service token. */
	name: Output<string>
	updated_at: Output<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareZoneDnsSettingsProps = {

	/** Whether to flatten all CNAME records in the zone. Note that, due to DNS limitations, a CNAME record at the zone apex will always be flattened. */
	flatten_all_cnames?: Input<boolean | undefined>

	/** Whether to enable Foundation DNS Advanced Nameservers on the zone. */
	foundation_dns?: Input<boolean | undefined>
	internal_dns?: Input<{

		/** The ID of the zone to fallback to. */
		reference_zone_id?: Input<string | undefined>
	} | undefined>

	/** Whether to enable multi-provider DNS, which causes Cloudflare to activate the zone even when non-Cloudflare NS records exist, and to respect NS records at the zone apex during outbound zone transfers. */
	multi_provider?: Input<boolean | undefined>
	nameservers?: Input<{

		/** Configured nameserver set to be used for this zone */
		ns_set?: Input<number | undefined>

		/** Nameserver type
Available values: "cloudflare.standard", "custom.account", "custom.tenant", "custom.zone". */
		type: Input<string>
	} | undefined>

	/** The time to live (TTL) of the zone's nameserver (NS) records. */
	ns_ttl?: Input<number | undefined>

	/** Allows a Secondary DNS zone to use (proxied) override records and CNAME flattening at the zone apex. */
	secondary_overrides?: Input<boolean | undefined>
	soa?: Input<{

		/** Time in seconds of being unable to query the primary server after which secondary servers should stop serving the zone. */
		expire: Input<number>

		/** The time to live (TTL) for negative caching of records within the zone. */
		min_ttl: Input<number>

		/** The primary nameserver, which may be used for outbound zone transfers. */
		mname: Input<string>

		/** Time in seconds after which secondary servers should re-check the SOA record to see if the zone has been updated. */
		refresh: Input<number>

		/** Time in seconds after which secondary servers should retry queries after the primary server was unresponsive. */
		retry: Input<number>

		/** The email address of the zone administrator, with the first label representing the local part of the email address. */
		rname: Input<string>

		/** The time to live (TTL) of the SOA record itself. */
		ttl: Input<number>
	} | undefined>

	/** Identifier */
	zone_id: Input<string>

	/** Whether the zone mode is a regular or CDN/DNS only zone.
Available values: "standard", "cdn_only", "dns_only". */
	zone_mode?: Input<string | undefined>
}

type CloudflareZoneDnsSettings = Readonly<{

	/** Whether to flatten all CNAME records in the zone. Note that, due to DNS limitations, a CNAME record at the zone apex will always be flattened. */
	flatten_all_cnames: Output<boolean | undefined>

	/** Whether to enable Foundation DNS Advanced Nameservers on the zone. */
	foundation_dns: Output<boolean | undefined>
	internal_dns: Output<Readonly<{

		/** The ID of the zone to fallback to. */
		reference_zone_id: string
	}>>

	/** Whether to enable multi-provider DNS, which causes Cloudflare to activate the zone even when non-Cloudflare NS records exist, and to respect NS records at the zone apex during outbound zone transfers. */
	multi_provider: Output<boolean | undefined>
	nameservers: Output<Readonly<{

		/** Configured nameserver set to be used for this zone */
		ns_set: number

		/** Nameserver type
Available values: "cloudflare.standard", "custom.account", "custom.tenant", "custom.zone". */
		type: string
	}>>

	/** The time to live (TTL) of the zone's nameserver (NS) records. */
	ns_ttl: Output<number | undefined>

	/** Allows a Secondary DNS zone to use (proxied) override records and CNAME flattening at the zone apex. */
	secondary_overrides: Output<boolean | undefined>
	soa: Output<Readonly<{

		/** Time in seconds of being unable to query the primary server after which secondary servers should stop serving the zone. */
		expire: number

		/** The time to live (TTL) for negative caching of records within the zone. */
		min_ttl: number

		/** The primary nameserver, which may be used for outbound zone transfers. */
		mname: string

		/** Time in seconds after which secondary servers should re-check the SOA record to see if the zone has been updated. */
		refresh: number

		/** Time in seconds after which secondary servers should retry queries after the primary server was unresponsive. */
		retry: number

		/** The email address of the zone administrator, with the first label representing the local part of the email address. */
		rname: string

		/** The time to live (TTL) of the SOA record itself. */
		ttl: number
	}>>

	/** Identifier */
	zone_id: Output<string>

	/** Whether the zone mode is a regular or CDN/DNS only zone.
Available values: "standard", "cdn_only", "dns_only". */
	zone_mode: Output<string | undefined>
}>

type CloudflarePagesProjectProps = {

	/** Identifier */
	account_id: Input<string>
	build_config?: Input<{

		/** Enable build caching for the project. */
		build_caching?: Input<boolean | undefined>

		/** Command used to build project. */
		build_command?: Input<string | undefined>

		/** Output directory of the build. */
		destination_dir?: Input<string | undefined>

		/** Directory to run the command. */
		root_dir?: Input<string | undefined>

		/** The classifying tag for analytics. */
		web_analytics_tag?: Input<string | undefined>

		/** The auth token for analytics. */
		web_analytics_token?: Input<string | undefined>
	} | undefined>
	deployment_configs?: Input<{
		preview?: Input<{
			ai_bindings?: Input<{
				project_id?: Input<string | undefined>
			} | undefined>
			analytics_engine_datasets?: Input<{

				/** Name of the dataset. */
				dataset?: Input<string | undefined>
			} | undefined>
			browsers?: Input<{

			} | undefined>

			/** Compatibility date used for Pages Functions. */
			compatibility_date?: Input<string | undefined>

			/** Compatibility flags used for Pages Functions. */
			compatibility_flags?: Input<Array<Input<string>> | undefined>
			d1_databases?: Input<{

				/** UUID of the D1 database. */
				id?: Input<string | undefined>
			} | undefined>
			durable_object_namespaces?: Input<{

				/** ID of the Durable Object namespace. */
				namespace_id?: Input<string | undefined>
			} | undefined>
			env_vars?: Input<{

				/** Available values: "plain_text". */
				type: Input<string>

				/** Environment variable value. */
				value: Input<string>
			} | undefined>
			hyperdrive_bindings?: Input<{
				id?: Input<string | undefined>
			} | undefined>
			kv_namespaces?: Input<{

				/** ID of the KV namespace. */
				namespace_id?: Input<string | undefined>
			} | undefined>
			mtls_certificates?: Input<{
				certificate_id?: Input<string | undefined>
			} | undefined>
			placement?: Input<{

				/** Placement mode. */
				mode?: Input<string | undefined>
			} | undefined>
			queue_producers?: Input<{

				/** Name of the Queue. */
				name?: Input<string | undefined>
			} | undefined>
			r2_buckets?: Input<{

				/** Jurisdiction of the R2 bucket. */
				jurisdiction?: Input<string | undefined>

				/** Name of the R2 bucket. */
				name?: Input<string | undefined>
			} | undefined>
			services?: Input<{

				/** The entrypoint to bind to. */
				entrypoint?: Input<string | undefined>

				/** The Service environment. */
				environment?: Input<string | undefined>

				/** The Service name. */
				service?: Input<string | undefined>
			} | undefined>
			vectorize_bindings?: Input<{
				index_name?: Input<string | undefined>
			} | undefined>
		} | undefined>
		production?: Input<{
			ai_bindings?: Input<{
				project_id?: Input<string | undefined>
			} | undefined>
			analytics_engine_datasets?: Input<{

				/** Name of the dataset. */
				dataset?: Input<string | undefined>
			} | undefined>
			browsers?: Input<{

			} | undefined>

			/** Compatibility date used for Pages Functions. */
			compatibility_date?: Input<string | undefined>

			/** Compatibility flags used for Pages Functions. */
			compatibility_flags?: Input<Array<Input<string>> | undefined>
			d1_databases?: Input<{

				/** UUID of the D1 database. */
				id?: Input<string | undefined>
			} | undefined>
			durable_object_namespaces?: Input<{

				/** ID of the Durable Object namespace. */
				namespace_id?: Input<string | undefined>
			} | undefined>
			env_vars?: Input<{

				/** Available values: "plain_text". */
				type: Input<string>

				/** Environment variable value. */
				value: Input<string>
			} | undefined>
			hyperdrive_bindings?: Input<{
				id?: Input<string | undefined>
			} | undefined>
			kv_namespaces?: Input<{

				/** ID of the KV namespace. */
				namespace_id?: Input<string | undefined>
			} | undefined>
			mtls_certificates?: Input<{
				certificate_id?: Input<string | undefined>
			} | undefined>
			placement?: Input<{

				/** Placement mode. */
				mode?: Input<string | undefined>
			} | undefined>
			queue_producers?: Input<{

				/** Name of the Queue. */
				name?: Input<string | undefined>
			} | undefined>
			r2_buckets?: Input<{

				/** Jurisdiction of the R2 bucket. */
				jurisdiction?: Input<string | undefined>

				/** Name of the R2 bucket. */
				name?: Input<string | undefined>
			} | undefined>
			services?: Input<{

				/** The entrypoint to bind to. */
				entrypoint?: Input<string | undefined>

				/** The Service environment. */
				environment?: Input<string | undefined>

				/** The Service name. */
				service?: Input<string | undefined>
			} | undefined>
			vectorize_bindings?: Input<{
				index_name?: Input<string | undefined>
			} | undefined>
		} | undefined>
	} | undefined>

	/** Name of the project. */
	name: Input<string>

	/** Production branch of the project. Used to identify production deployments. */
	production_branch?: Input<string | undefined>
}

type CloudflarePagesProject = Readonly<{

	/** Identifier */
	account_id: Output<string>
	build_config: Output<Readonly<{

		/** Enable build caching for the project. */
		build_caching: boolean

		/** Command used to build project. */
		build_command: string

		/** Output directory of the build. */
		destination_dir: string

		/** Directory to run the command. */
		root_dir: string

		/** The classifying tag for analytics. */
		web_analytics_tag: string

		/** The auth token for analytics. */
		web_analytics_token: string
	}>>
	canonical_deployment: Output<Readonly<{

		/** A list of alias URLs pointing to this deployment. */
		aliases: ReadonlyArray<string>
		build_config: Readonly<{

			/** Enable build caching for the project. */
			build_caching: boolean

			/** Command used to build project. */
			build_command: string

			/** Output directory of the build. */
			destination_dir: string

			/** Directory to run the command. */
			root_dir: string

			/** The classifying tag for analytics. */
			web_analytics_tag: string

			/** The auth token for analytics. */
			web_analytics_token: string
		}>

		/** When the deployment was created. */
		created_on: string
		deployment_trigger: Readonly<{
			metadata: Readonly<{

				/** Where the trigger happened. */
				branch: string

				/** Hash of the deployment trigger commit. */
				commit_hash: string

				/** Message of the deployment trigger commit. */
				commit_message: string
			}>

			/** What caused the deployment.
Available values: "push", "ad_hoc". */
			type: string
		}>
		env_vars: Readonly<{

			/** Available values: "plain_text". */
			type: string

			/** Environment variable value. */
			value: string
		}>

		/** Type of deploy.
Available values: "preview", "production". */
		environment: string

		/** Id of the deployment. */
		id: string

		/** If the deployment has been skipped. */
		is_skipped: boolean
		latest_stage: Readonly<{

			/** When the stage ended. */
			ended_on: string

			/** The current build stage.
Available values: "queued", "initialize", "clone_repo", "build", "deploy". */
			name: string

			/** When the stage started. */
			started_on: string

			/** State of the current stage.
Available values: "success", "idle", "active", "failure", "canceled". */
			status: string
		}>

		/** When the deployment was last modified. */
		modified_on: string

		/** Id of the project. */
		project_id: string

		/** Name of the project. */
		project_name: string

		/** Short Id (8 character) of the deployment. */
		short_id: string
		source: Readonly<{
			config: Readonly<{
				deployments_enabled: boolean
				owner: string
				path_excludes: ReadonlyArray<string>
				path_includes: ReadonlyArray<string>
				pr_comments_enabled: boolean
				preview_branch_excludes: ReadonlyArray<string>
				preview_branch_includes: ReadonlyArray<string>

				/** Available values: "all", "none", "custom". */
				preview_deployment_setting: string
				production_branch: string
				production_deployments_enabled: boolean
				repo_name: string
			}>
			type: string
		}>
		stages: Readonly<{

			/** When the stage ended. */
			ended_on: string

			/** The current build stage.
Available values: "queued", "initialize", "clone_repo", "build", "deploy". */
			name: string

			/** When the stage started. */
			started_on: string

			/** State of the current stage.
Available values: "success", "idle", "active", "failure", "canceled". */
			status: string
		}>

		/** The live URL to view this deployment. */
		url: string
	}>>

	/** When the project was created. */
	created_on: Output<string>
	deployment_configs: Output<Readonly<{
		preview: Readonly<{
			ai_bindings: Readonly<{
				project_id?: string
			}>
			analytics_engine_datasets: Readonly<{

				/** Name of the dataset. */
				dataset?: string
			}>
			browsers?: Readonly<{

			}>

			/** Compatibility date used for Pages Functions. */
			compatibility_date?: string

			/** Compatibility flags used for Pages Functions. */
			compatibility_flags?: ReadonlyArray<string>
			d1_databases: Readonly<{

				/** UUID of the D1 database. */
				id?: string
			}>
			durable_object_namespaces: Readonly<{

				/** ID of the Durable Object namespace. */
				namespace_id?: string
			}>
			env_vars: Readonly<{

				/** Available values: "plain_text". */
				type: string

				/** Environment variable value. */
				value: string
			}>
			hyperdrive_bindings: Readonly<{
				id?: string
			}>
			kv_namespaces: Readonly<{

				/** ID of the KV namespace. */
				namespace_id?: string
			}>
			mtls_certificates: Readonly<{
				certificate_id?: string
			}>
			placement: Readonly<{

				/** Placement mode. */
				mode?: string
			}>
			queue_producers: Readonly<{

				/** Name of the Queue. */
				name?: string
			}>
			r2_buckets: Readonly<{

				/** Jurisdiction of the R2 bucket. */
				jurisdiction?: string

				/** Name of the R2 bucket. */
				name?: string
			}>
			services: Readonly<{

				/** The entrypoint to bind to. */
				entrypoint?: string

				/** The Service environment. */
				environment?: string

				/** The Service name. */
				service?: string
			}>
			vectorize_bindings: Readonly<{
				index_name?: string
			}>
		}>
		production: Readonly<{
			ai_bindings: Readonly<{
				project_id?: string
			}>
			analytics_engine_datasets: Readonly<{

				/** Name of the dataset. */
				dataset?: string
			}>
			browsers?: Readonly<{

			}>

			/** Compatibility date used for Pages Functions. */
			compatibility_date?: string

			/** Compatibility flags used for Pages Functions. */
			compatibility_flags?: ReadonlyArray<string>
			d1_databases: Readonly<{

				/** UUID of the D1 database. */
				id?: string
			}>
			durable_object_namespaces: Readonly<{

				/** ID of the Durable Object namespace. */
				namespace_id?: string
			}>
			env_vars: Readonly<{

				/** Available values: "plain_text". */
				type: string

				/** Environment variable value. */
				value: string
			}>
			hyperdrive_bindings: Readonly<{
				id?: string
			}>
			kv_namespaces: Readonly<{

				/** ID of the KV namespace. */
				namespace_id?: string
			}>
			mtls_certificates: Readonly<{
				certificate_id?: string
			}>
			placement: Readonly<{

				/** Placement mode. */
				mode?: string
			}>
			queue_producers: Readonly<{

				/** Name of the Queue. */
				name?: string
			}>
			r2_buckets: Readonly<{

				/** Jurisdiction of the R2 bucket. */
				jurisdiction?: string

				/** Name of the R2 bucket. */
				name?: string
			}>
			services: Readonly<{

				/** The entrypoint to bind to. */
				entrypoint?: string

				/** The Service environment. */
				environment?: string

				/** The Service name. */
				service?: string
			}>
			vectorize_bindings: Readonly<{
				index_name?: string
			}>
		}>
	}>>

	/** A list of associated custom domains for the project. */
	domains: ReadonlyArray<string>

	/** Name of the project. */
	id: Output<string>
	latest_deployment: Output<Readonly<{

		/** A list of alias URLs pointing to this deployment. */
		aliases: ReadonlyArray<string>
		build_config: Readonly<{

			/** Enable build caching for the project. */
			build_caching: boolean

			/** Command used to build project. */
			build_command: string

			/** Output directory of the build. */
			destination_dir: string

			/** Directory to run the command. */
			root_dir: string

			/** The classifying tag for analytics. */
			web_analytics_tag: string

			/** The auth token for analytics. */
			web_analytics_token: string
		}>

		/** When the deployment was created. */
		created_on: string
		deployment_trigger: Readonly<{
			metadata: Readonly<{

				/** Where the trigger happened. */
				branch: string

				/** Hash of the deployment trigger commit. */
				commit_hash: string

				/** Message of the deployment trigger commit. */
				commit_message: string
			}>

			/** What caused the deployment.
Available values: "push", "ad_hoc". */
			type: string
		}>
		env_vars: Readonly<{

			/** Available values: "plain_text". */
			type: string

			/** Environment variable value. */
			value: string
		}>

		/** Type of deploy.
Available values: "preview", "production". */
		environment: string

		/** Id of the deployment. */
		id: string

		/** If the deployment has been skipped. */
		is_skipped: boolean
		latest_stage: Readonly<{

			/** When the stage ended. */
			ended_on: string

			/** The current build stage.
Available values: "queued", "initialize", "clone_repo", "build", "deploy". */
			name: string

			/** When the stage started. */
			started_on: string

			/** State of the current stage.
Available values: "success", "idle", "active", "failure", "canceled". */
			status: string
		}>

		/** When the deployment was last modified. */
		modified_on: string

		/** Id of the project. */
		project_id: string

		/** Name of the project. */
		project_name: string

		/** Short Id (8 character) of the deployment. */
		short_id: string
		source: Readonly<{
			config: Readonly<{
				deployments_enabled: boolean
				owner: string
				path_excludes: ReadonlyArray<string>
				path_includes: ReadonlyArray<string>
				pr_comments_enabled: boolean
				preview_branch_excludes: ReadonlyArray<string>
				preview_branch_includes: ReadonlyArray<string>

				/** Available values: "all", "none", "custom". */
				preview_deployment_setting: string
				production_branch: string
				production_deployments_enabled: boolean
				repo_name: string
			}>
			type: string
		}>
		stages: Readonly<{

			/** When the stage ended. */
			ended_on: string

			/** The current build stage.
Available values: "queued", "initialize", "clone_repo", "build", "deploy". */
			name: string

			/** When the stage started. */
			started_on: string

			/** State of the current stage.
Available values: "success", "idle", "active", "failure", "canceled". */
			status: string
		}>

		/** The live URL to view this deployment. */
		url: string
	}>>

	/** Name of the project. */
	name: Output<string>

	/** Production branch of the project. Used to identify production deployments. */
	production_branch: Output<string | undefined>
	source: Output<Readonly<{
		config: Readonly<{
			deployments_enabled: boolean
			owner: string
			path_excludes: ReadonlyArray<string>
			path_includes: ReadonlyArray<string>
			pr_comments_enabled: boolean
			preview_branch_excludes: ReadonlyArray<string>
			preview_branch_includes: ReadonlyArray<string>

			/** Available values: "all", "none", "custom". */
			preview_deployment_setting: string
			production_branch: string
			production_deployments_enabled: boolean
			repo_name: string
		}>
		type: string
	}>>

	/** The Cloudflare subdomain associated with the project. */
	subdomain: Output<string>
}>

type CloudflareAccountProps = {

	/** Account name */
	name: Input<string>
	settings?: Input<{

		/** Sets an abuse contact email to notify for abuse reports. */
		abuse_contact_email?: Input<string | undefined>

		/** Specifies the default nameservers to be used for new zones added to this account.

- `cloudflare.standard` for Cloudflare-branded nameservers
- `custom.account` for account custom nameservers
- `custom.tenant` for tenant custom nameservers

See [Custom Nameservers](https://developers.cloudflare.com/dns/additional-options/custom-nameservers/)
for more information.

Deprecated in favor of [DNS Settings](https://developers.cloudflare.com/api/operations/dns-settings-for-an-account-update-dns-settings).
Available values: "cloudflare.standard", "custom.account", "custom.tenant". */
		default_nameservers?: Input<string | undefined>

		/** Indicates whether membership in this account requires that
Two-Factor Authentication is enabled */
		enforce_twofactor?: Input<boolean | undefined>

		/** Indicates whether new zones should use the account-level custom
nameservers by default.

Deprecated in favor of [DNS Settings](https://developers.cloudflare.com/api/operations/dns-settings-for-an-account-update-dns-settings). */
		use_account_custom_ns_by_default?: Input<boolean | undefined>
	} | undefined>

	/** the type of account being created. For self-serve customers, use standard. for enterprise customers, use enterprise.
Available values: "standard", "enterprise". */
	type: Input<string>
	unit?: Input<{

		/** Tenant unit ID */
		id?: Input<string | undefined>
	} | undefined>
}

type CloudflareAccount = Readonly<{

	/** Timestamp for the creation of the account */
	created_on: Output<string>

	/** Identifier */
	id: Output<string>

	/** Account name */
	name: Output<string>
	settings: Output<Readonly<{

		/** Sets an abuse contact email to notify for abuse reports. */
		abuse_contact_email: string

		/** Specifies the default nameservers to be used for new zones added to this account.

- `cloudflare.standard` for Cloudflare-branded nameservers
- `custom.account` for account custom nameservers
- `custom.tenant` for tenant custom nameservers

See [Custom Nameservers](https://developers.cloudflare.com/dns/additional-options/custom-nameservers/)
for more information.

Deprecated in favor of [DNS Settings](https://developers.cloudflare.com/api/operations/dns-settings-for-an-account-update-dns-settings).
Available values: "cloudflare.standard", "custom.account", "custom.tenant". */
		default_nameservers: string

		/** Indicates whether membership in this account requires that
Two-Factor Authentication is enabled */
		enforce_twofactor: boolean

		/** Indicates whether new zones should use the account-level custom
nameservers by default.

Deprecated in favor of [DNS Settings](https://developers.cloudflare.com/api/operations/dns-settings-for-an-account-update-dns-settings). */
		use_account_custom_ns_by_default: boolean
	}>>

	/** the type of account being created. For self-serve customers, use standard. for enterprise customers, use enterprise.
Available values: "standard", "enterprise". */
	type: Output<string>
	unit: Output<Readonly<{

		/** Tenant unit ID */
		id: string
	}>>
}>

type CloudflareMagicTransitSiteProps = {

	/** Identifier */
	account_id: Input<string>

	/** Magic Connector identifier tag. */
	connector_id?: Input<string | undefined>
	description?: Input<string | undefined>

	/** Site high availability mode. If set to true, the site can have two connectors and runs in high availability mode. */
	ha_mode?: Input<boolean | undefined>
	location?: Input<{

		/** Latitude */
		lat?: Input<string | undefined>

		/** Longitude */
		lon?: Input<string | undefined>
	} | undefined>

	/** The name of the site. */
	name: Input<string>

	/** Magic Connector identifier tag. Used when high availability mode is on. */
	secondary_connector_id?: Input<string | undefined>
}

type CloudflareMagicTransitSite = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Magic Connector identifier tag. */
	connector_id: Output<string | undefined>
	description: Output<string | undefined>

	/** Site high availability mode. If set to true, the site can have two connectors and runs in high availability mode. */
	ha_mode: Output<boolean | undefined>

	/** Identifier */
	id: Output<string>
	location: Output<Readonly<{

		/** Latitude */
		lat: string

		/** Longitude */
		lon: string
	}>>

	/** The name of the site. */
	name: Output<string>

	/** Magic Connector identifier tag. Used when high availability mode is on. */
	secondary_connector_id: Output<string | undefined>
}>

type CloudflareListProps = {

	/** Identifier */
	account_id: Input<string>

	/** An informative summary of the list. */
	description?: Input<string | undefined>

	/** The type of the list. Each type supports specific list items (IP addresses, ASNs, hostnames or redirects).
Available values: "ip", "redirect", "hostname", "asn". */
	kind: Input<string>

	/** An informative name for the list. Use this name in filter and rule expressions. */
	name: Input<string>
}

type CloudflareList = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** The RFC 3339 timestamp of when the list was created. */
	created_on: Output<string>

	/** An informative summary of the list. */
	description: Output<string | undefined>

	/** The unique ID of the list. */
	id: Output<string>

	/** The type of the list. Each type supports specific list items (IP addresses, ASNs, hostnames or redirects).
Available values: "ip", "redirect", "hostname", "asn". */
	kind: Output<string>

	/** The RFC 3339 timestamp of when the list was last modified. */
	modified_on: Output<string>

	/** An informative name for the list. Use this name in filter and rule expressions. */
	name: Output<string>

	/** The number of items in the list. */
	num_items: Output<number>

	/** The number of [filters](/operations/filters-list-filters) referencing the list. */
	num_referencing_filters: Output<number>
}>

type CloudflareWorkersScriptSubdomainProps = {

	/** Identifier */
	account_id: Input<string>

	/** Whether the Worker should be available on the workers.dev subdomain. */
	enabled: Input<boolean>

	/** Whether the Worker's Preview URLs should be available on the workers.dev subdomain. */
	previews_enabled?: Input<boolean | undefined>

	/** Name of the script, used in URLs and route configuration. */
	script_name: Input<string>
}

type CloudflareWorkersScriptSubdomain = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Whether the Worker should be available on the workers.dev subdomain. */
	enabled: Output<boolean>

	/** Whether the Worker's Preview URLs should be available on the workers.dev subdomain. */
	previews_enabled: Output<boolean | undefined>

	/** Name of the script, used in URLs and route configuration. */
	script_name: Output<string>
}>

type CloudflareBotManagementProps = {

	/** Enable rule to block AI Scrapers and Crawlers.
Available values: "block", "disabled". */
	ai_bots_protection?: Input<string | undefined>

	/** Automatically update to the newest bot detection models created by Cloudflare as they are released. [Learn more.](https://developers.cloudflare.com/bots/reference/machine-learning-models#model-versions-and-release-notes) */
	auto_update_model?: Input<boolean | undefined>

	/** Enable rule to punish AI Scrapers and Crawlers via a link maze.
Available values: "enabled", "disabled". */
	crawler_protection?: Input<string | undefined>

	/** Use lightweight, invisible JavaScript detections to improve Bot Management. [Learn more about JavaScript Detections](https://developers.cloudflare.com/bots/reference/javascript-detections/). */
	enable_js?: Input<boolean | undefined>

	/** Whether to enable Bot Fight Mode. */
	fight_mode?: Input<boolean | undefined>

	/** Whether to optimize Super Bot Fight Mode protections for Wordpress. */
	optimize_wordpress?: Input<boolean | undefined>

	/** Super Bot Fight Mode (SBFM) action to take on definitely automated requests.
Available values: "allow", "block", "managed_challenge". */
	sbfm_definitely_automated?: Input<string | undefined>

	/** Super Bot Fight Mode (SBFM) action to take on likely automated requests.
Available values: "allow", "block", "managed_challenge". */
	sbfm_likely_automated?: Input<string | undefined>

	/** Super Bot Fight Mode (SBFM) to enable static resource protection.
Enable if static resources on your application need bot protection.
Note: Static resource protection can also result in legitimate traffic being blocked. */
	sbfm_static_resource_protection?: Input<boolean | undefined>

	/** Super Bot Fight Mode (SBFM) action to take on verified bots requests.
Available values: "allow", "block". */
	sbfm_verified_bots?: Input<string | undefined>

	/** Whether to disable tracking the highest bot score for a session in the Bot Management cookie. */
	suppress_session_score?: Input<boolean | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareBotManagement = Readonly<{

	/** Enable rule to block AI Scrapers and Crawlers.
Available values: "block", "disabled". */
	ai_bots_protection: Output<string | undefined>

	/** Automatically update to the newest bot detection models created by Cloudflare as they are released. [Learn more.](https://developers.cloudflare.com/bots/reference/machine-learning-models#model-versions-and-release-notes) */
	auto_update_model: Output<boolean | undefined>

	/** Enable rule to punish AI Scrapers and Crawlers via a link maze.
Available values: "enabled", "disabled". */
	crawler_protection: Output<string | undefined>

	/** Use lightweight, invisible JavaScript detections to improve Bot Management. [Learn more about JavaScript Detections](https://developers.cloudflare.com/bots/reference/javascript-detections/). */
	enable_js: Output<boolean | undefined>

	/** Whether to enable Bot Fight Mode. */
	fight_mode: Output<boolean | undefined>

	/** Identifier */
	id: Output<string>

	/** Whether to optimize Super Bot Fight Mode protections for Wordpress. */
	optimize_wordpress: Output<boolean | undefined>

	/** Super Bot Fight Mode (SBFM) action to take on definitely automated requests.
Available values: "allow", "block", "managed_challenge". */
	sbfm_definitely_automated: Output<string | undefined>

	/** Super Bot Fight Mode (SBFM) action to take on likely automated requests.
Available values: "allow", "block", "managed_challenge". */
	sbfm_likely_automated: Output<string | undefined>

	/** Super Bot Fight Mode (SBFM) to enable static resource protection.
Enable if static resources on your application need bot protection.
Note: Static resource protection can also result in legitimate traffic being blocked. */
	sbfm_static_resource_protection: Output<boolean | undefined>

	/** Super Bot Fight Mode (SBFM) action to take on verified bots requests.
Available values: "allow", "block". */
	sbfm_verified_bots: Output<string | undefined>
	stale_zone_configuration: Output<Readonly<{

		/** Indicates that the zone's Bot Fight Mode is turned on. */
		fight_mode: boolean

		/** Indicates that the zone's wordpress optimization for SBFM is turned on. */
		optimize_wordpress: boolean

		/** Indicates that the zone's definitely automated requests are being blocked or challenged. */
		sbfm_definitely_automated: string

		/** Indicates that the zone's likely automated requests are being blocked or challenged. */
		sbfm_likely_automated: string

		/** Indicates that the zone's static resource protection is turned on. */
		sbfm_static_resource_protection: string

		/** Indicates that the zone's verified bot requests are being blocked. */
		sbfm_verified_bots: string

		/** Indicates that the zone's session score tracking is disabled. */
		suppress_session_score: boolean
	}>>

	/** Whether to disable tracking the highest bot score for a session in the Bot Management cookie. */
	suppress_session_score: Output<boolean>

	/** A read-only field that indicates whether the zone currently is running the latest ML model. */
	using_latest_model: Output<boolean>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustTunnelCloudflaredConfigProps = {

	/** Identifier */
	account_id: Input<string>
	config?: Input<{
		ingress?: Input<{

			/** Public hostname for this service. */
			hostname?: Input<string | undefined>
			origin_request?: Input<{
				access?: Input<{

					/** Access applications that are allowed to reach this hostname for this Tunnel. Audience tags can be identified in the dashboard or via the List Access policies API. */
					aud_tag: Input<Array<Input<string>>>

					/** Deny traffic that has not fulfilled Access authorization. */
					required?: Input<boolean | undefined>
					team_name?: Input<string | undefined>
				} | undefined>

				/** Path to the certificate authority (CA) for the certificate of your origin. This option should be used only if your certificate is not signed by Cloudflare. */
				ca_pool?: Input<string | undefined>

				/** Timeout for establishing a new TCP connection to your origin server. This excludes the time taken to establish TLS, which is controlled by tlsTimeout. */
				connect_timeout?: Input<number | undefined>

				/** Disables chunked transfer encoding. Useful if you are running a WSGI server. */
				disable_chunked_encoding?: Input<boolean | undefined>

				/** Attempt to connect to origin using HTTP2. Origin must be configured as https. */
				http2_origin?: Input<boolean | undefined>

				/** Sets the HTTP Host header on requests sent to the local service. */
				http_host_header?: Input<string | undefined>

				/** Maximum number of idle keepalive connections between Tunnel and your origin. This does not restrict the total number of concurrent connections. */
				keep_alive_connections?: Input<number | undefined>

				/** Timeout after which an idle keepalive connection can be discarded. */
				keep_alive_timeout?: Input<number | undefined>

				/** Disable the “happy eyeballs” algorithm for IPv4/IPv6 fallback if your local network has misconfigured one of the protocols. */
				no_happy_eyeballs?: Input<boolean | undefined>

				/** Disables TLS verification of the certificate presented by your origin. Will allow any certificate from the origin to be accepted. */
				no_tls_verify?: Input<boolean | undefined>

				/** Hostname that cloudflared should expect from your origin server certificate. */
				origin_server_name?: Input<string | undefined>

				/** cloudflared starts a proxy server to translate HTTP traffic into TCP when proxying, for example, SSH or RDP. This configures what type of proxy will be started. Valid options are: "" for the regular proxy and "socks" for a SOCKS5 proxy. */
				proxy_type?: Input<string | undefined>

				/** The timeout after which a TCP keepalive packet is sent on a connection between Tunnel and the origin server. */
				tcp_keep_alive?: Input<number | undefined>

				/** Timeout for completing a TLS handshake to your origin server, if you have chosen to connect Tunnel to an HTTPS server. */
				tls_timeout?: Input<number | undefined>
			} | undefined>

			/** Requests with this path route to this public hostname. */
			path?: Input<string | undefined>

			/** Protocol and address of destination server. Supported protocols: http://, https://, unix://, tcp://, ssh://, rdp://, unix+tls://, smb://. Alternatively can return a HTTP status code http_status:[code] e.g. 'http_status:404'. */
			service: Input<string>
		} | undefined>
		origin_request?: Input<{
			access?: Input<{

				/** Access applications that are allowed to reach this hostname for this Tunnel. Audience tags can be identified in the dashboard or via the List Access policies API. */
				aud_tag: Input<Array<Input<string>>>

				/** Deny traffic that has not fulfilled Access authorization. */
				required?: Input<boolean | undefined>
				team_name?: Input<string | undefined>
			} | undefined>

			/** Path to the certificate authority (CA) for the certificate of your origin. This option should be used only if your certificate is not signed by Cloudflare. */
			ca_pool?: Input<string | undefined>

			/** Timeout for establishing a new TCP connection to your origin server. This excludes the time taken to establish TLS, which is controlled by tlsTimeout. */
			connect_timeout?: Input<number | undefined>

			/** Disables chunked transfer encoding. Useful if you are running a WSGI server. */
			disable_chunked_encoding?: Input<boolean | undefined>

			/** Attempt to connect to origin using HTTP2. Origin must be configured as https. */
			http2_origin?: Input<boolean | undefined>

			/** Sets the HTTP Host header on requests sent to the local service. */
			http_host_header?: Input<string | undefined>

			/** Maximum number of idle keepalive connections between Tunnel and your origin. This does not restrict the total number of concurrent connections. */
			keep_alive_connections?: Input<number | undefined>

			/** Timeout after which an idle keepalive connection can be discarded. */
			keep_alive_timeout?: Input<number | undefined>

			/** Disable the “happy eyeballs” algorithm for IPv4/IPv6 fallback if your local network has misconfigured one of the protocols. */
			no_happy_eyeballs?: Input<boolean | undefined>

			/** Disables TLS verification of the certificate presented by your origin. Will allow any certificate from the origin to be accepted. */
			no_tls_verify?: Input<boolean | undefined>

			/** Hostname that cloudflared should expect from your origin server certificate. */
			origin_server_name?: Input<string | undefined>

			/** cloudflared starts a proxy server to translate HTTP traffic into TCP when proxying, for example, SSH or RDP. This configures what type of proxy will be started. Valid options are: "" for the regular proxy and "socks" for a SOCKS5 proxy. */
			proxy_type?: Input<string | undefined>

			/** The timeout after which a TCP keepalive packet is sent on a connection between Tunnel and the origin server. */
			tcp_keep_alive?: Input<number | undefined>

			/** Timeout for completing a TLS handshake to your origin server, if you have chosen to connect Tunnel to an HTTPS server. */
			tls_timeout?: Input<number | undefined>
		} | undefined>
		warp_routing?: Input<{
			enabled?: Input<boolean | undefined>
		} | undefined>
	} | undefined>

	/** Indicates if this is a locally or remotely configured tunnel. If `local`, manage the tunnel using a YAML file on the origin machine. If `cloudflare`, manage the tunnel's configuration on the Zero Trust dashboard.
Available values: "local", "cloudflare". */
	source?: Input<string | undefined>

	/** UUID of the tunnel. */
	tunnel_id: Input<string>
}

type CloudflareZeroTrustTunnelCloudflaredConfig = Readonly<{

	/** Identifier */
	account_id: Output<string>
	config: Output<Readonly<{
		ingress: Readonly<{

			/** Public hostname for this service. */
			hostname?: string
			origin_request: Readonly<{
				access: Readonly<{

					/** Access applications that are allowed to reach this hostname for this Tunnel. Audience tags can be identified in the dashboard or via the List Access policies API. */
					aud_tag: ReadonlyArray<string>

					/** Deny traffic that has not fulfilled Access authorization. */
					required: boolean
					team_name: string
				}>

				/** Path to the certificate authority (CA) for the certificate of your origin. This option should be used only if your certificate is not signed by Cloudflare. */
				ca_pool: string

				/** Timeout for establishing a new TCP connection to your origin server. This excludes the time taken to establish TLS, which is controlled by tlsTimeout. */
				connect_timeout: number

				/** Disables chunked transfer encoding. Useful if you are running a WSGI server. */
				disable_chunked_encoding?: boolean

				/** Attempt to connect to origin using HTTP2. Origin must be configured as https. */
				http2_origin?: boolean

				/** Sets the HTTP Host header on requests sent to the local service. */
				http_host_header?: string

				/** Maximum number of idle keepalive connections between Tunnel and your origin. This does not restrict the total number of concurrent connections. */
				keep_alive_connections: number

				/** Timeout after which an idle keepalive connection can be discarded. */
				keep_alive_timeout: number

				/** Disable the “happy eyeballs” algorithm for IPv4/IPv6 fallback if your local network has misconfigured one of the protocols. */
				no_happy_eyeballs: boolean

				/** Disables TLS verification of the certificate presented by your origin. Will allow any certificate from the origin to be accepted. */
				no_tls_verify: boolean

				/** Hostname that cloudflared should expect from your origin server certificate. */
				origin_server_name: string

				/** cloudflared starts a proxy server to translate HTTP traffic into TCP when proxying, for example, SSH or RDP. This configures what type of proxy will be started. Valid options are: "" for the regular proxy and "socks" for a SOCKS5 proxy. */
				proxy_type: string

				/** The timeout after which a TCP keepalive packet is sent on a connection between Tunnel and the origin server. */
				tcp_keep_alive: number

				/** Timeout for completing a TLS handshake to your origin server, if you have chosen to connect Tunnel to an HTTPS server. */
				tls_timeout: number
			}>

			/** Requests with this path route to this public hostname. */
			path: string

			/** Protocol and address of destination server. Supported protocols: http://, https://, unix://, tcp://, ssh://, rdp://, unix+tls://, smb://. Alternatively can return a HTTP status code http_status:[code] e.g. 'http_status:404'. */
			service: string
		}>
		origin_request: Readonly<{
			access: Readonly<{

				/** Access applications that are allowed to reach this hostname for this Tunnel. Audience tags can be identified in the dashboard or via the List Access policies API. */
				aud_tag: ReadonlyArray<string>

				/** Deny traffic that has not fulfilled Access authorization. */
				required: boolean
				team_name: string
			}>

			/** Path to the certificate authority (CA) for the certificate of your origin. This option should be used only if your certificate is not signed by Cloudflare. */
			ca_pool: string

			/** Timeout for establishing a new TCP connection to your origin server. This excludes the time taken to establish TLS, which is controlled by tlsTimeout. */
			connect_timeout: number

			/** Disables chunked transfer encoding. Useful if you are running a WSGI server. */
			disable_chunked_encoding?: boolean

			/** Attempt to connect to origin using HTTP2. Origin must be configured as https. */
			http2_origin?: boolean

			/** Sets the HTTP Host header on requests sent to the local service. */
			http_host_header?: string

			/** Maximum number of idle keepalive connections between Tunnel and your origin. This does not restrict the total number of concurrent connections. */
			keep_alive_connections: number

			/** Timeout after which an idle keepalive connection can be discarded. */
			keep_alive_timeout: number

			/** Disable the “happy eyeballs” algorithm for IPv4/IPv6 fallback if your local network has misconfigured one of the protocols. */
			no_happy_eyeballs: boolean

			/** Disables TLS verification of the certificate presented by your origin. Will allow any certificate from the origin to be accepted. */
			no_tls_verify: boolean

			/** Hostname that cloudflared should expect from your origin server certificate. */
			origin_server_name: string

			/** cloudflared starts a proxy server to translate HTTP traffic into TCP when proxying, for example, SSH or RDP. This configures what type of proxy will be started. Valid options are: "" for the regular proxy and "socks" for a SOCKS5 proxy. */
			proxy_type: string

			/** The timeout after which a TCP keepalive packet is sent on a connection between Tunnel and the origin server. */
			tcp_keep_alive: number

			/** Timeout for completing a TLS handshake to your origin server, if you have chosen to connect Tunnel to an HTTPS server. */
			tls_timeout: number
		}>
		warp_routing: Readonly<{
			enabled: boolean
		}>
	}>>
	created_at: Output<string>

	/** UUID of the tunnel. */
	id: Output<string>

	/** Indicates if this is a locally or remotely configured tunnel. If `local`, manage the tunnel using a YAML file on the origin machine. If `cloudflare`, manage the tunnel's configuration on the Zero Trust dashboard.
Available values: "local", "cloudflare". */
	source: Output<string>

	/** UUID of the tunnel. */
	tunnel_id: Output<string>

	/** The version of the Tunnel Configuration. */
	version: Output<number>
}>

type CloudflareZoneSubscriptionProps = {

	/** How often the subscription is renewed automatically.
Available values: "weekly", "monthly", "quarterly", "yearly". */
	frequency?: Input<string | undefined>

	/** Subscription identifier tag. */
	identifier: Input<string>
	rate_plan?: Input<{

		/** The currency applied to the rate plan subscription. */
		currency?: Input<string | undefined>

		/** Whether this rate plan is managed externally from Cloudflare. */
		externally_managed?: Input<boolean | undefined>

		/** The ID of the rate plan.
Available values: "free", "lite", "pro", "pro_plus", "business", "enterprise", "partners_free", "partners_pro", "partners_business", "partners_enterprise". */
		id?: Input<string | undefined>

		/** Whether a rate plan is enterprise-based (or newly adopted term contract). */
		is_contract?: Input<boolean | undefined>

		/** The full name of the rate plan. */
		public_name?: Input<string | undefined>

		/** The scope that this rate plan applies to. */
		scope?: Input<string | undefined>

		/** The list of sets this rate plan applies to. */
		sets?: Input<Array<Input<string>> | undefined>
	} | undefined>
}

type CloudflareZoneSubscription = Readonly<{

	/** How often the subscription is renewed automatically.
Available values: "weekly", "monthly", "quarterly", "yearly". */
	frequency: Output<string | undefined>

	/** Subscription identifier tag. */
	identifier: Output<string>
	rate_plan: Output<Readonly<{

		/** The currency applied to the rate plan subscription. */
		currency: string

		/** Whether this rate plan is managed externally from Cloudflare. */
		externally_managed: boolean

		/** The ID of the rate plan.
Available values: "free", "lite", "pro", "pro_plus", "business", "enterprise", "partners_free", "partners_pro", "partners_business", "partners_enterprise". */
		id: string

		/** Whether a rate plan is enterprise-based (or newly adopted term contract). */
		is_contract: boolean

		/** The full name of the rate plan. */
		public_name: string

		/** The scope that this rate plan applies to. */
		scope: string

		/** The list of sets this rate plan applies to. */
		sets: ReadonlyArray<string>
	}>>
}>

type CloudflareStreamProps = {

	/** The account identifier tag. */
	account_id: Input<string>

	/** Lists the origins allowed to display the video. Enter allowed origin domains in an array and use `*` for wildcard subdomains. Empty arrays allow the video to be viewed on any origin. */
	allowed_origins?: Input<Array<Input<string>> | undefined>

	/** A user-defined identifier for the media creator. */
	creator?: Input<string | undefined>

	/** A Cloudflare-generated unique identifier for a media item. */
	identifier?: Input<string | undefined>

	/** The maximum duration in seconds for a video upload. Can be set for a video that is not yet uploaded to limit its duration. Uploads that exceed the specified duration will fail during processing. A value of `-1` means the value is unknown. */
	max_duration_seconds?: Input<number | undefined>

	/** A user modifiable key-value store used to reference other systems of record for managing videos. */
	meta?: Input<string | undefined>

	/** Indicates whether the video can be a accessed using the UID. When set to `true`, a signed token must be generated with a signing key to view the video. */
	require_signed_urls?: Input<boolean | undefined>

	/** Indicates the date and time at which the video will be deleted. Omit the field to indicate no change, or include with a `null` value to remove an existing scheduled deletion. If specified, must be at least 30 days from upload time. */
	scheduled_deletion?: Input<string | undefined>

	/** The timestamp for a thumbnail image calculated as a percentage value of the video's duration. To convert from a second-wise timestamp to a percentage, divide the desired timestamp by the total duration of the video.  If this value is not set, the default thumbnail image is taken from 0s of the video. */
	thumbnail_timestamp_pct?: Input<number | undefined>

	/** The date and time when the video upload URL is no longer valid for direct user uploads. */
	upload_expiry?: Input<string | undefined>
}

type CloudflareStream = Readonly<{

	/** The account identifier tag. */
	account_id: Output<string>

	/** Lists the origins allowed to display the video. Enter allowed origin domains in an array and use `*` for wildcard subdomains. Empty arrays allow the video to be viewed on any origin. */
	allowed_origins: ReadonlyArray<string>

	/** The date and time the media item was created. */
	created: Output<string>

	/** A user-defined identifier for the media creator. */
	creator: Output<string | undefined>

	/** The duration of the video in seconds. A value of `-1` means the duration is unknown. The duration becomes available after the upload and before the video is ready. */
	duration: Output<number>

	/** A Cloudflare-generated unique identifier for a media item. */
	identifier: Output<string | undefined>
	input: Output<Readonly<{

		/** The video height in pixels. A value of `-1` means the height is unknown. The value becomes available after the upload and before the video is ready. */
		height: number

		/** The video width in pixels. A value of `-1` means the width is unknown. The value becomes available after the upload and before the video is ready. */
		width: number
	}>>

	/** The live input ID used to upload a video with Stream Live. */
	live_input: Output<string>

	/** The maximum duration in seconds for a video upload. Can be set for a video that is not yet uploaded to limit its duration. Uploads that exceed the specified duration will fail during processing. A value of `-1` means the value is unknown. */
	max_duration_seconds: Output<number | undefined>

	/** A user modifiable key-value store used to reference other systems of record for managing videos. */
	meta: Output<string | undefined>

	/** The date and time the media item was last modified. */
	modified: Output<string>
	playback: Output<Readonly<{

		/** DASH Media Presentation Description for the video. */
		dash: string

		/** The HLS manifest for the video. */
		hls: string
	}>>

	/** The video's preview page URI. This field is omitted until encoding is complete. */
	preview: Output<string>

	/** Indicates whether the video is playable. The field is empty if the video is not ready for viewing or the live stream is still in progress. */
	ready_to_stream: Output<boolean>

	/** Indicates the time at which the video became playable. The field is empty if the video is not ready for viewing or the live stream is still in progress. */
	ready_to_stream_at: Output<string>

	/** Indicates whether the video can be a accessed using the UID. When set to `true`, a signed token must be generated with a signing key to view the video. */
	require_signed_urls: Output<boolean>

	/** Indicates the date and time at which the video will be deleted. Omit the field to indicate no change, or include with a `null` value to remove an existing scheduled deletion. If specified, must be at least 30 days from upload time. */
	scheduled_deletion: Output<string | undefined>

	/** The size of the media item in bytes. */
	size: Output<number>
	status: Output<Readonly<{

		/** Specifies why the video failed to encode. This field is empty if the video is not in an `error` state. Preferred for programmatic use. */
		error_reason_code: string

		/** Specifies why the video failed to encode using a human readable error message in English. This field is empty if the video is not in an `error` state. */
		error_reason_text: string

		/** Indicates the size of the entire upload in bytes. The value must be a non-negative integer. */
		pct_complete: string

		/** Specifies the processing status for all quality levels for a video.
Available values: "pendingupload", "downloading", "queued", "inprogress", "ready", "error". */
		state: string
	}>>

	/** The media item's thumbnail URI. This field is omitted until encoding is complete. */
	thumbnail: Output<string>

	/** The timestamp for a thumbnail image calculated as a percentage value of the video's duration. To convert from a second-wise timestamp to a percentage, divide the desired timestamp by the total duration of the video.  If this value is not set, the default thumbnail image is taken from 0s of the video. */
	thumbnail_timestamp_pct: Output<number>

	/** A Cloudflare-generated unique identifier for a media item. */
	uid: Output<string>

	/** The date and time when the video upload URL is no longer valid for direct user uploads. */
	upload_expiry: Output<string | undefined>

	/** The date and time the media item was uploaded. */
	uploaded: Output<string>
	watermark: Output<Readonly<{

		/** The date and a time a watermark profile was created. */
		created: string

		/** The source URL for a downloaded image. If the watermark profile was created via direct upload, this field is null. */
		downloaded_from: string

		/** The height of the image in pixels. */
		height: number

		/** A short description of the watermark profile. */
		name: string

		/** The translucency of the image. A value of `0.0` makes the image completely transparent, and `1.0` makes the image completely opaque. Note that if the image is already semi-transparent, setting this to `1.0` will not make the image completely opaque. */
		opacity: number

		/** The whitespace between the adjacent edges (determined by position) of the video and the image. `0.0` indicates no padding, and `1.0` indicates a fully padded video width or length, as determined by the algorithm. */
		padding: number

		/** The location of the image. Valid positions are: `upperRight`, `upperLeft`, `lowerLeft`, `lowerRight`, and `center`. Note that `center` ignores the `padding` parameter. */
		position: string

		/** The size of the image relative to the overall size of the video. This parameter will adapt to horizontal and vertical videos automatically. `0.0` indicates no scaling (use the size of the image as-is), and `1.0 `fills the entire video. */
		scale: number

		/** The size of the image in bytes. */
		size: number

		/** The unique identifier for a watermark profile. */
		uid: string

		/** The width of the image in pixels. */
		width: number
	}>>
}>

type CloudflareFilterProps = {

	/** The filter expression. For more information, refer to [Expressions](https://developers.cloudflare.com/ruleset-engine/rules-language/expressions/). */
	expression: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareFilter = Readonly<{

	/** An informative summary of the filter. */
	description: Output<string>

	/** The filter expression. For more information, refer to [Expressions](https://developers.cloudflare.com/ruleset-engine/rules-language/expressions/). */
	expression: Output<string>

	/** The unique identifier of the filter. */
	id: Output<string>

	/** When true, indicates that the filter is currently paused. */
	paused: Output<boolean>

	/** A short reference tag. Allows you to select related filters. */
	ref: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareFirewallRuleProps = {
	action: Input<{

		/** The action to perform.
Available values: "simulate", "ban", "challenge", "js_challenge", "managed_challenge". */
		mode?: Input<string | undefined>
		response?: Input<{

			/** The response body to return. The value must conform to the configured content type. */
			body?: Input<string | undefined>

			/** The content type of the body. Must be one of the following: `text/plain`, `text/xml`, or `application/json`. */
			content_type?: Input<string | undefined>
		} | undefined>

		/** The time in seconds during which Cloudflare will perform the mitigation action. Must be an integer value greater than or equal to the period.
Notes: If "mode" is "challenge", "managed_challenge", or "js_challenge", Cloudflare will use the zone's Challenge Passage time and you should not provide this value. */
		timeout?: Input<number | undefined>
	}>
	filter: Input<{

		/** An informative summary of the filter. */
		description?: Input<string | undefined>

		/** The filter expression. For more information, refer to [Expressions](https://developers.cloudflare.com/ruleset-engine/rules-language/expressions/). */
		expression?: Input<string | undefined>

		/** When true, indicates that the filter is currently paused. */
		paused?: Input<boolean | undefined>

		/** A short reference tag. Allows you to select related filters. */
		ref?: Input<string | undefined>
	}>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareFirewallRule = Readonly<{
	action: Output<Readonly<{

		/** The action to perform.
Available values: "simulate", "ban", "challenge", "js_challenge", "managed_challenge". */
		mode: string
		response: Readonly<{

			/** The response body to return. The value must conform to the configured content type. */
			body?: string

			/** The content type of the body. Must be one of the following: `text/plain`, `text/xml`, or `application/json`. */
			content_type?: string
		}>

		/** The time in seconds during which Cloudflare will perform the mitigation action. Must be an integer value greater than or equal to the period.
Notes: If "mode" is "challenge", "managed_challenge", or "js_challenge", Cloudflare will use the zone's Challenge Passage time and you should not provide this value. */
		timeout: number
	}>>

	/** An informative summary of the firewall rule. */
	description: Output<string>
	filter: Output<Readonly<{

		/** An informative summary of the filter. */
		description: string

		/** The filter expression. For more information, refer to [Expressions](https://developers.cloudflare.com/ruleset-engine/rules-language/expressions/). */
		expression: string

		/** The unique identifier of the filter. */
		id: string

		/** When true, indicates that the filter is currently paused. */
		paused: boolean

		/** A short reference tag. Allows you to select related filters. */
		ref: string
	}>>

	/** The unique identifier of the firewall rule. */
	id: Output<string>

	/** When true, indicates that the firewall rule is currently paused. */
	paused: Output<boolean>

	/** The priority of the rule. Optional value used to define the processing order. A lower number indicates a higher priority. If not provided, rules with a defined priority will be processed before rules without a priority. */
	priority: Output<number>
	products: ReadonlyArray<string>

	/** A short reference tag. Allows you to select related firewall rules. */
	ref: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustDlpPredefinedProfileProps = {
	account_id: Input<string>
	ai_context_enabled?: Input<boolean | undefined>
	allowed_match_count?: Input<number | undefined>
	confidence_threshold?: Input<string | undefined>
	context_awareness?: Input<{

		/** If true, scan the context of predefined entries to only return matches surrounded by keywords. */
		enabled: Input<boolean>
		skip: Input<{

			/** If the content type is a file, skip context analysis and return all matches. */
			files: Input<boolean>
		}>
	} | undefined>
	entries: Input<{
		enabled: Input<boolean>
		id: Input<string>
	}>
	ocr_enabled?: Input<boolean | undefined>
	profile_id: Input<string>
}

type CloudflareZeroTrustDlpPredefinedProfile = Readonly<{
	account_id: Output<string>
	ai_context_enabled: Output<boolean | undefined>
	allowed_match_count: Output<number | undefined>
	confidence_threshold: Output<string | undefined>
	context_awareness: Output<Readonly<{

		/** If true, scan the context of predefined entries to only return matches surrounded by keywords. */
		enabled: boolean
		skip: Readonly<{

			/** If the content type is a file, skip context analysis and return all matches. */
			files: boolean
		}>
	}>>

	/** When the profile was created */
	created_at: Output<string>

	/** The description of the profile */
	description: Output<string>
	entries: Output<Readonly<{
		enabled: boolean
		id: string
	}>>
	id: Output<string>

	/** The name of the profile */
	name: Output<string>
	ocr_enabled: Output<boolean | undefined>

	/** Whether this profile can be accessed by anyone */
	open_access: Output<boolean>
	profile_id: Output<string>

	/** Available values: "custom". */
	type: Output<string>

	/** When the profile was lasted updated */
	updated_at: Output<string>
}>

type CloudflareR2BucketLockProps = {

	/** Account ID */
	account_id: Input<string>

	/** Name of the bucket */
	bucket_name: Input<string>

	/** Jurisdiction of the bucket */
	jurisdiction?: Input<string | undefined>
	rules?: Input<{
		condition: Input<{
			date?: Input<string | undefined>
			max_age_seconds?: Input<number | undefined>

			/** Available values: "Age". */
			type: Input<string>
		}>

		/** Whether or not this rule is in effect */
		enabled: Input<boolean>

		/** Unique identifier for this rule */
		id: Input<string>

		/** Rule will only apply to objects/uploads in the bucket that start with the given prefix, an empty prefix can be provided to scope rule to all objects/uploads */
		prefix?: Input<string | undefined>
	} | undefined>
}

type CloudflareR2BucketLock = Readonly<{

	/** Account ID */
	account_id: Output<string>

	/** Name of the bucket */
	bucket_name: Output<string>

	/** Jurisdiction of the bucket */
	jurisdiction: Output<string>
	rules: Output<Readonly<{
		condition: Readonly<{
			date?: string
			max_age_seconds?: number

			/** Available values: "Age". */
			type: string
		}>

		/** Whether or not this rule is in effect */
		enabled: boolean

		/** Unique identifier for this rule */
		id: string

		/** Rule will only apply to objects/uploads in the bucket that start with the given prefix, an empty prefix can be provided to scope rule to all objects/uploads */
		prefix: string
	}>>
}>

type CloudflareEmailSecurityBlockSenderProps = {

	/** Account Identifier */
	account_id: Input<string>
	comments?: Input<string | undefined>
	is_regex: Input<boolean>
	pattern: Input<string>

	/** Available values: "EMAIL", "DOMAIN", "IP", "UNKNOWN". */
	pattern_type: Input<string>
}

type CloudflareEmailSecurityBlockSender = Readonly<{

	/** Account Identifier */
	account_id: Output<string>
	comments: Output<string | undefined>
	created_at: Output<string>

	/** The unique identifier for the allow policy. */
	id: Output<number>
	is_regex: Output<boolean>
	last_modified: Output<string>
	pattern: Output<string>

	/** Available values: "EMAIL", "DOMAIN", "IP", "UNKNOWN". */
	pattern_type: Output<string>
}>

type CloudflareZeroTrustDeviceDefaultProfileLocalDomainFallbackProps = {
	account_id: Input<string>
	domains: Input<{

		/** A description of the fallback domain, displayed in the client UI. */
		description?: Input<string | undefined>

		/** A list of IP addresses to handle domain resolution. */
		dns_server?: Input<Array<Input<string>> | undefined>

		/** The domain suffix to match when resolving locally. */
		suffix: Input<string>
	}>
}

type CloudflareZeroTrustDeviceDefaultProfileLocalDomainFallback = Readonly<{
	account_id: Output<string>

	/** A description of the fallback domain, displayed in the client UI. */
	description: Output<string>

	/** A list of IP addresses to handle domain resolution. */
	dns_server: ReadonlyArray<string>
	domains: Output<Readonly<{

		/** A description of the fallback domain, displayed in the client UI. */
		description: string

		/** A list of IP addresses to handle domain resolution. */
		dns_server: ReadonlyArray<string>

		/** The domain suffix to match when resolving locally. */
		suffix: string
	}>>

	/** The domain suffix to match when resolving locally. */
	suffix: Output<string>
}>

type CloudflareObservatoryScheduledTestProps = {

	/** A URL. */
	url: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareObservatoryScheduledTest = Readonly<{

	/** The frequency of the test.
Available values: "DAILY", "WEEKLY". */
	frequency: Output<string>

	/** A URL. */
	id: Output<string>

	/** A test region.
Available values: "asia-east1", "asia-northeast1", "asia-northeast2", "asia-south1", "asia-southeast1", "australia-southeast1", "europe-north1", "europe-southwest1", "europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west8", "europe-west9", "me-west1", "southamerica-east1", "us-central1", "us-east1", "us-east4", "us-south1", "us-west1". */
	region: Output<string>
	schedule: Output<Readonly<{

		/** The frequency of the test.
Available values: "DAILY", "WEEKLY". */
		frequency: string

		/** A test region.
Available values: "asia-east1", "asia-northeast1", "asia-northeast2", "asia-south1", "asia-southeast1", "australia-southeast1", "europe-north1", "europe-southwest1", "europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west8", "europe-west9", "me-west1", "southamerica-east1", "us-central1", "us-east1", "us-east4", "us-south1", "us-west1". */
		region: string

		/** A URL. */
		url: string
	}>>
	test: Output<Readonly<{
		date: string
		desktop_report: Readonly<{

			/** Cumulative Layout Shift. */
			cls: number

			/** The type of device.
Available values: "DESKTOP", "MOBILE". */
			device_type: string
			error: Readonly<{

				/** The error code of the Lighthouse result.
Available values: "NOT_REACHABLE", "DNS_FAILURE", "NOT_HTML", "LIGHTHOUSE_TIMEOUT", "UNKNOWN". */
				code: string

				/** Detailed error message. */
				detail: string

				/** The final URL displayed to the user. */
				final_displayed_url: string
			}>

			/** First Contentful Paint. */
			fcp: number

			/** The URL to the full Lighthouse JSON report. */
			json_report_url: string

			/** Largest Contentful Paint. */
			lcp: number

			/** The Lighthouse performance score. */
			performance_score: number

			/** Speed Index. */
			si: number

			/** The state of the Lighthouse report.
Available values: "RUNNING", "COMPLETE", "FAILED". */
			state: string

			/** Total Blocking Time. */
			tbt: number

			/** Time To First Byte. */
			ttfb: number

			/** Time To Interactive. */
			tti: number
		}>

		/** UUID */
		id: string
		mobile_report: Readonly<{

			/** Cumulative Layout Shift. */
			cls: number

			/** The type of device.
Available values: "DESKTOP", "MOBILE". */
			device_type: string
			error: Readonly<{

				/** The error code of the Lighthouse result.
Available values: "NOT_REACHABLE", "DNS_FAILURE", "NOT_HTML", "LIGHTHOUSE_TIMEOUT", "UNKNOWN". */
				code: string

				/** Detailed error message. */
				detail: string

				/** The final URL displayed to the user. */
				final_displayed_url: string
			}>

			/** First Contentful Paint. */
			fcp: number

			/** The URL to the full Lighthouse JSON report. */
			json_report_url: string

			/** Largest Contentful Paint. */
			lcp: number

			/** The Lighthouse performance score. */
			performance_score: number

			/** Speed Index. */
			si: number

			/** The state of the Lighthouse report.
Available values: "RUNNING", "COMPLETE", "FAILED". */
			state: string

			/** Total Blocking Time. */
			tbt: number

			/** Time To First Byte. */
			ttfb: number

			/** Time To Interactive. */
			tti: number
		}>
		region: Readonly<{
			label: string

			/** A test region.
Available values: "asia-east1", "asia-northeast1", "asia-northeast2", "asia-south1", "asia-southeast1", "australia-southeast1", "europe-north1", "europe-southwest1", "europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west8", "europe-west9", "me-west1", "southamerica-east1", "us-central1", "us-east1", "us-east4", "us-south1", "us-west1". */
			value: string
		}>

		/** The frequency of the test.
Available values: "DAILY", "WEEKLY". */
		schedule_frequency: string

		/** A URL. */
		url: string
	}>>

	/** A URL. */
	url: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareAccountDnsSettingsProps = {

	/** Identifier */
	account_id: Input<string>
	zone_defaults?: Input<{

		/** Whether to flatten all CNAME records in the zone. Note that, due to DNS limitations, a CNAME record at the zone apex will always be flattened. */
		flatten_all_cnames?: Input<boolean | undefined>

		/** Whether to enable Foundation DNS Advanced Nameservers on the zone. */
		foundation_dns?: Input<boolean | undefined>
		internal_dns?: Input<{

			/** The ID of the zone to fallback to. */
			reference_zone_id?: Input<string | undefined>
		} | undefined>

		/** Whether to enable multi-provider DNS, which causes Cloudflare to activate the zone even when non-Cloudflare NS records exist, and to respect NS records at the zone apex during outbound zone transfers. */
		multi_provider?: Input<boolean | undefined>
		nameservers?: Input<{

			/** Nameserver type
Available values: "cloudflare.standard", "cloudflare.standard.random", "custom.account", "custom.tenant". */
			type: Input<string>
		} | undefined>

		/** The time to live (TTL) of the zone's nameserver (NS) records. */
		ns_ttl?: Input<number | undefined>

		/** Allows a Secondary DNS zone to use (proxied) override records and CNAME flattening at the zone apex. */
		secondary_overrides?: Input<boolean | undefined>
		soa?: Input<{

			/** Time in seconds of being unable to query the primary server after which secondary servers should stop serving the zone. */
			expire: Input<number>

			/** The time to live (TTL) for negative caching of records within the zone. */
			min_ttl: Input<number>

			/** The primary nameserver, which may be used for outbound zone transfers. */
			mname: Input<string>

			/** Time in seconds after which secondary servers should re-check the SOA record to see if the zone has been updated. */
			refresh: Input<number>

			/** Time in seconds after which secondary servers should retry queries after the primary server was unresponsive. */
			retry: Input<number>

			/** The email address of the zone administrator, with the first label representing the local part of the email address. */
			rname: Input<string>

			/** The time to live (TTL) of the SOA record itself. */
			ttl: Input<number>
		} | undefined>

		/** Whether the zone mode is a regular or CDN/DNS only zone.
Available values: "standard", "cdn_only", "dns_only". */
		zone_mode?: Input<string | undefined>
	} | undefined>
}

type CloudflareAccountDnsSettings = Readonly<{

	/** Identifier */
	account_id: Output<string>
	zone_defaults: Output<Readonly<{

		/** Whether to flatten all CNAME records in the zone. Note that, due to DNS limitations, a CNAME record at the zone apex will always be flattened. */
		flatten_all_cnames: boolean

		/** Whether to enable Foundation DNS Advanced Nameservers on the zone. */
		foundation_dns: boolean
		internal_dns: Readonly<{

			/** The ID of the zone to fallback to. */
			reference_zone_id?: string
		}>

		/** Whether to enable multi-provider DNS, which causes Cloudflare to activate the zone even when non-Cloudflare NS records exist, and to respect NS records at the zone apex during outbound zone transfers. */
		multi_provider: boolean
		nameservers: Readonly<{

			/** Nameserver type
Available values: "cloudflare.standard", "cloudflare.standard.random", "custom.account", "custom.tenant". */
			type: string
		}>

		/** The time to live (TTL) of the zone's nameserver (NS) records. */
		ns_ttl: number

		/** Allows a Secondary DNS zone to use (proxied) override records and CNAME flattening at the zone apex. */
		secondary_overrides: boolean
		soa: Readonly<{

			/** Time in seconds of being unable to query the primary server after which secondary servers should stop serving the zone. */
			expire: number

			/** The time to live (TTL) for negative caching of records within the zone. */
			min_ttl: number

			/** The primary nameserver, which may be used for outbound zone transfers. */
			mname: string

			/** Time in seconds after which secondary servers should re-check the SOA record to see if the zone has been updated. */
			refresh: number

			/** Time in seconds after which secondary servers should retry queries after the primary server was unresponsive. */
			retry: number

			/** The email address of the zone administrator, with the first label representing the local part of the email address. */
			rname: string

			/** The time to live (TTL) of the SOA record itself. */
			ttl: number
		}>

		/** Whether the zone mode is a regular or CDN/DNS only zone.
Available values: "standard", "cdn_only", "dns_only". */
		zone_mode: string
	}>>
}>

type CloudflareHostnameTlsSettingProps = {

	/** The hostname for which the tls settings are set. */
	hostname: Input<string>

	/** The TLS Setting name.
Available values: "ciphers", "min_tls_version", "http2". */
	setting_id: Input<string>

	/** The tls setting value. */
	value: Input<unknown>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareHostnameTlsSetting = Readonly<{

	/** This is the time the tls setting was originally created for this hostname. */
	created_at: Output<string>

	/** The hostname for which the tls settings are set. */
	hostname: Output<string>

	/** The TLS Setting name.
Available values: "ciphers", "min_tls_version", "http2". */
	id: Output<string>

	/** The TLS Setting name.
Available values: "ciphers", "min_tls_version", "http2". */
	setting_id: Output<string>

	/** Deployment status for the given tls setting. */
	status: Output<string>

	/** This is the time the tls setting was updated. */
	updated_at: Output<string>

	/** The tls setting value. */
	value: Output<unknown>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareWorkersCronTriggerProps = {

	/** Identifier */
	account_id: Input<string>
	schedules: Input<{
		cron: Input<string>
	}>

	/** Name of the script, used in URLs and route configuration. */
	script_name: Input<string>
}

type CloudflareWorkersCronTrigger = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Name of the script, used in URLs and route configuration. */
	id: Output<string>
	schedules: Output<Readonly<{
		cron: string
	}>>

	/** Name of the script, used in URLs and route configuration. */
	script_name: Output<string>
}>

type CloudflareWorkersKvProps = {

	/** Identifier */
	account_id: Input<string>

	/** A key's name. The name may be at most 512 bytes. All printable, non-whitespace characters are valid. Use percent-encoding to define key names as part of a URL. */
	key_name: Input<string>

	/** Arbitrary JSON to be associated with a key/value pair. */
	metadata?: Input<string | undefined>

	/** Namespace identifier tag. */
	namespace_id: Input<string>

	/** A byte sequence to be stored, up to 25 MiB in length. */
	value: Input<string>
}

type CloudflareWorkersKv = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** A key's name. The name may be at most 512 bytes. All printable, non-whitespace characters are valid. Use percent-encoding to define key names as part of a URL. */
	id: Output<string>

	/** A key's name. The name may be at most 512 bytes. All printable, non-whitespace characters are valid. Use percent-encoding to define key names as part of a URL. */
	key_name: Output<string>

	/** Arbitrary JSON to be associated with a key/value pair. */
	metadata: Output<string | undefined>

	/** Namespace identifier tag. */
	namespace_id: Output<string>

	/** A byte sequence to be stored, up to 25 MiB in length. */
	value: Output<string>
}>

type CloudflareZeroTrustDlpCustomProfileProps = {
	account_id: Input<string>
	ai_context_enabled?: Input<boolean | undefined>

	/** Related DLP policies will trigger when the match count exceeds the number set. */
	allowed_match_count?: Input<number | undefined>
	confidence_threshold?: Input<string | undefined>
	context_awareness?: Input<{

		/** If true, scan the context of predefined entries to only return matches surrounded by keywords. */
		enabled: Input<boolean>
		skip: Input<{

			/** If the content type is a file, skip context analysis and return all matches. */
			files: Input<boolean>
		}>
	} | undefined>

	/** The description of the profile */
	description?: Input<string | undefined>
	entries?: Input<{
		enabled: Input<boolean>
		name: Input<string>
		pattern?: Input<{
			regex: Input<string>

			/** Available values: "luhn". */
			validation?: Input<string | undefined>
		} | undefined>
		words?: Input<Array<Input<string>> | undefined>
	} | undefined>
	name?: Input<string | undefined>
	ocr_enabled?: Input<boolean | undefined>
	profiles?: Input<{
		ai_context_enabled?: Input<boolean | undefined>

		/** Related DLP policies will trigger when the match count exceeds the number set. */
		allowed_match_count?: Input<number | undefined>
		confidence_threshold?: Input<string | undefined>
		context_awareness?: Input<{

			/** If true, scan the context of predefined entries to only return matches surrounded by keywords. */
			enabled: Input<boolean>
			skip: Input<{

				/** If the content type is a file, skip context analysis and return all matches. */
				files: Input<boolean>
			}>
		} | undefined>

		/** The description of the profile */
		description?: Input<string | undefined>
		entries: Input<{
			enabled: Input<boolean>
			name: Input<string>
			pattern?: Input<{
				regex: Input<string>

				/** Available values: "luhn". */
				validation?: Input<string | undefined>
			} | undefined>
			words?: Input<Array<Input<string>> | undefined>
		}>
		name: Input<string>
		ocr_enabled?: Input<boolean | undefined>
		shared_entries?: Input<{
			enabled: Input<boolean>
			entry_id: Input<string>

			/** Available values: "custom". */
			entry_type: Input<string>
		} | undefined>
	} | undefined>
	shared_entries?: Input<{
		enabled: Input<boolean>
		entry_id: Input<string>

		/** Available values: "custom". */
		entry_type: Input<string>
	} | undefined>
}

type CloudflareZeroTrustDlpCustomProfile = Readonly<{
	account_id: Output<string>
	ai_context_enabled: Output<boolean | undefined>

	/** Related DLP policies will trigger when the match count exceeds the number set. */
	allowed_match_count: Output<number>
	confidence_threshold: Output<string | undefined>
	context_awareness: Output<Readonly<{

		/** If true, scan the context of predefined entries to only return matches surrounded by keywords. */
		enabled: boolean
		skip: Readonly<{

			/** If the content type is a file, skip context analysis and return all matches. */
			files: boolean
		}>
	}>>

	/** When the profile was created */
	created_at: Output<string>

	/** The description of the profile */
	description: Output<string | undefined>
	entries: Output<Readonly<{
		enabled: boolean
		name: string
		pattern: Readonly<{
			regex: string

			/** Available values: "luhn". */
			validation?: string
		}>
		words: ReadonlyArray<string>
	}>>

	/** The id of the profile (uuid) */
	id: Output<string>
	name: Output<string | undefined>
	ocr_enabled: Output<boolean | undefined>

	/** Whether this profile can be accessed by anyone */
	open_access: Output<boolean>
	profiles: Output<Readonly<{
		ai_context_enabled: boolean

		/** Related DLP policies will trigger when the match count exceeds the number set. */
		allowed_match_count: number
		confidence_threshold: string
		context_awareness: Readonly<{

			/** If true, scan the context of predefined entries to only return matches surrounded by keywords. */
			enabled: boolean
			skip: Readonly<{

				/** If the content type is a file, skip context analysis and return all matches. */
				files: boolean
			}>
		}>

		/** The description of the profile */
		description: string
		entries: Readonly<{
			enabled: boolean
			name: string
			pattern?: Readonly<{
				regex: string

				/** Available values: "luhn". */
				validation?: string
			}>
			words?: ReadonlyArray<string>
		}>
		name: string
		ocr_enabled: boolean
		shared_entries: Readonly<{
			enabled: boolean
			entry_id: string

			/** Available values: "custom". */
			entry_type: string
		}>
	}>>
	shared_entries: Output<Readonly<{
		enabled: boolean
		entry_id: string

		/** Available values: "custom". */
		entry_type: string
	}>>

	/** Available values: "custom". */
	type: Output<string>

	/** When the profile was lasted updated */
	updated_at: Output<string>
}>

type CloudflareSpectrumApplicationProps = {

	/** Enables Argo Smart Routing for this application.
Notes: Only available for TCP applications with traffic_type set to "direct". */
	argo_smart_routing?: Input<boolean | undefined>
	dns: Input<{

		/** The name of the DNS record associated with the application. */
		name?: Input<string | undefined>

		/** The type of DNS record associated with the application.
Available values: "CNAME", "ADDRESS". */
		type?: Input<string | undefined>
	}>
	edge_ips?: Input<{

		/** The IP versions supported for inbound connections on Spectrum anycast IPs.
Available values: "all", "ipv4", "ipv6". */
		connectivity?: Input<string | undefined>

		/** The array of customer owned IPs we broadcast via anycast for this hostname and application. */
		ips?: Input<Array<Input<string>> | undefined>

		/** The type of edge IP configuration specified. Dynamically allocated edge IPs use Spectrum anycast IPs in accordance with the connectivity you specify. Only valid with CNAME DNS names.
Available values: "dynamic". */
		type?: Input<string | undefined>
	} | undefined>

	/** Enables IP Access Rules for this application.
Notes: Only available for TCP applications. */
	ip_firewall?: Input<boolean | undefined>

	/** List of origin IP addresses. Array may contain multiple IP addresses for load balancing. */
	origin_direct?: Input<Array<Input<string>> | undefined>
	origin_dns?: Input<{

		/** The name of the DNS record associated with the origin. */
		name?: Input<string | undefined>

		/** The TTL of our resolution of your DNS record in seconds. */
		ttl?: Input<number | undefined>

		/** The type of DNS record associated with the origin. "" is used to specify a combination of A/AAAA records.
Available values: "", "A", "AAAA", "SRV". */
		type?: Input<string | undefined>
	} | undefined>

	/** The destination port at the origin. Only specified in conjunction with origin_dns. May use an integer to specify a single origin port, for example `1000`, or a string to specify a range of origin ports, for example `"1000-2000"`.
Notes: If specifying a port range, the number of ports in the range must match the number of ports specified in the "protocol" field. */
	origin_port?: Input<unknown | undefined>

	/** The port configuration at Cloudflare's edge. May specify a single port, for example `"tcp/1000"`, or a range of ports, for example `"tcp/1000-2000"`. */
	protocol: Input<string>

	/** Enables Proxy Protocol to the origin. Refer to [Enable Proxy protocol](https://developers.cloudflare.com/spectrum/getting-started/proxy-protocol/) for implementation details on PROXY Protocol V1, PROXY Protocol V2, and Simple Proxy Protocol.
Available values: "off", "v1", "v2", "simple". */
	proxy_protocol?: Input<string | undefined>

	/** The type of TLS termination associated with the application.
Available values: "off", "flexible", "full", "strict". */
	tls?: Input<string | undefined>

	/** Determines how data travels from the edge to your origin. When set to "direct", Spectrum will send traffic directly to your origin, and the application's type is derived from the `protocol`. When set to "http" or "https", Spectrum will apply Cloudflare's HTTP/HTTPS features as it sends traffic to your origin, and the application type matches this property exactly.
Available values: "direct", "http", "https". */
	traffic_type?: Input<string | undefined>

	/** Zone identifier. */
	zone_id: Input<string>
}

type CloudflareSpectrumApplication = Readonly<{

	/** Enables Argo Smart Routing for this application.
Notes: Only available for TCP applications with traffic_type set to "direct". */
	argo_smart_routing: Output<boolean>

	/** When the Application was created. */
	created_on: Output<string>
	dns: Output<Readonly<{

		/** The name of the DNS record associated with the application. */
		name: string

		/** The type of DNS record associated with the application.
Available values: "CNAME", "ADDRESS". */
		type: string
	}>>
	edge_ips: Output<Readonly<{

		/** The IP versions supported for inbound connections on Spectrum anycast IPs.
Available values: "all", "ipv4", "ipv6". */
		connectivity: string

		/** The array of customer owned IPs we broadcast via anycast for this hostname and application. */
		ips: ReadonlyArray<string>

		/** The type of edge IP configuration specified. Dynamically allocated edge IPs use Spectrum anycast IPs in accordance with the connectivity you specify. Only valid with CNAME DNS names.
Available values: "dynamic". */
		type: string
	}>>

	/** App identifier. */
	id: Output<string>

	/** Enables IP Access Rules for this application.
Notes: Only available for TCP applications. */
	ip_firewall: Output<boolean | undefined>

	/** When the Application was last modified. */
	modified_on: Output<string>

	/** List of origin IP addresses. Array may contain multiple IP addresses for load balancing. */
	origin_direct: ReadonlyArray<string>
	origin_dns: Output<Readonly<{

		/** The name of the DNS record associated with the origin. */
		name: string

		/** The TTL of our resolution of your DNS record in seconds. */
		ttl: number

		/** The type of DNS record associated with the origin. "" is used to specify a combination of A/AAAA records.
Available values: "", "A", "AAAA", "SRV". */
		type: string
	}>>

	/** The destination port at the origin. Only specified in conjunction with origin_dns. May use an integer to specify a single origin port, for example `1000`, or a string to specify a range of origin ports, for example `"1000-2000"`.
Notes: If specifying a port range, the number of ports in the range must match the number of ports specified in the "protocol" field. */
	origin_port: Output<unknown | undefined>

	/** The port configuration at Cloudflare's edge. May specify a single port, for example `"tcp/1000"`, or a range of ports, for example `"tcp/1000-2000"`. */
	protocol: Output<string>

	/** Enables Proxy Protocol to the origin. Refer to [Enable Proxy protocol](https://developers.cloudflare.com/spectrum/getting-started/proxy-protocol/) for implementation details on PROXY Protocol V1, PROXY Protocol V2, and Simple Proxy Protocol.
Available values: "off", "v1", "v2", "simple". */
	proxy_protocol: Output<string>

	/** The type of TLS termination associated with the application.
Available values: "off", "flexible", "full", "strict". */
	tls: Output<string | undefined>

	/** Determines how data travels from the edge to your origin. When set to "direct", Spectrum will send traffic directly to your origin, and the application's type is derived from the `protocol`. When set to "http" or "https", Spectrum will apply Cloudflare's HTTP/HTTPS features as it sends traffic to your origin, and the application type matches this property exactly.
Available values: "direct", "http", "https". */
	traffic_type: Output<string>

	/** Zone identifier. */
	zone_id: Output<string>
}>

type CloudflareZeroTrustTunnelCloudflaredProps = {

	/** Cloudflare account ID */
	account_id: Input<string>

	/** Indicates if this is a locally or remotely configured tunnel. If `local`, manage the tunnel using a YAML file on the origin machine. If `cloudflare`, manage the tunnel on the Zero Trust dashboard.
Available values: "local", "cloudflare". */
	config_src?: Input<string | undefined>

	/** A user-friendly name for a tunnel. */
	name: Input<string>

	/** Sets the password required to run a locally-managed tunnel. Must be at least 32 bytes and encoded as a base64 string. */
	tunnel_secret?: Input<string | undefined>
}

type CloudflareZeroTrustTunnelCloudflared = Readonly<{

	/** Cloudflare account ID */
	account_id: Output<string>

	/** Cloudflare account ID */
	account_tag: Output<string>

	/** Indicates if this is a locally or remotely configured tunnel. If `local`, manage the tunnel using a YAML file on the origin machine. If `cloudflare`, manage the tunnel on the Zero Trust dashboard.
Available values: "local", "cloudflare". */
	config_src: Output<string>
	connections: Output<Readonly<{

		/** UUID of the Cloudflare Tunnel connector. */
		client_id: string

		/** The cloudflared version used to establish this connection. */
		client_version: string

		/** The Cloudflare data center used for this connection. */
		colo_name: string

		/** UUID of the Cloudflare Tunnel connection. */
		id: string

		/** Cloudflare continues to track connections for several minutes after they disconnect. This is an optimization to improve latency and reliability of reconnecting.  If `true`, the connection has disconnected but is still being tracked. If `false`, the connection is actively serving traffic. */
		is_pending_reconnect: boolean

		/** Timestamp of when the connection was established. */
		opened_at: string

		/** The public IP address of the host running cloudflared. */
		origin_ip: string

		/** UUID of the Cloudflare Tunnel connection. */
		uuid: string
	}>>

	/** Timestamp of when the tunnel established at least one connection to Cloudflare's edge. If `null`, the tunnel is inactive. */
	conns_active_at: Output<string>

	/** Timestamp of when the tunnel became inactive (no connections to Cloudflare's edge). If `null`, the tunnel is active. */
	conns_inactive_at: Output<string>

	/** Timestamp of when the resource was created. */
	created_at: Output<string>

	/** Timestamp of when the resource was deleted. If `null`, the resource has not been deleted. */
	deleted_at: Output<string>

	/** UUID of the tunnel. */
	id: Output<string>

	/** Metadata associated with the tunnel. */
	metadata: Output<string>

	/** A user-friendly name for a tunnel. */
	name: Output<string>

	/** If `true`, the tunnel can be configured remotely from the Zero Trust dashboard. If `false`, the tunnel must be configured locally on the origin machine. */
	remote_config: Output<boolean>

	/** The status of the tunnel. Valid values are `inactive` (tunnel has never been run), `degraded` (tunnel is active and able to serve traffic but in an unhealthy state), `healthy` (tunnel is active and able to serve traffic), or `down` (tunnel can not serve traffic as it has no connections to the Cloudflare Edge).
Available values: "inactive", "degraded", "healthy", "down". */
	status: Output<string>

	/** The type of tunnel.
Available values: "cfd_tunnel", "warp_connector", "warp", "magic", "ip_sec", "gre", "cni". */
	tun_type: Output<string>

	/** Sets the password required to run a locally-managed tunnel. Must be at least 32 bytes and encoded as a base64 string. */
	tunnel_secret: Output<string | undefined>
}>

type CloudflareZeroTrustListProps = {
	account_id: Input<string>

	/** The description of the list. */
	description?: Input<string | undefined>
	items?: Input<{

		/** The description of the list item, if present */
		description?: Input<string | undefined>

		/** The value of the item in a list. */
		value?: Input<string | undefined>
	} | undefined>

	/** The name of the list. */
	name: Input<string>

	/** The type of list.
Available values: "SERIAL", "URL", "DOMAIN", "EMAIL", "IP". */
	type: Input<string>
}

type CloudflareZeroTrustList = Readonly<{
	account_id: Output<string>
	created_at: Output<string>

	/** The description of the list. */
	description: Output<string | undefined>

	/** API Resource UUID tag. */
	id: Output<string>
	items: Output<Readonly<{
		created_at: string

		/** The description of the list item, if present */
		description: string

		/** The value of the item in a list. */
		value: string
	}>>

	/** The number of items in the list. */
	list_count: Output<number>

	/** The name of the list. */
	name: Output<string>

	/** The type of list.
Available values: "SERIAL", "URL", "DOMAIN", "EMAIL", "IP". */
	type: Output<string>
	updated_at: Output<string>
}>

type CloudflareZeroTrustDexTestProps = {
	account_id: Input<string>
	data: Input<{

		/** The desired endpoint to test. */
		host?: Input<string | undefined>

		/** The type of test. */
		kind?: Input<string | undefined>

		/** The HTTP request method type. */
		method?: Input<string | undefined>
	}>

	/** Additional details about the test. */
	description?: Input<string | undefined>

	/** Determines whether or not the test is active. */
	enabled: Input<boolean>

	/** How often the test will run. */
	interval: Input<string>

	/** The name of the DEX test. Must be unique. */
	name: Input<string>
	target_policies?: Input<{

		/** Whether the profile is the account default */
		default?: Input<boolean | undefined>

		/** The id of the device settings profile */
		id?: Input<string | undefined>

		/** The name of the device settings profile */
		name?: Input<string | undefined>
	} | undefined>
	targeted?: Input<boolean | undefined>
}

type CloudflareZeroTrustDexTest = Readonly<{
	account_id: Output<string>
	data: Output<Readonly<{

		/** The desired endpoint to test. */
		host: string

		/** The type of test. */
		kind: string

		/** The HTTP request method type. */
		method: string
	}>>

	/** Additional details about the test. */
	description: Output<string | undefined>

	/** Determines whether or not the test is active. */
	enabled: Output<boolean>

	/** The unique identifier for the test. */
	id: Output<string>

	/** How often the test will run. */
	interval: Output<string>

	/** The name of the DEX test. Must be unique. */
	name: Output<string>
	target_policies: Output<Readonly<{

		/** Whether the profile is the account default */
		default: boolean

		/** The id of the device settings profile */
		id: string

		/** The name of the device settings profile */
		name: string
	}>>
	targeted: Output<boolean | undefined>

	/** The unique identifier for the test. */
	test_id: Output<string>
}>

type CloudflareZeroTrustAccessPolicyProps = {

	/** Identifier */
	account_id: Input<string>
	approval_groups?: Input<{

		/** The number of approvals needed to obtain access. */
		approvals_needed: Input<number>

		/** A list of emails that can approve the access request. */
		email_addresses?: Input<Array<Input<string>> | undefined>

		/** The UUID of an re-usable email list. */
		email_list_uuid?: Input<string | undefined>
	} | undefined>

	/** Requires the user to request access from an administrator at the start of each session. */
	approval_required?: Input<boolean | undefined>

	/** The action Access will take if a user matches this policy. Infrastructure application policies can only use the Allow action.
Available values: "allow", "deny", "non_identity", "bypass". */
	decision: Input<string>
	exclude?: Input<{
		any_valid_service_token?: Input<{

		} | undefined>
		auth_context?: Input<{

			/** The ACID of an Authentication context. */
			ac_id: Input<string>

			/** The ID of an Authentication context. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		auth_method?: Input<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: Input<string>
		} | undefined>
		azure_ad?: Input<{

			/** The ID of an Azure group. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		certificate?: Input<{

		} | undefined>
		common_name?: Input<{

			/** The common name to match. */
			common_name: Input<string>
		} | undefined>
		device_posture?: Input<{

			/** The ID of a device posture integration. */
			integration_uid: Input<string>
		} | undefined>
		email?: Input<{

			/** The email of the user. */
			email: Input<string>
		} | undefined>
		email_domain?: Input<{

			/** The email domain to match. */
			domain: Input<string>
		} | undefined>
		email_list?: Input<{

			/** The ID of a previously created email list. */
			id: Input<string>
		} | undefined>
		everyone?: Input<{

		} | undefined>
		external_evaluation?: Input<{

			/** The API endpoint containing your business logic. */
			evaluate_url: Input<string>

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: Input<string>
		} | undefined>
		geo?: Input<{

			/** The country code that should be matched. */
			country_code: Input<string>
		} | undefined>
		github_organization?: Input<{

			/** The ID of your Github identity provider. */
			identity_provider_id: Input<string>

			/** The name of the organization. */
			name: Input<string>

			/** The name of the team */
			team?: Input<string | undefined>
		} | undefined>
		group?: Input<{

			/** The ID of a previously created Access group. */
			id: Input<string>
		} | undefined>
		gsuite?: Input<{

			/** The email of the Google Workspace group. */
			email: Input<string>

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		ip?: Input<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: Input<string>
		} | undefined>
		ip_list?: Input<{

			/** The ID of a previously created IP list. */
			id: Input<string>
		} | undefined>
		login_method?: Input<{

			/** The ID of an identity provider. */
			id: Input<string>
		} | undefined>
		okta?: Input<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: Input<string>

			/** The name of the Okta group. */
			name: Input<string>
		} | undefined>
		saml?: Input<{

			/** The name of the SAML attribute. */
			attribute_name: Input<string>

			/** The SAML attribute value to look for. */
			attribute_value: Input<string>

			/** The ID of your SAML identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		service_token?: Input<{

			/** The ID of a Service Token. */
			token_id: Input<string>
		} | undefined>
	} | undefined>
	include: Input<{
		any_valid_service_token?: Input<{

		} | undefined>
		auth_context?: Input<{

			/** The ACID of an Authentication context. */
			ac_id: Input<string>

			/** The ID of an Authentication context. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		auth_method?: Input<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: Input<string>
		} | undefined>
		azure_ad?: Input<{

			/** The ID of an Azure group. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		certificate?: Input<{

		} | undefined>
		common_name?: Input<{

			/** The common name to match. */
			common_name: Input<string>
		} | undefined>
		device_posture?: Input<{

			/** The ID of a device posture integration. */
			integration_uid: Input<string>
		} | undefined>
		email?: Input<{

			/** The email of the user. */
			email: Input<string>
		} | undefined>
		email_domain?: Input<{

			/** The email domain to match. */
			domain: Input<string>
		} | undefined>
		email_list?: Input<{

			/** The ID of a previously created email list. */
			id: Input<string>
		} | undefined>
		everyone?: Input<{

		} | undefined>
		external_evaluation?: Input<{

			/** The API endpoint containing your business logic. */
			evaluate_url: Input<string>

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: Input<string>
		} | undefined>
		geo?: Input<{

			/** The country code that should be matched. */
			country_code: Input<string>
		} | undefined>
		github_organization?: Input<{

			/** The ID of your Github identity provider. */
			identity_provider_id: Input<string>

			/** The name of the organization. */
			name: Input<string>

			/** The name of the team */
			team?: Input<string | undefined>
		} | undefined>
		group?: Input<{

			/** The ID of a previously created Access group. */
			id: Input<string>
		} | undefined>
		gsuite?: Input<{

			/** The email of the Google Workspace group. */
			email: Input<string>

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		ip?: Input<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: Input<string>
		} | undefined>
		ip_list?: Input<{

			/** The ID of a previously created IP list. */
			id: Input<string>
		} | undefined>
		login_method?: Input<{

			/** The ID of an identity provider. */
			id: Input<string>
		} | undefined>
		okta?: Input<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: Input<string>

			/** The name of the Okta group. */
			name: Input<string>
		} | undefined>
		saml?: Input<{

			/** The name of the SAML attribute. */
			attribute_name: Input<string>

			/** The SAML attribute value to look for. */
			attribute_value: Input<string>

			/** The ID of your SAML identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		service_token?: Input<{

			/** The ID of a Service Token. */
			token_id: Input<string>
		} | undefined>
	}>

	/** Require this application to be served in an isolated browser for users matching this policy. 'Client Web Isolation' must be on for the account in order to use this feature. */
	isolation_required?: Input<boolean | undefined>

	/** The name of the Access policy. */
	name: Input<string>

	/** A custom message that will appear on the purpose justification screen. */
	purpose_justification_prompt?: Input<string | undefined>

	/** Require users to enter a justification when they log in to the application. */
	purpose_justification_required?: Input<boolean | undefined>
	require?: Input<{
		any_valid_service_token?: Input<{

		} | undefined>
		auth_context?: Input<{

			/** The ACID of an Authentication context. */
			ac_id: Input<string>

			/** The ID of an Authentication context. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		auth_method?: Input<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: Input<string>
		} | undefined>
		azure_ad?: Input<{

			/** The ID of an Azure group. */
			id: Input<string>

			/** The ID of your Azure identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		certificate?: Input<{

		} | undefined>
		common_name?: Input<{

			/** The common name to match. */
			common_name: Input<string>
		} | undefined>
		device_posture?: Input<{

			/** The ID of a device posture integration. */
			integration_uid: Input<string>
		} | undefined>
		email?: Input<{

			/** The email of the user. */
			email: Input<string>
		} | undefined>
		email_domain?: Input<{

			/** The email domain to match. */
			domain: Input<string>
		} | undefined>
		email_list?: Input<{

			/** The ID of a previously created email list. */
			id: Input<string>
		} | undefined>
		everyone?: Input<{

		} | undefined>
		external_evaluation?: Input<{

			/** The API endpoint containing your business logic. */
			evaluate_url: Input<string>

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: Input<string>
		} | undefined>
		geo?: Input<{

			/** The country code that should be matched. */
			country_code: Input<string>
		} | undefined>
		github_organization?: Input<{

			/** The ID of your Github identity provider. */
			identity_provider_id: Input<string>

			/** The name of the organization. */
			name: Input<string>

			/** The name of the team */
			team?: Input<string | undefined>
		} | undefined>
		group?: Input<{

			/** The ID of a previously created Access group. */
			id: Input<string>
		} | undefined>
		gsuite?: Input<{

			/** The email of the Google Workspace group. */
			email: Input<string>

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		ip?: Input<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: Input<string>
		} | undefined>
		ip_list?: Input<{

			/** The ID of a previously created IP list. */
			id: Input<string>
		} | undefined>
		login_method?: Input<{

			/** The ID of an identity provider. */
			id: Input<string>
		} | undefined>
		okta?: Input<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: Input<string>

			/** The name of the Okta group. */
			name: Input<string>
		} | undefined>
		saml?: Input<{

			/** The name of the SAML attribute. */
			attribute_name: Input<string>

			/** The SAML attribute value to look for. */
			attribute_value: Input<string>

			/** The ID of your SAML identity provider. */
			identity_provider_id: Input<string>
		} | undefined>
		service_token?: Input<{

			/** The ID of a Service Token. */
			token_id: Input<string>
		} | undefined>
	} | undefined>

	/** The amount of time that tokens issued for the application will be valid. Must be in the format `300ms` or `2h45m`. Valid time units are: ns, us (or µs), ms, s, m, h. */
	session_duration?: Input<string | undefined>
}

type CloudflareZeroTrustAccessPolicy = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Number of access applications currently using this policy. */
	app_count: Output<number>
	approval_groups: Output<Readonly<{

		/** The number of approvals needed to obtain access. */
		approvals_needed: number

		/** A list of emails that can approve the access request. */
		email_addresses: ReadonlyArray<string>

		/** The UUID of an re-usable email list. */
		email_list_uuid: string
	}>>

	/** Requires the user to request access from an administrator at the start of each session. */
	approval_required: Output<boolean>
	created_at: Output<string>

	/** The action Access will take if a user matches this policy. Infrastructure application policies can only use the Allow action.
Available values: "allow", "deny", "non_identity", "bypass". */
	decision: Output<string>
	exclude: Output<Readonly<{
		any_valid_service_token: Readonly<{

		}>
		auth_context: Readonly<{

			/** The ACID of an Authentication context. */
			ac_id: string

			/** The ID of an Authentication context. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		auth_method: Readonly<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: string
		}>
		azure_ad: Readonly<{

			/** The ID of an Azure group. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		certificate: Readonly<{

		}>
		common_name: Readonly<{

			/** The common name to match. */
			common_name: string
		}>
		device_posture: Readonly<{

			/** The ID of a device posture integration. */
			integration_uid: string
		}>
		email: Readonly<{

			/** The email of the user. */
			email: string
		}>
		email_domain: Readonly<{

			/** The email domain to match. */
			domain: string
		}>
		email_list: Readonly<{

			/** The ID of a previously created email list. */
			id: string
		}>
		everyone: Readonly<{

		}>
		external_evaluation: Readonly<{

			/** The API endpoint containing your business logic. */
			evaluate_url: string

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: string
		}>
		geo: Readonly<{

			/** The country code that should be matched. */
			country_code: string
		}>
		github_organization: Readonly<{

			/** The ID of your Github identity provider. */
			identity_provider_id: string

			/** The name of the organization. */
			name: string

			/** The name of the team */
			team?: string
		}>
		group: Readonly<{

			/** The ID of a previously created Access group. */
			id: string
		}>
		gsuite: Readonly<{

			/** The email of the Google Workspace group. */
			email: string

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: string
		}>
		ip: Readonly<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: string
		}>
		ip_list: Readonly<{

			/** The ID of a previously created IP list. */
			id: string
		}>
		login_method: Readonly<{

			/** The ID of an identity provider. */
			id: string
		}>
		okta: Readonly<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: string

			/** The name of the Okta group. */
			name: string
		}>
		saml: Readonly<{

			/** The name of the SAML attribute. */
			attribute_name: string

			/** The SAML attribute value to look for. */
			attribute_value: string

			/** The ID of your SAML identity provider. */
			identity_provider_id: string
		}>
		service_token: Readonly<{

			/** The ID of a Service Token. */
			token_id: string
		}>
	}>>

	/** The UUID of the policy */
	id: Output<string>
	include: Output<Readonly<{
		any_valid_service_token: Readonly<{

		}>
		auth_context: Readonly<{

			/** The ACID of an Authentication context. */
			ac_id: string

			/** The ID of an Authentication context. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		auth_method: Readonly<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: string
		}>
		azure_ad: Readonly<{

			/** The ID of an Azure group. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		certificate: Readonly<{

		}>
		common_name: Readonly<{

			/** The common name to match. */
			common_name: string
		}>
		device_posture: Readonly<{

			/** The ID of a device posture integration. */
			integration_uid: string
		}>
		email: Readonly<{

			/** The email of the user. */
			email: string
		}>
		email_domain: Readonly<{

			/** The email domain to match. */
			domain: string
		}>
		email_list: Readonly<{

			/** The ID of a previously created email list. */
			id: string
		}>
		everyone: Readonly<{

		}>
		external_evaluation: Readonly<{

			/** The API endpoint containing your business logic. */
			evaluate_url: string

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: string
		}>
		geo: Readonly<{

			/** The country code that should be matched. */
			country_code: string
		}>
		github_organization: Readonly<{

			/** The ID of your Github identity provider. */
			identity_provider_id: string

			/** The name of the organization. */
			name: string

			/** The name of the team */
			team?: string
		}>
		group: Readonly<{

			/** The ID of a previously created Access group. */
			id: string
		}>
		gsuite: Readonly<{

			/** The email of the Google Workspace group. */
			email: string

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: string
		}>
		ip: Readonly<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: string
		}>
		ip_list: Readonly<{

			/** The ID of a previously created IP list. */
			id: string
		}>
		login_method: Readonly<{

			/** The ID of an identity provider. */
			id: string
		}>
		okta: Readonly<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: string

			/** The name of the Okta group. */
			name: string
		}>
		saml: Readonly<{

			/** The name of the SAML attribute. */
			attribute_name: string

			/** The SAML attribute value to look for. */
			attribute_value: string

			/** The ID of your SAML identity provider. */
			identity_provider_id: string
		}>
		service_token: Readonly<{

			/** The ID of a Service Token. */
			token_id: string
		}>
	}>>

	/** Require this application to be served in an isolated browser for users matching this policy. 'Client Web Isolation' must be on for the account in order to use this feature. */
	isolation_required: Output<boolean>

	/** The name of the Access policy. */
	name: Output<string>

	/** A custom message that will appear on the purpose justification screen. */
	purpose_justification_prompt: Output<string | undefined>

	/** Require users to enter a justification when they log in to the application. */
	purpose_justification_required: Output<boolean>
	require: Output<Readonly<{
		any_valid_service_token: Readonly<{

		}>
		auth_context: Readonly<{

			/** The ACID of an Authentication context. */
			ac_id: string

			/** The ID of an Authentication context. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		auth_method: Readonly<{

			/** The type of authentication method https://datatracker.ietf.org/doc/html/rfc8176#section-2. */
			auth_method: string
		}>
		azure_ad: Readonly<{

			/** The ID of an Azure group. */
			id: string

			/** The ID of your Azure identity provider. */
			identity_provider_id: string
		}>
		certificate: Readonly<{

		}>
		common_name: Readonly<{

			/** The common name to match. */
			common_name: string
		}>
		device_posture: Readonly<{

			/** The ID of a device posture integration. */
			integration_uid: string
		}>
		email: Readonly<{

			/** The email of the user. */
			email: string
		}>
		email_domain: Readonly<{

			/** The email domain to match. */
			domain: string
		}>
		email_list: Readonly<{

			/** The ID of a previously created email list. */
			id: string
		}>
		everyone: Readonly<{

		}>
		external_evaluation: Readonly<{

			/** The API endpoint containing your business logic. */
			evaluate_url: string

			/** The API endpoint containing the key that Access uses to verify that the response came from your API. */
			keys_url: string
		}>
		geo: Readonly<{

			/** The country code that should be matched. */
			country_code: string
		}>
		github_organization: Readonly<{

			/** The ID of your Github identity provider. */
			identity_provider_id: string

			/** The name of the organization. */
			name: string

			/** The name of the team */
			team?: string
		}>
		group: Readonly<{

			/** The ID of a previously created Access group. */
			id: string
		}>
		gsuite: Readonly<{

			/** The email of the Google Workspace group. */
			email: string

			/** The ID of your Google Workspace identity provider. */
			identity_provider_id: string
		}>
		ip: Readonly<{

			/** An IPv4 or IPv6 CIDR block. */
			ip: string
		}>
		ip_list: Readonly<{

			/** The ID of a previously created IP list. */
			id: string
		}>
		login_method: Readonly<{

			/** The ID of an identity provider. */
			id: string
		}>
		okta: Readonly<{

			/** The ID of your Okta identity provider. */
			identity_provider_id: string

			/** The name of the Okta group. */
			name: string
		}>
		saml: Readonly<{

			/** The name of the SAML attribute. */
			attribute_name: string

			/** The SAML attribute value to look for. */
			attribute_value: string

			/** The ID of your SAML identity provider. */
			identity_provider_id: string
		}>
		service_token: Readonly<{

			/** The ID of a Service Token. */
			token_id: string
		}>
	}>>
	reusable: Output<boolean>

	/** The amount of time that tokens issued for the application will be valid. Must be in the format `300ms` or `2h45m`. Valid time units are: ns, us (or µs), ms, s, m, h. */
	session_duration: Output<string>
	updated_at: Output<string>
}>

type CloudflareDnsZoneTransfersTsigProps = {
	account_id: Input<string>

	/** TSIG algorithm. */
	algo: Input<string>

	/** TSIG key name. */
	name: Input<string>

	/** TSIG secret. */
	secret: Input<string>
}

type CloudflareDnsZoneTransfersTsig = Readonly<{
	account_id: Output<string>

	/** TSIG algorithm. */
	algo: Output<string>
	id: Output<string>

	/** TSIG key name. */
	name: Output<string>

	/** TSIG secret. */
	secret: Output<string>
}>

type CloudflareDnsZoneTransfersOutgoingProps = {

	/** Zone name. */
	name: Input<string>

	/** A list of peer tags. */
	peers: Input<Array<Input<string>>>
	zone_id: Input<string>
}

type CloudflareDnsZoneTransfersOutgoing = Readonly<{

	/** The time for a specific event. */
	checked_time: Output<string>

	/** The time for a specific event. */
	created_time: Output<string>
	id: Output<string>

	/** The time for a specific event. */
	last_transferred_time: Output<string>

	/** Zone name. */
	name: Output<string>

	/** A list of peer tags. */
	peers: ReadonlyArray<string>

	/** The serial number of the SOA for the given zone. */
	soa_serial: Output<number>
	zone_id: Output<string>
}>

type CloudflareStreamDownloadProps = {

	/** Identifier */
	account_id: Input<string>

	/** A Cloudflare-generated unique identifier for a media item. */
	identifier: Input<string>
}

type CloudflareStreamDownload = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** A Cloudflare-generated unique identifier for a media item. */
	identifier: Output<string>
}>

type CloudflareEmailSecurityImpersonationRegistryProps = {

	/** Account Identifier */
	account_id: Input<string>
	email: Input<string>
	is_email_regex: Input<boolean>
	name: Input<string>
}

type CloudflareEmailSecurityImpersonationRegistry = Readonly<{

	/** Account Identifier */
	account_id: Output<string>
	comments: Output<string>
	created_at: Output<string>
	directory_id: Output<number>
	directory_node_id: Output<number>
	email: Output<string>
	external_directory_node_id: Output<string>
	id: Output<number>
	is_email_regex: Output<boolean>
	last_modified: Output<string>
	name: Output<string>
	provenance: Output<string>
}>

type CloudflareSnippetsProps = {

	/** Content files of uploaded snippet */
	files?: Input<string | undefined>
	metadata?: Input<{

		/** Main module name of uploaded snippet */
		main_module?: Input<string | undefined>
	} | undefined>

	/** Snippet identifying name */
	snippet_name: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareSnippets = Readonly<{

	/** Creation time of the snippet */
	created_on: Output<string>

	/** Content files of uploaded snippet */
	files: Output<string | undefined>
	metadata: Output<Readonly<{

		/** Main module name of uploaded snippet */
		main_module: string
	}>>

	/** Modification time of the snippet */
	modified_on: Output<string>

	/** Snippet identifying name */
	snippet_name: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareCloudforceOneRequestMessageProps = {

	/** Identifier */
	account_identifier: Input<string>

	/** Content of message */
	content?: Input<string | undefined>

	/** UUID */
	request_identifier: Input<string>
}

type CloudflareCloudforceOneRequestMessage = Readonly<{

	/** Identifier */
	account_identifier: Output<string>

	/** Author of message */
	author: Output<string>

	/** Content of message */
	content: Output<string | undefined>

	/** Message creation time */
	created: Output<string>

	/** Message ID */
	id: Output<number>

	/** Whether the message is a follow-on request */
	is_follow_on_request: Output<boolean>

	/** UUID */
	request_identifier: Output<string>

	/** Message last updated time */
	updated: Output<string>
}>

type CloudflareUserProps = {

	/** The country in which the user lives. */
	country?: Input<string | undefined>

	/** User's first name */
	first_name?: Input<string | undefined>

	/** User's last name */
	last_name?: Input<string | undefined>

	/** User's telephone number */
	telephone?: Input<string | undefined>

	/** The zipcode or postal code where the user lives. */
	zipcode?: Input<string | undefined>
}

type CloudflareUser = Readonly<{

	/** The country in which the user lives. */
	country: Output<string | undefined>

	/** User's first name */
	first_name: Output<string | undefined>

	/** User's last name */
	last_name: Output<string | undefined>

	/** User's telephone number */
	telephone: Output<string | undefined>

	/** The zipcode or postal code where the user lives. */
	zipcode: Output<string | undefined>
}>

type CloudflareMagicNetworkMonitoringRuleProps = {
	account_id: Input<string>

	/** Toggle on if you would like Cloudflare to automatically advertise the IP Prefixes within the rule via Magic Transit when the rule is triggered. Only available for users of Magic Transit. */
	automatic_advertisement?: Input<boolean | undefined>

	/** The number of bits per second for the rule. When this value is exceeded for the set duration, an alert notification is sent. Minimum of 1 and no maximum. */
	bandwidth?: Input<number | undefined>

	/** The amount of time that the rule threshold must be exceeded to send an alert notification. The final value must be equivalent to one of the following 8 values ["1m","5m","10m","15m","20m","30m","45m","60m"].
Available values: "1m", "5m", "10m", "15m", "20m", "30m", "45m", "60m". */
	duration?: Input<string | undefined>

	/** The id of the rule. Must be unique. */
	id: Input<string>

	/** The name of the rule. Must be unique. Supports characters A-Z, a-z, 0-9, underscore (_), dash (-), period (.), and tilde (~). You can’t have a space in the rule name. Max 256 characters. */
	name: Input<string>

	/** The number of packets per second for the rule. When this value is exceeded for the set duration, an alert notification is sent. Minimum of 1 and no maximum. */
	packet_threshold?: Input<number | undefined>
	prefixes?: Input<Array<Input<string>> | undefined>
}

type CloudflareMagicNetworkMonitoringRule = Readonly<{
	account_id: Output<string>

	/** Toggle on if you would like Cloudflare to automatically advertise the IP Prefixes within the rule via Magic Transit when the rule is triggered. Only available for users of Magic Transit. */
	automatic_advertisement: Output<boolean | undefined>

	/** The number of bits per second for the rule. When this value is exceeded for the set duration, an alert notification is sent. Minimum of 1 and no maximum. */
	bandwidth: Output<number | undefined>

	/** The number of bits per second for the rule. When this value is exceeded for the set duration, an alert notification is sent. Minimum of 1 and no maximum. */
	bandwidth_threshold: Output<number>

	/** The amount of time that the rule threshold must be exceeded to send an alert notification. The final value must be equivalent to one of the following 8 values ["1m","5m","10m","15m","20m","30m","45m","60m"].
Available values: "1m", "5m", "10m", "15m", "20m", "30m", "45m", "60m". */
	duration: Output<string>

	/** The id of the rule. Must be unique. */
	id: Output<string>

	/** The name of the rule. Must be unique. Supports characters A-Z, a-z, 0-9, underscore (_), dash (-), period (.), and tilde (~). You can’t have a space in the rule name. Max 256 characters. */
	name: Output<string>

	/** The number of packets per second for the rule. When this value is exceeded for the set duration, an alert notification is sent. Minimum of 1 and no maximum. */
	packet_threshold: Output<number | undefined>

	/** Prefix match type to be applied for a prefix auto advertisement when using an advanced_ddos rule.
Available values: "exact", "subnet", "supernet". */
	prefix_match: Output<string>
	prefixes: ReadonlyArray<string>

	/** MNM rule type.
Available values: "threshold", "zscore", "advanced_ddos". */
	type: Output<string>

	/** Level of sensitivity set for zscore rules.
Available values: "low", "medium", "high". */
	zscore_sensitivity: Output<string>

	/** Target of the zscore rule analysis.
Available values: "bits", "packets". */
	zscore_target: Output<string>
}>

type CloudflareZeroTrustDevicePostureIntegrationProps = {
	account_id: Input<string>
	config: Input<{

		/** If present, this id will be passed in the `CF-Access-Client-ID` header when hitting the `api_url` */
		access_client_id?: Input<string | undefined>

		/** If present, this secret will be passed in the `CF-Access-Client-Secret` header when hitting the `api_url` */
		access_client_secret?: Input<string | undefined>

		/** The Workspace One API URL provided in the Workspace One Admin Dashboard. */
		api_url?: Input<string | undefined>

		/** The Workspace One Authorization URL depending on your region. */
		auth_url?: Input<string | undefined>

		/** The Workspace One client ID provided in the Workspace One Admin Dashboard. */
		client_id?: Input<string | undefined>

		/** The Uptycs client secret. */
		client_key?: Input<string | undefined>

		/** The Workspace One client secret provided in the Workspace One Admin Dashboard. */
		client_secret?: Input<string | undefined>

		/** The Crowdstrike customer ID. */
		customer_id?: Input<string | undefined>
	}>

	/** The interval between each posture check with the third-party API. Use `m` for minutes (e.g. `5m`) and `h` for hours (e.g. `12h`). */
	interval: Input<string>

	/** The name of the device posture integration. */
	name: Input<string>

	/** The type of device posture integration.
Available values: "workspace_one", "crowdstrike_s2s", "uptycs", "intune", "kolide", "tanium", "sentinelone_s2s", "custom_s2s". */
	type: Input<string>
}

type CloudflareZeroTrustDevicePostureIntegration = Readonly<{
	account_id: Output<string>
	config: Output<Readonly<{

		/** If present, this id will be passed in the `CF-Access-Client-ID` header when hitting the `api_url` */
		access_client_id: string

		/** If present, this secret will be passed in the `CF-Access-Client-Secret` header when hitting the `api_url` */
		access_client_secret: string

		/** The Workspace One API URL provided in the Workspace One Admin Dashboard. */
		api_url: string

		/** The Workspace One Authorization URL depending on your region. */
		auth_url: string

		/** The Workspace One client ID provided in the Workspace One Admin Dashboard. */
		client_id: string

		/** The Uptycs client secret. */
		client_key: string

		/** The Workspace One client secret provided in the Workspace One Admin Dashboard. */
		client_secret: string

		/** The Crowdstrike customer ID. */
		customer_id: string
	}>>

	/** API UUID. */
	id: Output<string>

	/** The interval between each posture check with the third-party API. Use `m` for minutes (e.g. `5m`) and `h` for hours (e.g. `12h`). */
	interval: Output<string>

	/** The name of the device posture integration. */
	name: Output<string>

	/** The type of device posture integration.
Available values: "workspace_one", "crowdstrike_s2s", "uptycs", "intune", "kolide", "tanium", "sentinelone_s2s", "custom_s2s". */
	type: Output<string>
}>

type CloudflareImageProps = {

	/** Account identifier tag. */
	account_id: Input<string>

	/** An image binary data. Only needed when type is uploading a file. */
	file?: Input<string | undefined>

	/** User modifiable key-value store. Can use used for keeping references to another system of record for managing images. */
	metadata?: Input<string | undefined>

	/** Indicates whether the image requires a signature token for the access. */
	require_signed_urls?: Input<boolean | undefined>

	/** A URL to fetch an image from origin. Only needed when type is uploading from a URL. */
	url?: Input<string | undefined>
}

type CloudflareImage = Readonly<{

	/** Account identifier tag. */
	account_id: Output<string>

	/** An image binary data. Only needed when type is uploading a file. */
	file: Output<string | undefined>

	/** Image file name. */
	filename: Output<string>

	/** Image unique identifier. */
	id: Output<string>

	/** User modifiable key-value store. Can be used for keeping references to another system of record for managing images. Metadata must not exceed 1024 bytes. */
	meta: Output<string>

	/** User modifiable key-value store. Can use used for keeping references to another system of record for managing images. */
	metadata: Output<string | undefined>

	/** Indicates whether the image requires a signature token for the access. */
	require_signed_urls: Output<boolean>

	/** When the media item was uploaded. */
	uploaded: Output<string>

	/** A URL to fetch an image from origin. Only needed when type is uploading from a URL. */
	url: Output<string | undefined>

	/** Object specifying available variants for an image. */
	variants: ReadonlyArray<string>
}>

type CloudflareTieredCacheProps = {

	/** Enable or disable the Smart Tiered Cache
Available values: "on", "off". */
	value: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareTieredCache = Readonly<{

	/** Whether the setting is editable */
	editable: Output<boolean>

	/** Identifier */
	id: Output<string>

	/** Last time this setting was modified. */
	modified_on: Output<string>

	/** Enable or disable the Smart Tiered Cache
Available values: "on", "off". */
	value: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareMagicTransitSiteWanProps = {

	/** Identifier */
	account_id: Input<string>
	name?: Input<string | undefined>
	physport: Input<number>
	priority?: Input<number | undefined>

	/** Identifier */
	site_id: Input<string>
	static_addressing?: Input<{

		/** A valid CIDR notation representing an IP range. */
		address: Input<string>

		/** A valid IPv4 address. */
		gateway_address: Input<string>

		/** A valid CIDR notation representing an IP range. */
		secondary_address?: Input<string | undefined>
	} | undefined>

	/** VLAN port number. */
	vlan_tag: Input<number>
}

type CloudflareMagicTransitSiteWan = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Magic WAN health check rate for tunnels created on this link. The default value is `mid`.
Available values: "low", "mid", "high". */
	health_check_rate: Output<string>

	/** Identifier */
	id: Output<string>
	name: Output<string | undefined>
	physport: Output<number>
	priority: Output<number | undefined>

	/** Identifier */
	site_id: Output<string>
	static_addressing: Output<Readonly<{

		/** A valid CIDR notation representing an IP range. */
		address: string

		/** A valid IPv4 address. */
		gateway_address: string

		/** A valid CIDR notation representing an IP range. */
		secondary_address: string
	}>>

	/** VLAN port number. */
	vlan_tag: Output<number>
}>

type CloudflareR2ManagedDomainProps = {

	/** Account ID */
	account_id: Input<string>

	/** Name of the bucket */
	bucket_name: Input<string>

	/** Whether to enable public bucket access at the r2.dev domain */
	enabled: Input<boolean>

	/** Jurisdiction of the bucket */
	jurisdiction?: Input<string | undefined>
}

type CloudflareR2ManagedDomain = Readonly<{

	/** Account ID */
	account_id: Output<string>

	/** Bucket ID */
	bucket_id: Output<string>

	/** Name of the bucket */
	bucket_name: Output<string>

	/** Domain name of the bucket's r2.dev domain */
	domain: Output<string>

	/** Whether to enable public bucket access at the r2.dev domain */
	enabled: Output<boolean>

	/** Jurisdiction of the bucket */
	jurisdiction: Output<string>
}>

type CloudflareCloudforceOneRequestAssetProps = {

	/** Identifier */
	account_identifier: Input<string>

	/** Page number of results */
	page: Input<number>

	/** Number of results per page */
	per_page: Input<number>

	/** UUID */
	request_identifier: Input<string>

	/** Asset file to upload */
	source?: Input<string | undefined>
}

type CloudflareCloudforceOneRequestAsset = Readonly<{

	/** Identifier */
	account_identifier: Output<string>

	/** Asset creation time */
	created: Output<string>

	/** Asset description */
	description: Output<string>

	/** Asset file type */
	file_type: Output<string>

	/** Asset ID */
	id: Output<number>

	/** Asset name */
	name: Output<string>

	/** Page number of results */
	page: Output<number>

	/** Number of results per page */
	per_page: Output<number>

	/** UUID */
	request_identifier: Output<string>

	/** Asset file to upload */
	source: Output<string | undefined>
}>

type CloudflareQueueConsumerProps = {

	/** A Resource identifier. */
	account_id: Input<string>

	/** A Resource identifier. */
	consumer_id?: Input<string | undefined>
	dead_letter_queue?: Input<string | undefined>

	/** A Resource identifier. */
	queue_id: Input<string>

	/** Name of a Worker */
	script_name?: Input<string | undefined>
	settings?: Input<{

		/** The maximum number of messages to include in a batch. */
		batch_size?: Input<number | undefined>

		/** Maximum number of concurrent consumers that may consume from this Queue. Set to `null` to automatically opt in to the platform's maximum (recommended). */
		max_concurrency?: Input<number | undefined>

		/** The maximum number of retries */
		max_retries?: Input<number | undefined>

		/** The number of milliseconds to wait for a batch to fill up before attempting to deliver it */
		max_wait_time_ms?: Input<number | undefined>

		/** The number of seconds to delay before making the message available for another attempt. */
		retry_delay?: Input<number | undefined>

		/** The number of milliseconds that a message is exclusively leased. After the timeout, the message becomes available for another attempt. */
		visibility_timeout_ms?: Input<number | undefined>
	} | undefined>

	/** Available values: "worker". */
	type?: Input<string | undefined>
}

type CloudflareQueueConsumer = Readonly<{

	/** A Resource identifier. */
	account_id: Output<string>

	/** A Resource identifier. */
	consumer_id: Output<string | undefined>
	created_on: Output<string>
	dead_letter_queue: Output<string | undefined>

	/** A Resource identifier. */
	queue_id: Output<string>

	/** Name of a Worker */
	script: Output<string>

	/** Name of a Worker */
	script_name: Output<string | undefined>
	settings: Output<Readonly<{

		/** The maximum number of messages to include in a batch. */
		batch_size: number

		/** Maximum number of concurrent consumers that may consume from this Queue. Set to `null` to automatically opt in to the platform's maximum (recommended). */
		max_concurrency: number

		/** The maximum number of retries */
		max_retries: number

		/** The number of milliseconds to wait for a batch to fill up before attempting to deliver it */
		max_wait_time_ms: number

		/** The number of seconds to delay before making the message available for another attempt. */
		retry_delay: number

		/** The number of milliseconds that a message is exclusively leased. After the timeout, the message becomes available for another attempt. */
		visibility_timeout_ms: number
	}>>

	/** Available values: "worker". */
	type: Output<string | undefined>
}>

type CloudflareManagedTransformsProps = {
	managed_request_headers: Input<{

		/** Whether the Managed Transform is enabled. */
		enabled: Input<boolean>

		/** The human-readable identifier of the Managed Transform. */
		id: Input<string>
	}>
	managed_response_headers: Input<{

		/** Whether the Managed Transform is enabled. */
		enabled: Input<boolean>

		/** The human-readable identifier of the Managed Transform. */
		id: Input<string>
	}>

	/** The unique ID of the zone. */
	zone_id: Input<string>
}

type CloudflareManagedTransforms = Readonly<{

	/** The unique ID of the zone. */
	id: Output<string>
	managed_request_headers: Output<Readonly<{

		/** The Managed Transforms that this Managed Transform conflicts with. */
		conflicts_with: ReadonlyArray<string>

		/** Whether the Managed Transform is enabled. */
		enabled: boolean

		/** Whether the Managed Transform conflicts with the currently-enabled Managed Transforms. */
		has_conflict: boolean

		/** The human-readable identifier of the Managed Transform. */
		id: string
	}>>
	managed_response_headers: Output<Readonly<{

		/** The Managed Transforms that this Managed Transform conflicts with. */
		conflicts_with: ReadonlyArray<string>

		/** Whether the Managed Transform is enabled. */
		enabled: boolean

		/** Whether the Managed Transform conflicts with the currently-enabled Managed Transforms. */
		has_conflict: boolean

		/** The human-readable identifier of the Managed Transform. */
		id: string
	}>>

	/** The unique ID of the zone. */
	zone_id: Output<string>
}>

type CloudflareEmailRoutingCatchAllProps = {
	actions: Input<{

		/** Type of action for catch-all rule.
Available values: "drop", "forward", "worker". */
		type: Input<string>
		value?: Input<Array<Input<string>> | undefined>
	}>

	/** Routing rule status. */
	enabled?: Input<boolean | undefined>
	matchers: Input<{

		/** Type of matcher. Default is 'all'.
Available values: "all". */
		type: Input<string>
	}>

	/** Routing rule name. */
	name?: Input<string | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareEmailRoutingCatchAll = Readonly<{
	actions: Output<Readonly<{

		/** Type of action for catch-all rule.
Available values: "drop", "forward", "worker". */
		type: string
		value: ReadonlyArray<string>
	}>>

	/** Routing rule status. */
	enabled: Output<boolean>

	/** Identifier */
	id: Output<string>
	matchers: Output<Readonly<{

		/** Type of matcher. Default is 'all'.
Available values: "all". */
		type: string
	}>>

	/** Routing rule name. */
	name: Output<string | undefined>

	/** Routing rule tag. (Deprecated, replaced by routing rule identifier) */
	tag: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareCustomPagesProps = {

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id?: Input<string | undefined>

	/** Identifier */
	identifier: Input<string>

	/** The custom page state.
Available values: "default", "customized". */
	state: Input<string>

	/** The URL associated with the custom page. */
	url: Input<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id?: Input<string | undefined>
}

type CloudflareCustomPages = Readonly<{

	/** The Account ID to use for this endpoint. Mutually exclusive with the Zone ID. */
	account_id: Output<string | undefined>

	/** Identifier */
	id: Output<string>

	/** Identifier */
	identifier: Output<string>

	/** The custom page state.
Available values: "default", "customized". */
	state: Output<string>

	/** The URL associated with the custom page. */
	url: Output<string>

	/** The Zone ID to use for this endpoint. Mutually exclusive with the Account ID. */
	zone_id: Output<string | undefined>
}>

type CloudflareKeylessCertificateProps = {

	/** A ubiquitous bundle has the highest probability of being verified everywhere, even by clients using outdated or unusual trust stores. An optimal bundle uses the shortest chain and newest intermediates. And the force bundle verifies the chain, but does not otherwise modify it.
Available values: "ubiquitous", "optimal", "force". */
	bundle_method?: Input<string | undefined>

	/** The zone's SSL certificate or SSL certificate and intermediate(s). */
	certificate: Input<string>

	/** Whether or not the Keyless SSL is on or off. */
	enabled?: Input<boolean | undefined>

	/** The keyless SSL name. */
	host: Input<string>

	/** The keyless SSL name. */
	name?: Input<string | undefined>

	/** The keyless SSL port used to communicate between Cloudflare and the client's Keyless SSL server. */
	port?: Input<number | undefined>
	tunnel?: Input<{

		/** Private IP of the Key Server Host */
		private_ip: Input<string>

		/** Cloudflare Tunnel Virtual Network ID */
		vnet_id: Input<string>
	} | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareKeylessCertificate = Readonly<{

	/** A ubiquitous bundle has the highest probability of being verified everywhere, even by clients using outdated or unusual trust stores. An optimal bundle uses the shortest chain and newest intermediates. And the force bundle verifies the chain, but does not otherwise modify it.
Available values: "ubiquitous", "optimal", "force". */
	bundle_method: Output<string>

	/** The zone's SSL certificate or SSL certificate and intermediate(s). */
	certificate: Output<string>

	/** When the Keyless SSL was created. */
	created_on: Output<string>

	/** Whether or not the Keyless SSL is on or off. */
	enabled: Output<boolean | undefined>

	/** The keyless SSL name. */
	host: Output<string>

	/** Keyless certificate identifier tag. */
	id: Output<string>

	/** When the Keyless SSL was last modified. */
	modified_on: Output<string>

	/** The keyless SSL name. */
	name: Output<string | undefined>

	/** Available permissions for the Keyless SSL for the current user requesting the item. */
	permissions: ReadonlyArray<string>

	/** The keyless SSL port used to communicate between Cloudflare and the client's Keyless SSL server. */
	port: Output<number>

	/** Status of the Keyless SSL.
Available values: "active", "deleted". */
	status: Output<string>
	tunnel: Output<Readonly<{

		/** Private IP of the Key Server Host */
		private_ip: string

		/** Cloudflare Tunnel Virtual Network ID */
		vnet_id: string
	}>>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareCloudforceOneRequestPriorityProps = {

	/** Identifier */
	account_identifier: Input<string>

	/** List of labels */
	labels: Input<Array<Input<string>>>

	/** Priority */
	priority: Input<number>

	/** Requirement */
	requirement: Input<string>

	/** The CISA defined Traffic Light Protocol (TLP)
Available values: "clear", "amber", "amber-strict", "green", "red". */
	tlp: Input<string>
}

type CloudflareCloudforceOneRequestPriority = Readonly<{

	/** Identifier */
	account_identifier: Output<string>
	completed: Output<string>

	/** Request content */
	content: Output<string>
	created: Output<string>

	/** UUID */
	id: Output<string>

	/** List of labels */
	labels: ReadonlyArray<string>

	/** Tokens for the request messages */
	message_tokens: Output<number>

	/** Priority */
	priority: Output<number>

	/** Readable Request ID */
	readable_id: Output<string>

	/** Requested information from request */
	request: Output<string>

	/** Requirement */
	requirement: Output<string>

	/** Request Status
Available values: "open", "accepted", "reported", "approved", "completed", "declined". */
	status: Output<string>

	/** Brief description of the request */
	summary: Output<string>

	/** The CISA defined Traffic Light Protocol (TLP)
Available values: "clear", "amber", "amber-strict", "green", "red". */
	tlp: Output<string>

	/** Tokens for the request */
	tokens: Output<number>
	updated: Output<string>
}>

type CloudflareRegistrarDomainProps = {

	/** Identifier */
	account_id: Input<string>

	/** Auto-renew controls whether subscription is automatically renewed upon domain expiration. */
	auto_renew?: Input<boolean | undefined>

	/** Domain name. */
	domain_name: Input<string>

	/** Shows whether a registrar lock is in place for a domain. */
	locked?: Input<boolean | undefined>

	/** Privacy option controls redacting WHOIS information. */
	privacy?: Input<boolean | undefined>
}

type CloudflareRegistrarDomain = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Auto-renew controls whether subscription is automatically renewed upon domain expiration. */
	auto_renew: Output<boolean | undefined>

	/** Domain name. */
	domain_name: Output<string>

	/** Shows whether a registrar lock is in place for a domain. */
	locked: Output<boolean | undefined>

	/** Privacy option controls redacting WHOIS information. */
	privacy: Output<boolean | undefined>
}>

type CloudflareZoneHoldProps = {

	/** If `hold_after` is provided and future-dated, the hold will be temporarily disabled,
then automatically re-enabled by the system at the time specified
in this RFC3339-formatted timestamp. A past-dated `hold_after` value will have
no effect on an existing, enabled hold. Providing an empty string will set its value
to the current time. */
	hold_after?: Input<string | undefined>

	/** If `true`, the zone hold will extend to block any subdomain of the given zone, as well
as SSL4SaaS Custom Hostnames. For example, a zone hold on a zone with the hostname
'example.com' and include_subdomains=true will block 'example.com',
'staging.example.com', 'api.staging.example.com', etc. */
	include_subdomains?: Input<boolean | undefined>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareZoneHold = Readonly<{
	hold: Output<boolean>

	/** If `hold_after` is provided and future-dated, the hold will be temporarily disabled,
then automatically re-enabled by the system at the time specified
in this RFC3339-formatted timestamp. A past-dated `hold_after` value will have
no effect on an existing, enabled hold. Providing an empty string will set its value
to the current time. */
	hold_after: Output<string>

	/** Identifier */
	id: Output<string>

	/** If `true`, the zone hold will extend to block any subdomain of the given zone, as well
as SSL4SaaS Custom Hostnames. For example, a zone hold on a zone with the hostname
'example.com' and include_subdomains=true will block 'example.com',
'staging.example.com', 'api.staging.example.com', etc. */
	include_subdomains: Output<boolean>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareCloudforceOneRequestProps = {

	/** Identifier */
	account_identifier: Input<string>

	/** Request content */
	content?: Input<string | undefined>

	/** Priority for analyzing the request */
	priority?: Input<string | undefined>

	/** Requested information from request */
	request_type?: Input<string | undefined>

	/** Brief description of the request */
	summary?: Input<string | undefined>

	/** The CISA defined Traffic Light Protocol (TLP)
Available values: "clear", "amber", "amber-strict", "green", "red". */
	tlp?: Input<string | undefined>
}

type CloudflareCloudforceOneRequest = Readonly<{

	/** Identifier */
	account_identifier: Output<string>
	completed: Output<string>

	/** Request content */
	content: Output<string | undefined>
	created: Output<string>

	/** UUID */
	id: Output<string>

	/** Tokens for the request messages */
	message_tokens: Output<number>

	/** Priority for analyzing the request */
	priority: Output<string | undefined>

	/** Readable Request ID */
	readable_id: Output<string>

	/** Requested information from request */
	request: Output<string>

	/** Requested information from request */
	request_type: Output<string | undefined>

	/** Request Status
Available values: "open", "accepted", "reported", "approved", "completed", "declined". */
	status: Output<string>

	/** Brief description of the request */
	summary: Output<string | undefined>

	/** The CISA defined Traffic Light Protocol (TLP)
Available values: "clear", "amber", "amber-strict", "green", "red". */
	tlp: Output<string | undefined>

	/** Tokens for the request */
	tokens: Output<number>
	updated: Output<string>
}>

type CloudflareContentScanningExpressionProps = {
	body: Input<{

		/** Ruleset expression to use in matching content objects */
		payload: Input<string>
	}>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareContentScanningExpression = Readonly<{
	body: Output<Readonly<{

		/** Ruleset expression to use in matching content objects */
		payload: string
	}>>

	/** The unique ID for this custom scan expression */
	id: Output<string>

	/** Ruleset expression to use in matching content objects */
	payload: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareWorkersForPlatformsDispatchNamespaceProps = {

	/** Identifier */
	account_id: Input<string>

	/** The name of the dispatch namespace */
	name?: Input<string | undefined>
}

type CloudflareWorkersForPlatformsDispatchNamespace = Readonly<{

	/** Identifier */
	account_id: Output<string>

	/** Identifier */
	created_by: Output<string>

	/** When the script was created. */
	created_on: Output<string>

	/** Name of the Workers for Platforms dispatch namespace. */
	id: Output<string>

	/** Identifier */
	modified_by: Output<string>

	/** When the script was last modified. */
	modified_on: Output<string>

	/** The name of the dispatch namespace */
	name: Output<string | undefined>

	/** API Resource UUID tag. */
	namespace_id: Output<string>

	/** Name of the Workers for Platforms dispatch namespace. */
	namespace_name: Output<string>

	/** The current number of scripts in this Dispatch Namespace */
	script_count: Output<number>
}>

type CloudflareEmailSecurityTrustedDomainsProps = {

	/** Account Identifier */
	account_id: Input<string>
	body?: Input<{
		comments?: Input<string | undefined>

		/** Select to prevent recently registered domains from triggering a
Suspicious or Malicious disposition. */
		is_recent: Input<boolean>
		is_regex: Input<boolean>

		/** Select for partner or other approved domains that have similar
spelling to your connected domains. Prevents listed domains from
triggering a Spoof disposition. */
		is_similarity: Input<boolean>
		pattern: Input<string>
	} | undefined>
	comments?: Input<string | undefined>

	/** Select to prevent recently registered domains from triggering a
Suspicious or Malicious disposition. */
	is_recent?: Input<boolean | undefined>
	is_regex?: Input<boolean | undefined>

	/** Select for partner or other approved domains that have similar
spelling to your connected domains. Prevents listed domains from
triggering a Spoof disposition. */
	is_similarity?: Input<boolean | undefined>
	pattern?: Input<string | undefined>
}

type CloudflareEmailSecurityTrustedDomains = Readonly<{

	/** Account Identifier */
	account_id: Output<string>
	body: Output<Readonly<{
		comments: string

		/** Select to prevent recently registered domains from triggering a
Suspicious or Malicious disposition. */
		is_recent: boolean
		is_regex: boolean

		/** Select for partner or other approved domains that have similar
spelling to your connected domains. Prevents listed domains from
triggering a Spoof disposition. */
		is_similarity: boolean
		pattern: string
	}>>
	comments: Output<string | undefined>
	created_at: Output<string>

	/** The unique identifier for the trusted domain. */
	id: Output<number>

	/** Select to prevent recently registered domains from triggering a
Suspicious or Malicious disposition. */
	is_recent: Output<boolean | undefined>
	is_regex: Output<boolean | undefined>

	/** Select for partner or other approved domains that have similar
spelling to your connected domains. Prevents listed domains from
triggering a Spoof disposition. */
	is_similarity: Output<boolean | undefined>
	last_modified: Output<string>
	pattern: Output<string | undefined>
}>

type CloudflareZeroTrustDeviceCustomProfileLocalDomainFallbackProps = {
	account_id: Input<string>
	domains: Input<{

		/** A description of the fallback domain, displayed in the client UI. */
		description?: Input<string | undefined>

		/** A list of IP addresses to handle domain resolution. */
		dns_server?: Input<Array<Input<string>> | undefined>

		/** The domain suffix to match when resolving locally. */
		suffix: Input<string>
	}>

	/** Device ID. */
	policy_id: Input<string>
}

type CloudflareZeroTrustDeviceCustomProfileLocalDomainFallback = Readonly<{
	account_id: Output<string>

	/** A description of the fallback domain, displayed in the client UI. */
	description: Output<string>

	/** A list of IP addresses to handle domain resolution. */
	dns_server: ReadonlyArray<string>
	domains: Output<Readonly<{

		/** A description of the fallback domain, displayed in the client UI. */
		description: string

		/** A list of IP addresses to handle domain resolution. */
		dns_server: ReadonlyArray<string>

		/** The domain suffix to match when resolving locally. */
		suffix: string
	}>>

	/** Device ID. */
	id: Output<string>

	/** Device ID. */
	policy_id: Output<string>

	/** The domain suffix to match when resolving locally. */
	suffix: Output<string>
}>

type CloudflareWaitingRoomRulesProps = {
	rules: Input<{

		/** The action to take when the expression matches.
Available values: "bypass_waiting_room". */
		action: Input<string>

		/** The description of the rule. */
		description?: Input<string | undefined>

		/** When set to true, the rule is enabled. */
		enabled?: Input<boolean | undefined>

		/** Criteria defining when there is a match for the current rule. */
		expression: Input<string>
	}>
	waiting_room_id: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareWaitingRoomRules = Readonly<{

	/** The action to take when the expression matches.
Available values: "bypass_waiting_room". */
	action: Output<string>

	/** The description of the rule. */
	description: Output<string>

	/** When set to true, the rule is enabled. */
	enabled: Output<boolean>

	/** Criteria defining when there is a match for the current rule. */
	expression: Output<string>

	/** The ID of the rule. */
	id: Output<string>
	last_updated: Output<string>
	rules: Output<Readonly<{

		/** The action to take when the expression matches.
Available values: "bypass_waiting_room". */
		action: string

		/** The description of the rule. */
		description: string

		/** When set to true, the rule is enabled. */
		enabled: boolean

		/** Criteria defining when there is a match for the current rule. */
		expression: string
	}>>

	/** The version of the rule. */
	version: Output<string>
	waiting_room_id: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareEmailRoutingDnsProps = {

	/** Domain of your zone. */
	name: Input<string>

	/** Identifier */
	zone_id: Input<string>
}

type CloudflareEmailRoutingDns = Readonly<{

	/** The date and time the settings have been created. */
	created: Output<string>

	/** State of the zone settings for Email Routing. */
	enabled: Output<boolean>
	errors: Output<Readonly<{
		code: number
		message: string
	}>>

	/** Identifier */
	id: Output<string>
	messages: Output<Readonly<{
		code: number
		message: string
	}>>

	/** The date and time the settings have been modified. */
	modified: Output<string>

	/** Domain of your zone. */
	name: Output<string>
	result: Output<Readonly<{

		/** DNS record content. */
		content: string
		errors: Readonly<{
			code: string
			missing: Readonly<{

				/** DNS record content. */
				content: string

				/** DNS record name (or @ for the zone apex). */
				name: string

				/** Required for MX, SRV and URI records. Unused by other record types. Records with lower priorities are preferred. */
				priority: number

				/** Time to live, in seconds, of the DNS record. Must be between 60 and 86400, or 1 for 'automatic'. */
				ttl: number

				/** DNS record type.
Available values: "A", "AAAA", "CNAME", "HTTPS", "TXT", "SRV", "LOC", "MX", "NS", "CERT", "DNSKEY", "DS", "NAPTR", "SMIMEA", "SSHFP", "SVCB", "TLSA", "URI". */
				type: string
			}>
		}>

		/** DNS record name (or @ for the zone apex). */
		name: string

		/** Required for MX, SRV and URI records. Unused by other record types. Records with lower priorities are preferred. */
		priority: number
		record: Readonly<{

			/** DNS record content. */
			content: string

			/** DNS record name (or @ for the zone apex). */
			name: string

			/** Required for MX, SRV and URI records. Unused by other record types. Records with lower priorities are preferred. */
			priority: number

			/** Time to live, in seconds, of the DNS record. Must be between 60 and 86400, or 1 for 'automatic'. */
			ttl: number

			/** DNS record type.
Available values: "A", "AAAA", "CNAME", "HTTPS", "TXT", "SRV", "LOC", "MX", "NS", "CERT", "DNSKEY", "DS", "NAPTR", "SMIMEA", "SSHFP", "SVCB", "TLSA", "URI". */
			type: string
		}>

		/** Time to live, in seconds, of the DNS record. Must be between 60 and 86400, or 1 for 'automatic'. */
		ttl: number

		/** DNS record type.
Available values: "A", "AAAA", "CNAME", "HTTPS", "TXT", "SRV", "LOC", "MX", "NS", "CERT", "DNSKEY", "DS", "NAPTR", "SMIMEA", "SSHFP", "SVCB", "TLSA", "URI". */
		type: string
	}>>
	result_info: Output<Readonly<{

		/** Total number of results for the requested service */
		count: number

		/** Current page within paginated list of results */
		page: number

		/** Number of results per page of results */
		per_page: number

		/** Total results available without any search parameters */
		total_count: number
	}>>

	/** Flag to check if the user skipped the configuration wizard. */
	skip_wizard: Output<boolean>

	/** Show the state of your account, and the type or configuration error.
Available values: "ready", "unconfigured", "misconfigured", "misconfigured/locked", "unlocked". */
	status: Output<string>

	/** Whether the API call was successful */
	success: Output<boolean>

	/** Email Routing settings tag. (Deprecated, replaced by Email Routing settings identifier) */
	tag: Output<string>

	/** Identifier */
	zone_id: Output<string>
}>

type CloudflareZeroTrustDlpDatasetProps = {
	account_id: Input<string>
	dataset_id?: Input<string | undefined>

	/** The description of the dataset */
	description?: Input<string | undefined>

	/** Dataset encoding version

Non-secret custom word lists with no header are always version 1.
Secret EDM lists with no header are version 1.
Multicolumn CSV with headers are version 2.
Omitting this field provides the default value 0, which is interpreted
the same as 1. */
	encoding_version?: Input<number | undefined>
	name: Input<string>

	/** Generate a secret dataset.

If true, the response will include a secret to use with the EDM encoder.
If false, the response has no secret and the dataset is uploaded in plaintext. */
	secret?: Input<boolean | undefined>
}

type CloudflareZeroTrustDlpDataset = Readonly<{
	account_id: Output<string>
	columns: Output<Readonly<{
		entry_id: string
		header_name: string
		num_cells: number

		/** Available values: "empty", "uploading", "processing", "failed", "complete". */
		upload_status: string
	}>>
	created_at: Output<string>
	dataset: Output<Readonly<{
		columns: Readonly<{
			entry_id: string
			header_name: string
			num_cells: number

			/** Available values: "empty", "uploading", "processing", "failed", "complete". */
			upload_status: string
		}>
		created_at: string

		/** The description of the dataset */
		description: string
		encoding_version: number
		id: string
		name: string
		num_cells: number
		secret: boolean

		/** Available values: "empty", "uploading", "processing", "failed", "complete". */
		status: string

		/** When the dataset was last updated.

This includes name or description changes as well as uploads. */
		updated_at: string
		uploads: Readonly<{
			num_cells: number

			/** Available values: "empty", "uploading", "processing", "failed", "complete". */
			status: string
			version: number
		}>
	}>>
	dataset_id: Output<string | undefined>

	/** The description of the dataset */
	description: Output<string | undefined>

	/** Dataset encoding version

Non-secret custom word lists with no header are always version 1.
Secret EDM lists with no header are version 1.
Multicolumn CSV with headers are version 2.
Omitting this field provides the default value 0, which is interpreted
the same as 1. */
	encoding_version: Output<number | undefined>
	id: Output<string>
	max_cells: Output<number>
	name: Output<string>
	num_cells: Output<number>

	/** Generate a secret dataset.

If true, the response will include a secret to use with the EDM encoder.
If false, the response has no secret and the dataset is uploaded in plaintext. */
	secret: Output<boolean | undefined>

	/** Available values: "empty", "uploading", "processing", "failed", "complete". */
	status: Output<string>

	/** When the dataset was last updated.

This includes name or description changes as well as uploads. */
	updated_at: Output<string>
	uploads: Output<Readonly<{
		num_cells: number

		/** Available values: "empty", "uploading", "processing", "failed", "complete". */
		status: string
		version: number
	}>>

	/** The version to use when uploading the dataset. */
	version: Output<number>
}>

declare global {
	interface TerraformResources {
		cloudflare: {
			workers: {
				Deployment: ResourceClass<CloudflareWorkersDeploymentProps, CloudflareWorkersDeployment, "cloudflare_workers_deployment">
				Secret: ResourceClass<CloudflareWorkersSecretProps, CloudflareWorkersSecret, "cloudflare_workers_secret">
				KvNamespace: ResourceClass<CloudflareWorkersKvNamespaceProps, CloudflareWorkersKvNamespace, "cloudflare_workers_kv_namespace">
				Script: ResourceClass<CloudflareWorkersScriptProps, CloudflareWorkersScript, "cloudflare_workers_script">
				CustomDomain: ResourceClass<CloudflareWorkersCustomDomainProps, CloudflareWorkersCustomDomain, "cloudflare_workers_custom_domain">
				Route: ResourceClass<CloudflareWorkersRouteProps, CloudflareWorkersRoute, "cloudflare_workers_route">
				ScriptSubdomain: ResourceClass<CloudflareWorkersScriptSubdomainProps, CloudflareWorkersScriptSubdomain, "cloudflare_workers_script_subdomain">
				CronTrigger: ResourceClass<CloudflareWorkersCronTriggerProps, CloudflareWorkersCronTrigger, "cloudflare_workers_cron_trigger">
				Kv: ResourceClass<CloudflareWorkersKvProps, CloudflareWorkersKv, "cloudflare_workers_kv">
				ForPlatformsDispatchNamespace: ResourceClass<CloudflareWorkersForPlatformsDispatchNamespaceProps, CloudflareWorkersForPlatformsDispatchNamespace, "cloudflare_workers_for_platforms_dispatch_namespace">
			}
			zone: {
				Setting: ResourceClass<CloudflareZoneSettingProps, CloudflareZoneSetting, "cloudflare_zone_setting">
				Lockdown: ResourceClass<CloudflareZoneLockdownProps, CloudflareZoneLockdown, "cloudflare_zone_lockdown">
				Dnssec: ResourceClass<CloudflareZoneDnssecProps, CloudflareZoneDnssec, "cloudflare_zone_dnssec">
				CacheVariants: ResourceClass<CloudflareZoneCacheVariantsProps, CloudflareZoneCacheVariants, "cloudflare_zone_cache_variants">
				CacheReserve: ResourceClass<CloudflareZoneCacheReserveProps, CloudflareZoneCacheReserve, "cloudflare_zone_cache_reserve">
				DnsSettings: ResourceClass<CloudflareZoneDnsSettingsProps, CloudflareZoneDnsSettings, "cloudflare_zone_dns_settings">
				Subscription: ResourceClass<CloudflareZoneSubscriptionProps, CloudflareZoneSubscription, "cloudflare_zone_subscription">
				Hold: ResourceClass<CloudflareZoneHoldProps, CloudflareZoneHold, "cloudflare_zone_hold">
			}
			zero: {
				TrustAccessCustomPage: ResourceClass<CloudflareZeroTrustAccessCustomPageProps, CloudflareZeroTrustAccessCustomPage, "cloudflare_zero_trust_access_custom_page">
				TrustDeviceCustomProfile: ResourceClass<CloudflareZeroTrustDeviceCustomProfileProps, CloudflareZeroTrustDeviceCustomProfile, "cloudflare_zero_trust_device_custom_profile">
				TrustAccessInfrastructureTarget: ResourceClass<CloudflareZeroTrustAccessInfrastructureTargetProps, CloudflareZeroTrustAccessInfrastructureTarget, "cloudflare_zero_trust_access_infrastructure_target">
				TrustAccessApplication: ResourceClass<CloudflareZeroTrustAccessApplicationProps, CloudflareZeroTrustAccessApplication, "cloudflare_zero_trust_access_application">
				TrustOrganization: ResourceClass<CloudflareZeroTrustOrganizationProps, CloudflareZeroTrustOrganization, "cloudflare_zero_trust_organization">
				TrustGatewayCertificate: ResourceClass<CloudflareZeroTrustGatewayCertificateProps, CloudflareZeroTrustGatewayCertificate, "cloudflare_zero_trust_gateway_certificate">
				TrustAccessKeyConfiguration: ResourceClass<CloudflareZeroTrustAccessKeyConfigurationProps, CloudflareZeroTrustAccessKeyConfiguration, "cloudflare_zero_trust_access_key_configuration">
				TrustAccessMtlsHostnameSettings: ResourceClass<CloudflareZeroTrustAccessMtlsHostnameSettingsProps, CloudflareZeroTrustAccessMtlsHostnameSettings, "cloudflare_zero_trust_access_mtls_hostname_settings">
				TrustAccessTag: ResourceClass<CloudflareZeroTrustAccessTagProps, CloudflareZeroTrustAccessTag, "cloudflare_zero_trust_access_tag">
				TrustAccessShortLivedCertificate: ResourceClass<CloudflareZeroTrustAccessShortLivedCertificateProps, CloudflareZeroTrustAccessShortLivedCertificate, "cloudflare_zero_trust_access_short_lived_certificate">
				TrustDeviceDefaultProfileCertificates: ResourceClass<CloudflareZeroTrustDeviceDefaultProfileCertificatesProps, CloudflareZeroTrustDeviceDefaultProfileCertificates, "cloudflare_zero_trust_device_default_profile_certificates">
				TrustDevicePostureRule: ResourceClass<CloudflareZeroTrustDevicePostureRuleProps, CloudflareZeroTrustDevicePostureRule, "cloudflare_zero_trust_device_posture_rule">
				TrustRiskScoringIntegration: ResourceClass<CloudflareZeroTrustRiskScoringIntegrationProps, CloudflareZeroTrustRiskScoringIntegration, "cloudflare_zero_trust_risk_scoring_integration">
				TrustDeviceDefaultProfile: ResourceClass<CloudflareZeroTrustDeviceDefaultProfileProps, CloudflareZeroTrustDeviceDefaultProfile, "cloudflare_zero_trust_device_default_profile">
				TrustDnsLocation: ResourceClass<CloudflareZeroTrustDnsLocationProps, CloudflareZeroTrustDnsLocation, "cloudflare_zero_trust_dns_location">
				TrustDlpEntry: ResourceClass<CloudflareZeroTrustDlpEntryProps, CloudflareZeroTrustDlpEntry, "cloudflare_zero_trust_dlp_entry">
				TrustTunnelCloudflaredVirtualNetwork: ResourceClass<CloudflareZeroTrustTunnelCloudflaredVirtualNetworkProps, CloudflareZeroTrustTunnelCloudflaredVirtualNetwork, "cloudflare_zero_trust_tunnel_cloudflared_virtual_network">
				TrustRiskBehavior: ResourceClass<CloudflareZeroTrustRiskBehaviorProps, CloudflareZeroTrustRiskBehavior, "cloudflare_zero_trust_risk_behavior">
				TrustTunnelCloudflaredRoute: ResourceClass<CloudflareZeroTrustTunnelCloudflaredRouteProps, CloudflareZeroTrustTunnelCloudflaredRoute, "cloudflare_zero_trust_tunnel_cloudflared_route">
				TrustAccessGroup: ResourceClass<CloudflareZeroTrustAccessGroupProps, CloudflareZeroTrustAccessGroup, "cloudflare_zero_trust_access_group">
				TrustAccessIdentityProvider: ResourceClass<CloudflareZeroTrustAccessIdentityProviderProps, CloudflareZeroTrustAccessIdentityProvider, "cloudflare_zero_trust_access_identity_provider">
				TrustAccessMtlsCertificate: ResourceClass<CloudflareZeroTrustAccessMtlsCertificateProps, CloudflareZeroTrustAccessMtlsCertificate, "cloudflare_zero_trust_access_mtls_certificate">
				TrustGatewayLogging: ResourceClass<CloudflareZeroTrustGatewayLoggingProps, CloudflareZeroTrustGatewayLogging, "cloudflare_zero_trust_gateway_logging">
				TrustGatewaySettings: ResourceClass<CloudflareZeroTrustGatewaySettingsProps, CloudflareZeroTrustGatewaySettings, "cloudflare_zero_trust_gateway_settings">
				TrustGatewayProxyEndpoint: ResourceClass<CloudflareZeroTrustGatewayProxyEndpointProps, CloudflareZeroTrustGatewayProxyEndpoint, "cloudflare_zero_trust_gateway_proxy_endpoint">
				TrustDeviceManagedNetworks: ResourceClass<CloudflareZeroTrustDeviceManagedNetworksProps, CloudflareZeroTrustDeviceManagedNetworks, "cloudflare_zero_trust_device_managed_networks">
				TrustGatewayPolicy: ResourceClass<CloudflareZeroTrustGatewayPolicyProps, CloudflareZeroTrustGatewayPolicy, "cloudflare_zero_trust_gateway_policy">
				TrustAccessServiceToken: ResourceClass<CloudflareZeroTrustAccessServiceTokenProps, CloudflareZeroTrustAccessServiceToken, "cloudflare_zero_trust_access_service_token">
				TrustTunnelCloudflaredConfig: ResourceClass<CloudflareZeroTrustTunnelCloudflaredConfigProps, CloudflareZeroTrustTunnelCloudflaredConfig, "cloudflare_zero_trust_tunnel_cloudflared_config">
				TrustDlpPredefinedProfile: ResourceClass<CloudflareZeroTrustDlpPredefinedProfileProps, CloudflareZeroTrustDlpPredefinedProfile, "cloudflare_zero_trust_dlp_predefined_profile">
				TrustDeviceDefaultProfileLocalDomainFallback: ResourceClass<CloudflareZeroTrustDeviceDefaultProfileLocalDomainFallbackProps, CloudflareZeroTrustDeviceDefaultProfileLocalDomainFallback, "cloudflare_zero_trust_device_default_profile_local_domain_fallback">
				TrustDlpCustomProfile: ResourceClass<CloudflareZeroTrustDlpCustomProfileProps, CloudflareZeroTrustDlpCustomProfile, "cloudflare_zero_trust_dlp_custom_profile">
				TrustTunnelCloudflared: ResourceClass<CloudflareZeroTrustTunnelCloudflaredProps, CloudflareZeroTrustTunnelCloudflared, "cloudflare_zero_trust_tunnel_cloudflared">
				TrustList: ResourceClass<CloudflareZeroTrustListProps, CloudflareZeroTrustList, "cloudflare_zero_trust_list">
				TrustDexTest: ResourceClass<CloudflareZeroTrustDexTestProps, CloudflareZeroTrustDexTest, "cloudflare_zero_trust_dex_test">
				TrustAccessPolicy: ResourceClass<CloudflareZeroTrustAccessPolicyProps, CloudflareZeroTrustAccessPolicy, "cloudflare_zero_trust_access_policy">
				TrustDevicePostureIntegration: ResourceClass<CloudflareZeroTrustDevicePostureIntegrationProps, CloudflareZeroTrustDevicePostureIntegration, "cloudflare_zero_trust_device_posture_integration">
				TrustDeviceCustomProfileLocalDomainFallback: ResourceClass<CloudflareZeroTrustDeviceCustomProfileLocalDomainFallbackProps, CloudflareZeroTrustDeviceCustomProfileLocalDomainFallback, "cloudflare_zero_trust_device_custom_profile_local_domain_fallback">
				TrustDlpDataset: ResourceClass<CloudflareZeroTrustDlpDatasetProps, CloudflareZeroTrustDlpDataset, "cloudflare_zero_trust_dlp_dataset">
			}
			api: {
				ShieldOperation: ResourceClass<CloudflareApiShieldOperationProps, CloudflareApiShieldOperation, "cloudflare_api_shield_operation">
				ShieldSchemaValidationSettings: ResourceClass<CloudflareApiShieldSchemaValidationSettingsProps, CloudflareApiShieldSchemaValidationSettings, "cloudflare_api_shield_schema_validation_settings">
				ShieldSchema: ResourceClass<CloudflareApiShieldSchemaProps, CloudflareApiShieldSchema, "cloudflare_api_shield_schema">
				Token: ResourceClass<CloudflareApiTokenProps, CloudflareApiToken, "cloudflare_api_token">
				Shield: ResourceClass<CloudflareApiShieldProps, CloudflareApiShield, "cloudflare_api_shield">
				ShieldDiscoveryOperation: ResourceClass<CloudflareApiShieldDiscoveryOperationProps, CloudflareApiShieldDiscoveryOperation, "cloudflare_api_shield_discovery_operation">
				ShieldOperationSchemaValidationSettings: ResourceClass<CloudflareApiShieldOperationSchemaValidationSettingsProps, CloudflareApiShieldOperationSchemaValidationSettings, "cloudflare_api_shield_operation_schema_validation_settings">
			}
			waiting: {
				RoomSettings: ResourceClass<CloudflareWaitingRoomSettingsProps, CloudflareWaitingRoomSettings, "cloudflare_waiting_room_settings">
				Room: ResourceClass<CloudflareWaitingRoomProps, CloudflareWaitingRoom, "cloudflare_waiting_room">
				RoomEvent: ResourceClass<CloudflareWaitingRoomEventProps, CloudflareWaitingRoomEvent, "cloudflare_waiting_room_event">
				RoomRules: ResourceClass<CloudflareWaitingRoomRulesProps, CloudflareWaitingRoomRules, "cloudflare_waiting_room_rules">
			}
			email: {
				RoutingSettings: ResourceClass<CloudflareEmailRoutingSettingsProps, CloudflareEmailRoutingSettings, "cloudflare_email_routing_settings">
				RoutingAddress: ResourceClass<CloudflareEmailRoutingAddressProps, CloudflareEmailRoutingAddress, "cloudflare_email_routing_address">
				RoutingRule: ResourceClass<CloudflareEmailRoutingRuleProps, CloudflareEmailRoutingRule, "cloudflare_email_routing_rule">
				SecurityBlockSender: ResourceClass<CloudflareEmailSecurityBlockSenderProps, CloudflareEmailSecurityBlockSender, "cloudflare_email_security_block_sender">
				SecurityImpersonationRegistry: ResourceClass<CloudflareEmailSecurityImpersonationRegistryProps, CloudflareEmailSecurityImpersonationRegistry, "cloudflare_email_security_impersonation_registry">
				RoutingCatchAll: ResourceClass<CloudflareEmailRoutingCatchAllProps, CloudflareEmailRoutingCatchAll, "cloudflare_email_routing_catch_all">
				SecurityTrustedDomains: ResourceClass<CloudflareEmailSecurityTrustedDomainsProps, CloudflareEmailSecurityTrustedDomains, "cloudflare_email_security_trusted_domains">
				RoutingDns: ResourceClass<CloudflareEmailRoutingDnsProps, CloudflareEmailRoutingDns, "cloudflare_email_routing_dns">
			}
			notification: {
				PolicyWebhooks: ResourceClass<CloudflareNotificationPolicyWebhooksProps, CloudflareNotificationPolicyWebhooks, "cloudflare_notification_policy_webhooks">
				Policy: ResourceClass<CloudflareNotificationPolicyProps, CloudflareNotificationPolicy, "cloudflare_notification_policy">
			}
			Queue: ResourceClass<CloudflareQueueProps, CloudflareQueue, "cloudflare_queue">
			regional: {
				TieredCache: ResourceClass<CloudflareRegionalTieredCacheProps, CloudflareRegionalTieredCache, "cloudflare_regional_tiered_cache">
				Hostname: ResourceClass<CloudflareRegionalHostnameProps, CloudflareRegionalHostname, "cloudflare_regional_hostname">
			}
			access: {
				Rule: ResourceClass<CloudflareAccessRuleProps, CloudflareAccessRule, "cloudflare_access_rule">
			}
			magic: {
				TransitSiteAcl: ResourceClass<CloudflareMagicTransitSiteAclProps, CloudflareMagicTransitSiteAcl, "cloudflare_magic_transit_site_acl">
				TransitSiteLan: ResourceClass<CloudflareMagicTransitSiteLanProps, CloudflareMagicTransitSiteLan, "cloudflare_magic_transit_site_lan">
				WanIpsecTunnel: ResourceClass<CloudflareMagicWanIpsecTunnelProps, CloudflareMagicWanIpsecTunnel, "cloudflare_magic_wan_ipsec_tunnel">
				TransitConnector: ResourceClass<CloudflareMagicTransitConnectorProps, CloudflareMagicTransitConnector, "cloudflare_magic_transit_connector">
				WanStaticRoute: ResourceClass<CloudflareMagicWanStaticRouteProps, CloudflareMagicWanStaticRoute, "cloudflare_magic_wan_static_route">
				WanGreTunnel: ResourceClass<CloudflareMagicWanGreTunnelProps, CloudflareMagicWanGreTunnel, "cloudflare_magic_wan_gre_tunnel">
				NetworkMonitoringConfiguration: ResourceClass<CloudflareMagicNetworkMonitoringConfigurationProps, CloudflareMagicNetworkMonitoringConfiguration, "cloudflare_magic_network_monitoring_configuration">
				TransitSite: ResourceClass<CloudflareMagicTransitSiteProps, CloudflareMagicTransitSite, "cloudflare_magic_transit_site">
				NetworkMonitoringRule: ResourceClass<CloudflareMagicNetworkMonitoringRuleProps, CloudflareMagicNetworkMonitoringRule, "cloudflare_magic_network_monitoring_rule">
				TransitSiteWan: ResourceClass<CloudflareMagicTransitSiteWanProps, CloudflareMagicTransitSiteWan, "cloudflare_magic_transit_site_wan">
			}
			argo: {
				SmartRouting: ResourceClass<CloudflareArgoSmartRoutingProps, CloudflareArgoSmartRouting, "cloudflare_argo_smart_routing">
				TieredCaching: ResourceClass<CloudflareArgoTieredCachingProps, CloudflareArgoTieredCaching, "cloudflare_argo_tiered_caching">
			}
			r2: {
				Bucket: ResourceClass<CloudflareR2BucketProps, CloudflareR2Bucket, "cloudflare_r2_bucket">
				BucketLifecycle: ResourceClass<CloudflareR2BucketLifecycleProps, CloudflareR2BucketLifecycle, "cloudflare_r2_bucket_lifecycle">
				BucketEventNotification: ResourceClass<CloudflareR2BucketEventNotificationProps, CloudflareR2BucketEventNotification, "cloudflare_r2_bucket_event_notification">
				BucketSippy: ResourceClass<CloudflareR2BucketSippyProps, CloudflareR2BucketSippy, "cloudflare_r2_bucket_sippy">
				BucketCors: ResourceClass<CloudflareR2BucketCorsProps, CloudflareR2BucketCors, "cloudflare_r2_bucket_cors">
				CustomDomain: ResourceClass<CloudflareR2CustomDomainProps, CloudflareR2CustomDomain, "cloudflare_r2_custom_domain">
				BucketLock: ResourceClass<CloudflareR2BucketLockProps, CloudflareR2BucketLock, "cloudflare_r2_bucket_lock">
				ManagedDomain: ResourceClass<CloudflareR2ManagedDomainProps, CloudflareR2ManagedDomain, "cloudflare_r2_managed_domain">
			}
			pages: {
				Domain: ResourceClass<CloudflarePagesDomainProps, CloudflarePagesDomain, "cloudflare_pages_domain">
				Project: ResourceClass<CloudflarePagesProjectProps, CloudflarePagesProject, "cloudflare_pages_project">
			}
			dns: {
				ZoneTransfersAcl: ResourceClass<CloudflareDnsZoneTransfersAclProps, CloudflareDnsZoneTransfersAcl, "cloudflare_dns_zone_transfers_acl">
				Record: ResourceClass<CloudflareDnsRecordProps, CloudflareDnsRecord, "cloudflare_dns_record">
				Firewall: ResourceClass<CloudflareDnsFirewallProps, CloudflareDnsFirewall, "cloudflare_dns_firewall">
				ZoneTransfersPeer: ResourceClass<CloudflareDnsZoneTransfersPeerProps, CloudflareDnsZoneTransfersPeer, "cloudflare_dns_zone_transfers_peer">
				ZoneTransfersIncoming: ResourceClass<CloudflareDnsZoneTransfersIncomingProps, CloudflareDnsZoneTransfersIncoming, "cloudflare_dns_zone_transfers_incoming">
				ZoneTransfersTsig: ResourceClass<CloudflareDnsZoneTransfersTsigProps, CloudflareDnsZoneTransfersTsig, "cloudflare_dns_zone_transfers_tsig">
				ZoneTransfersOutgoing: ResourceClass<CloudflareDnsZoneTransfersOutgoingProps, CloudflareDnsZoneTransfersOutgoing, "cloudflare_dns_zone_transfers_outgoing">
			}
			stream: {
				LiveInput: ResourceClass<CloudflareStreamLiveInputProps, CloudflareStreamLiveInput, "cloudflare_stream_live_input">
				AudioTrack: ResourceClass<CloudflareStreamAudioTrackProps, CloudflareStreamAudioTrack, "cloudflare_stream_audio_track">
				Watermark: ResourceClass<CloudflareStreamWatermarkProps, CloudflareStreamWatermark, "cloudflare_stream_watermark">
				CaptionLanguage: ResourceClass<CloudflareStreamCaptionLanguageProps, CloudflareStreamCaptionLanguage, "cloudflare_stream_caption_language">
				Key: ResourceClass<CloudflareStreamKeyProps, CloudflareStreamKey, "cloudflare_stream_key">
				Webhook: ResourceClass<CloudflareStreamWebhookProps, CloudflareStreamWebhook, "cloudflare_stream_webhook">
				Download: ResourceClass<CloudflareStreamDownloadProps, CloudflareStreamDownload, "cloudflare_stream_download">
			}
			authenticated: {
				OriginPulls: ResourceClass<CloudflareAuthenticatedOriginPullsProps, CloudflareAuthenticatedOriginPulls, "cloudflare_authenticated_origin_pulls">
				OriginPullsCertificate: ResourceClass<CloudflareAuthenticatedOriginPullsCertificateProps, CloudflareAuthenticatedOriginPullsCertificate, "cloudflare_authenticated_origin_pulls_certificate">
				OriginPullsSettings: ResourceClass<CloudflareAuthenticatedOriginPullsSettingsProps, CloudflareAuthenticatedOriginPullsSettings, "cloudflare_authenticated_origin_pulls_settings">
			}
			leaked: {
				CredentialCheck: ResourceClass<CloudflareLeakedCredentialCheckProps, CloudflareLeakedCredentialCheck, "cloudflare_leaked_credential_check">
				CredentialCheckRule: ResourceClass<CloudflareLeakedCredentialCheckRuleProps, CloudflareLeakedCredentialCheckRule, "cloudflare_leaked_credential_check_rule">
			}
			load: {
				Balancer: ResourceClass<CloudflareLoadBalancerProps, CloudflareLoadBalancer, "cloudflare_load_balancer">
				BalancerMonitor: ResourceClass<CloudflareLoadBalancerMonitorProps, CloudflareLoadBalancerMonitor, "cloudflare_load_balancer_monitor">
				BalancerPool: ResourceClass<CloudflareLoadBalancerPoolProps, CloudflareLoadBalancerPool, "cloudflare_load_balancer_pool">
			}
			list: {
				Item: ResourceClass<CloudflareListItemProps, CloudflareListItem, "cloudflare_list_item">
			}
			d1: {
				Database: ResourceClass<CloudflareD1DatabaseProps, CloudflareD1Database, "cloudflare_d1_database">
			}
			custom: {
				Hostname: ResourceClass<CloudflareCustomHostnameProps, CloudflareCustomHostname, "cloudflare_custom_hostname">
				Ssl: ResourceClass<CloudflareCustomSslProps, CloudflareCustomSsl, "cloudflare_custom_ssl">
				HostnameFallbackOrigin: ResourceClass<CloudflareCustomHostnameFallbackOriginProps, CloudflareCustomHostnameFallbackOrigin, "cloudflare_custom_hostname_fallback_origin">
				Pages: ResourceClass<CloudflareCustomPagesProps, CloudflareCustomPages, "cloudflare_custom_pages">
			}
			Ruleset: ResourceClass<CloudflareRulesetProps, CloudflareRuleset, "cloudflare_ruleset">
			hyperdrive: {
				Config: ResourceClass<CloudflareHyperdriveConfigProps, CloudflareHyperdriveConfig, "cloudflare_hyperdrive_config">
			}
			account: {
				DnsSettingsInternalView: ResourceClass<CloudflareAccountDnsSettingsInternalViewProps, CloudflareAccountDnsSettingsInternalView, "cloudflare_account_dns_settings_internal_view">
				Token: ResourceClass<CloudflareAccountTokenProps, CloudflareAccountToken, "cloudflare_account_token">
				Member: ResourceClass<CloudflareAccountMemberProps, CloudflareAccountMember, "cloudflare_account_member">
				Subscription: ResourceClass<CloudflareAccountSubscriptionProps, CloudflareAccountSubscription, "cloudflare_account_subscription">
				DnsSettings: ResourceClass<CloudflareAccountDnsSettingsProps, CloudflareAccountDnsSettings, "cloudflare_account_dns_settings">
			}
			cloud: {
				ConnectorRules: ResourceClass<CloudflareCloudConnectorRulesProps, CloudflareCloudConnectorRules, "cloudflare_cloud_connector_rules">
			}
			web: {
				AnalyticsSite: ResourceClass<CloudflareWebAnalyticsSiteProps, CloudflareWebAnalyticsSite, "cloudflare_web_analytics_site">
				AnalyticsRule: ResourceClass<CloudflareWebAnalyticsRuleProps, CloudflareWebAnalyticsRule, "cloudflare_web_analytics_rule">
			}
			user: {
				AgentBlockingRule: ResourceClass<CloudflareUserAgentBlockingRuleProps, CloudflareUserAgentBlockingRule, "cloudflare_user_agent_blocking_rule">
			}
			address: {
				Map: ResourceClass<CloudflareAddressMapProps, CloudflareAddressMap, "cloudflare_address_map">
			}
			Zone: ResourceClass<CloudflareZoneProps, CloudflareZone, "cloudflare_zone">
			logpull: {
				Retention: ResourceClass<CloudflareLogpullRetentionProps, CloudflareLogpullRetention, "cloudflare_logpull_retention">
			}
			logpush: {
				Job: ResourceClass<CloudflareLogpushJobProps, CloudflareLogpushJob, "cloudflare_logpush_job">
				OwnershipChallenge: ResourceClass<CloudflareLogpushOwnershipChallengeProps, CloudflareLogpushOwnershipChallenge, "cloudflare_logpush_ownership_challenge">
			}
			rate: {
				Limit: ResourceClass<CloudflareRateLimitProps, CloudflareRateLimit, "cloudflare_rate_limit">
			}
			snippet: {
				Rules: ResourceClass<CloudflareSnippetRulesProps, CloudflareSnippetRules, "cloudflare_snippet_rules">
			}
			page: {
				Rule: ResourceClass<CloudflarePageRuleProps, CloudflarePageRule, "cloudflare_page_rule">
				ShieldPolicy: ResourceClass<CloudflarePageShieldPolicyProps, CloudflarePageShieldPolicy, "cloudflare_page_shield_policy">
			}
			turnstile: {
				Widget: ResourceClass<CloudflareTurnstileWidgetProps, CloudflareTurnstileWidget, "cloudflare_turnstile_widget">
			}
			Healthcheck: ResourceClass<CloudflareHealthcheckProps, CloudflareHealthcheck, "cloudflare_healthcheck">
			image: {
				Variant: ResourceClass<CloudflareImageVariantProps, CloudflareImageVariant, "cloudflare_image_variant">
			}
			calls: {
				SfuApp: ResourceClass<CloudflareCallsSfuAppProps, CloudflareCallsSfuApp, "cloudflare_calls_sfu_app">
				TurnApp: ResourceClass<CloudflareCallsTurnAppProps, CloudflareCallsTurnApp, "cloudflare_calls_turn_app">
			}
			url: {
				NormalizationSettings: ResourceClass<CloudflareUrlNormalizationSettingsProps, CloudflareUrlNormalizationSettings, "cloudflare_url_normalization_settings">
			}
			origin: {
				CaCertificate: ResourceClass<CloudflareOriginCaCertificateProps, CloudflareOriginCaCertificate, "cloudflare_origin_ca_certificate">
			}
			certificate: {
				Pack: ResourceClass<CloudflareCertificatePackProps, CloudflareCertificatePack, "cloudflare_certificate_pack">
			}
			mtls: {
				Certificate: ResourceClass<CloudflareMtlsCertificateProps, CloudflareMtlsCertificate, "cloudflare_mtls_certificate">
			}
			web3: {
				Hostname: ResourceClass<CloudflareWeb3HostnameProps, CloudflareWeb3Hostname, "cloudflare_web3_hostname">
			}
			total: {
				Tls: ResourceClass<CloudflareTotalTlsProps, CloudflareTotalTls, "cloudflare_total_tls">
			}
			byo: {
				IpPrefix: ResourceClass<CloudflareByoIpPrefixProps, CloudflareByoIpPrefix, "cloudflare_byo_ip_prefix">
			}
			Account: ResourceClass<CloudflareAccountProps, CloudflareAccount, "cloudflare_account">
			List: ResourceClass<CloudflareListProps, CloudflareList, "cloudflare_list">
			bot: {
				Management: ResourceClass<CloudflareBotManagementProps, CloudflareBotManagement, "cloudflare_bot_management">
			}
			Stream: ResourceClass<CloudflareStreamProps, CloudflareStream, "cloudflare_stream">
			Filter: ResourceClass<CloudflareFilterProps, CloudflareFilter, "cloudflare_filter">
			firewall: {
				Rule: ResourceClass<CloudflareFirewallRuleProps, CloudflareFirewallRule, "cloudflare_firewall_rule">
			}
			observatory: {
				ScheduledTest: ResourceClass<CloudflareObservatoryScheduledTestProps, CloudflareObservatoryScheduledTest, "cloudflare_observatory_scheduled_test">
			}
			hostname: {
				TlsSetting: ResourceClass<CloudflareHostnameTlsSettingProps, CloudflareHostnameTlsSetting, "cloudflare_hostname_tls_setting">
			}
			spectrum: {
				Application: ResourceClass<CloudflareSpectrumApplicationProps, CloudflareSpectrumApplication, "cloudflare_spectrum_application">
			}
			Snippets: ResourceClass<CloudflareSnippetsProps, CloudflareSnippets, "cloudflare_snippets">
			cloudforce: {
				OneRequestMessage: ResourceClass<CloudflareCloudforceOneRequestMessageProps, CloudflareCloudforceOneRequestMessage, "cloudflare_cloudforce_one_request_message">
				OneRequestAsset: ResourceClass<CloudflareCloudforceOneRequestAssetProps, CloudflareCloudforceOneRequestAsset, "cloudflare_cloudforce_one_request_asset">
				OneRequestPriority: ResourceClass<CloudflareCloudforceOneRequestPriorityProps, CloudflareCloudforceOneRequestPriority, "cloudflare_cloudforce_one_request_priority">
				OneRequest: ResourceClass<CloudflareCloudforceOneRequestProps, CloudflareCloudforceOneRequest, "cloudflare_cloudforce_one_request">
			}
			User: ResourceClass<CloudflareUserProps, CloudflareUser, "cloudflare_user">
			Image: ResourceClass<CloudflareImageProps, CloudflareImage, "cloudflare_image">
			tiered: {
				Cache: ResourceClass<CloudflareTieredCacheProps, CloudflareTieredCache, "cloudflare_tiered_cache">
			}
			queue: {
				Consumer: ResourceClass<CloudflareQueueConsumerProps, CloudflareQueueConsumer, "cloudflare_queue_consumer">
			}
			managed: {
				Transforms: ResourceClass<CloudflareManagedTransformsProps, CloudflareManagedTransforms, "cloudflare_managed_transforms">
			}
			keyless: {
				Certificate: ResourceClass<CloudflareKeylessCertificateProps, CloudflareKeylessCertificate, "cloudflare_keyless_certificate">
			}
			registrar: {
				Domain: ResourceClass<CloudflareRegistrarDomainProps, CloudflareRegistrarDomain, "cloudflare_registrar_domain">
			}
			content: {
				ScanningExpression: ResourceClass<CloudflareContentScanningExpressionProps, CloudflareContentScanningExpression, "cloudflare_content_scanning_expression">
			}
		}
	}
}


declare global {
	interface TerraformProviders {
		cloudflare: {

			/** The API key for operations. Alternatively, can be configured using the `CLOUDFLARE_API_KEY` environment variable. API keys are [now considered legacy by Cloudflare](https://developers.cloudflare.com/fundamentals/api/get-started/keys/#limitations), API tokens should be used instead. Must provide only one of `api_key`, `api_token`, `api_user_service_key`. */
			api_key?: string

			/** The API Token for operations. Alternatively, can be configured using the `CLOUDFLARE_API_TOKEN` environment variable. Must provide only one of `api_key`, `api_token`, `api_user_service_key`. */
			api_token?: string

			/** A special Cloudflare API key good for a restricted set of endpoints. Alternatively, can be configured using the `CLOUDFLARE_API_USER_SERVICE_KEY` environment variable. Must provide only one of `api_key`, `api_token`, `api_user_service_key`. */
			api_user_service_key?: string

			/** Value to override the default HTTP client base URL. Alternatively, can be configured using the `base_url` environment variable. */
			base_url?: string

			/** A registered Cloudflare email address. Alternatively, can be configured using the `CLOUDFLARE_EMAIL` environment variable. Required when using `api_key`. Conflicts with `api_token`. */
			email?: string

			/** A value to append to the HTTP User Agent for all API calls. This value is not something most users need to modify however, if you are using a non-standard provider or operator configuration, this is recommended to assist in uniquely identifying your traffic. **Setting this value will remove the Terraform version from the HTTP User Agent string and may have unintended consequences**. Alternatively, can be configured using the `CLOUDFLARE_USER_AGENT_OPERATOR_SUFFIX` environment variable. */
			user_agent_operator_suffix?: string
		}	}
}
