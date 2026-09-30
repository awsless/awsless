# @awsless/terraforge-workos

A terraforge bridge for the community [WorkOS terraform provider](https://registry.terraform.io/providers/osodevops/workos/latest).

The runtime is the same three line proxy `build-package` generates. The
types are hand written, because the `build-package` bin published with
`@terraforge/terraform` imports source files the package doesn't ship,
so it can't read the provider schema. Only the resources the auth
feature deploys are typed - the proxy itself reaches every resource the
provider has.

Pin this package's version to the provider version it wraps.
