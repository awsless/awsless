
export class Peer {

	static ipv4(cidrIp: string) {
		const cidrMatch = cidrIp.match(/^(\d{1,3}\.){3}\d{1,3}(\/\d+)?$/)

		if (!cidrMatch) {
			throw new Error(`Invalid IPv4 CIDR: "${cidrIp}"`)
		}

		if (!cidrMatch[2]) {
			throw new Error(`CIDR mask is missing in IPv4: "${cidrIp}". Did you mean "${cidrIp}/32"?`)
		}

		return new Peer(cidrIp, 'v4')
	}

	static anyIpv4() {
		return new Peer('0.0.0.0/0', 'v4')
	}

	static ipv6(cidrIpv6: string) {
		const cidrMatch = cidrIpv6.match(/^([\da-f]{0,4}:){2,7}([\da-f]{0,4})?(\/\d+)?$/);

		if (!cidrMatch) {
			throw new Error(`Invalid IPv6 CIDR: "${cidrIpv6}"`);
		}

		if (!cidrMatch[3]) {
			throw new Error(`CIDR mask is missing in IPv6: "${cidrIpv6}". Did you mean "${cidrIpv6}/128"?`);
		}

		return new Peer(cidrIpv6, 'v6')
	}

	static anyIpv6() {
		return new Peer('::/0', 'v6')
	}

	constructor(readonly ip: string, readonly type: 'v4' | 'v6') {}

	toRuleJson() {
		switch(this.type) {
			case 'v4': return { CidrIp: this.ip }
			case 'v6': return { CidrIpv6: this.ip }
		}
	}

	toString() {
		return this.ip
	}
}
