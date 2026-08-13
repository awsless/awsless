export default {
	options: { syntax: 'proto3', go_package: 'github.com/hashicorp/terraform/internal/tfplugin6' },
	nested: {
		tfplugin6: {
			nested: {
				DynamicValue: { fields: { msgpack: { type: 'bytes', id: 1 }, json: { type: 'bytes', id: 2 } } },
				Diagnostic: {
					fields: {
						severity: { type: 'Severity', id: 1 },
						summary: { type: 'string', id: 2 },
						detail: { type: 'string', id: 3 },
						attribute: { type: 'AttributePath', id: 4 },
					},
					nested: { Severity: { values: { INVALID: 0, ERROR: 1, WARNING: 2 } } },
				},
				AttributePath: {
					fields: { steps: { rule: 'repeated', type: 'Step', id: 1 } },
					nested: {
						Step: {
							oneofs: { selector: { oneof: ['attributeName', 'elementKeyString', 'elementKeyInt'] } },
							fields: {
								attributeName: { type: 'string', id: 1 },
								elementKeyString: { type: 'string', id: 2 },
								elementKeyInt: { type: 'int64', id: 3 },
							},
						},
					},
				},
				StopProvider: {
					fields: {},
					nested: { Request: { fields: {} }, Response: { fields: { Error: { type: 'string', id: 1 } } } },
				},
				RawState: {
					fields: { json: { type: 'bytes', id: 1 }, flatmap: { keyType: 'string', type: 'string', id: 2 } },
				},
				StringKind: { values: { PLAIN: 0, MARKDOWN: 1 } },
				Schema: {
					fields: { version: { type: 'int64', id: 1 }, block: { type: 'Block', id: 2 } },
					nested: {
						Block: {
							fields: {
								version: { type: 'int64', id: 1 },
								attributes: { rule: 'repeated', type: 'Attribute', id: 2 },
								blockTypes: { rule: 'repeated', type: 'NestedBlock', id: 3 },
								description: { type: 'string', id: 4 },
								descriptionKind: { type: 'StringKind', id: 5 },
								deprecated: { type: 'bool', id: 6 },
							},
						},
						Attribute: {
							fields: {
								name: { type: 'string', id: 1 },
								type: { type: 'bytes', id: 2 },
								nestedType: { type: 'Object', id: 10 },
								description: { type: 'string', id: 3 },
								required: { type: 'bool', id: 4 },
								optional: { type: 'bool', id: 5 },
								computed: { type: 'bool', id: 6 },
								sensitive: { type: 'bool', id: 7 },
								descriptionKind: { type: 'StringKind', id: 8 },
								deprecated: { type: 'bool', id: 9 },
							},
						},
						NestedBlock: {
							fields: {
								typeName: { type: 'string', id: 1 },
								block: { type: 'Block', id: 2 },
								nesting: { type: 'NestingMode', id: 3 },
								minItems: { type: 'int64', id: 4 },
								maxItems: { type: 'int64', id: 5 },
							},
							nested: {
								NestingMode: { values: { INVALID: 0, SINGLE: 1, LIST: 2, SET: 3, MAP: 4, GROUP: 5 } },
							},
						},
						Object: {
							fields: {
								attributes: { rule: 'repeated', type: 'Attribute', id: 1 },
								nesting: { type: 'NestingMode', id: 3 },
								minItems: { type: 'int64', id: 4 },
								maxItems: { type: 'int64', id: 5 },
							},
							nested: { NestingMode: { values: { INVALID: 0, SINGLE: 1, LIST: 2, SET: 3, MAP: 4 } } },
						},
					},
				},
				Provider: {
					methods: {
						GetProviderSchema: {
							requestType: 'GetProviderSchema.Request',
							responseType: 'GetProviderSchema.Response',
						},
						ValidateProviderConfig: {
							requestType: 'ValidateProviderConfig.Request',
							responseType: 'ValidateProviderConfig.Response',
						},
						ValidateResourceConfig: {
							requestType: 'ValidateResourceConfig.Request',
							responseType: 'ValidateResourceConfig.Response',
						},
						ValidateDataResourceConfig: {
							requestType: 'ValidateDataResourceConfig.Request',
							responseType: 'ValidateDataResourceConfig.Response',
						},
						UpgradeResourceState: {
							requestType: 'UpgradeResourceState.Request',
							responseType: 'UpgradeResourceState.Response',
						},
						ConfigureProvider: {
							requestType: 'ConfigureProvider.Request',
							responseType: 'ConfigureProvider.Response',
						},
						ReadResource: { requestType: 'ReadResource.Request', responseType: 'ReadResource.Response' },
						PlanResourceChange: {
							requestType: 'PlanResourceChange.Request',
							responseType: 'PlanResourceChange.Response',
						},
						ApplyResourceChange: {
							requestType: 'ApplyResourceChange.Request',
							responseType: 'ApplyResourceChange.Response',
						},
						ImportResourceState: {
							requestType: 'ImportResourceState.Request',
							responseType: 'ImportResourceState.Response',
						},
						ReadDataSource: {
							requestType: 'ReadDataSource.Request',
							responseType: 'ReadDataSource.Response',
						},
						StopProvider: { requestType: 'StopProvider.Request', responseType: 'StopProvider.Response' },
					},
				},
				GetProviderSchema: {
					fields: {},
					nested: {
						Request: { fields: {} },
						Response: {
							fields: {
								provider: { type: 'Schema', id: 1 },
								resourceSchemas: { keyType: 'string', type: 'Schema', id: 2 },
								dataSourceSchemas: { keyType: 'string', type: 'Schema', id: 3 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 4 },
								providerMeta: { type: 'Schema', id: 5 },
							},
						},
					},
				},
				ValidateProviderConfig: {
					fields: {},
					nested: {
						Request: { fields: { config: { type: 'DynamicValue', id: 1 } } },
						Response: { fields: { diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 } } },
					},
				},
				UpgradeResourceState: {
					fields: {},
					nested: {
						Request: {
							fields: {
								typeName: { type: 'string', id: 1 },
								version: { type: 'int64', id: 2 },
								rawState: { type: 'RawState', id: 3 },
							},
						},
						Response: {
							fields: {
								upgradedState: { type: 'DynamicValue', id: 1 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 },
							},
						},
					},
				},
				ValidateResourceConfig: {
					fields: {},
					nested: {
						Request: {
							fields: { typeName: { type: 'string', id: 1 }, config: { type: 'DynamicValue', id: 2 } },
						},
						Response: { fields: { diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 1 } } },
					},
				},
				ValidateDataResourceConfig: {
					fields: {},
					nested: {
						Request: {
							fields: { typeName: { type: 'string', id: 1 }, config: { type: 'DynamicValue', id: 2 } },
						},
						Response: { fields: { diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 1 } } },
					},
				},
				ConfigureProvider: {
					fields: {},
					nested: {
						Request: {
							fields: {
								terraformVersion: { type: 'string', id: 1 },
								config: { type: 'DynamicValue', id: 2 },
							},
						},
						Response: { fields: { diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 1 } } },
					},
				},
				ReadResource: {
					fields: {},
					nested: {
						Request: {
							fields: {
								typeName: { type: 'string', id: 1 },
								currentState: { type: 'DynamicValue', id: 2 },
								private: { type: 'bytes', id: 3 },
								providerMeta: { type: 'DynamicValue', id: 4 },
							},
						},
						Response: {
							fields: {
								newState: { type: 'DynamicValue', id: 1 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 },
								private: { type: 'bytes', id: 3 },
							},
						},
					},
				},
				PlanResourceChange: {
					fields: {},
					nested: {
						Request: {
							fields: {
								typeName: { type: 'string', id: 1 },
								priorState: { type: 'DynamicValue', id: 2 },
								proposedNewState: { type: 'DynamicValue', id: 3 },
								config: { type: 'DynamicValue', id: 4 },
								priorPrivate: { type: 'bytes', id: 5 },
								providerMeta: { type: 'DynamicValue', id: 6 },
							},
						},
						Response: {
							fields: {
								plannedState: { type: 'DynamicValue', id: 1 },
								requiresReplace: { rule: 'repeated', type: 'AttributePath', id: 2 },
								plannedPrivate: { type: 'bytes', id: 3 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 4 },
							},
						},
					},
				},
				ApplyResourceChange: {
					fields: {},
					nested: {
						Request: {
							fields: {
								typeName: { type: 'string', id: 1 },
								priorState: { type: 'DynamicValue', id: 2 },
								plannedState: { type: 'DynamicValue', id: 3 },
								config: { type: 'DynamicValue', id: 4 },
								plannedPrivate: { type: 'bytes', id: 5 },
								providerMeta: { type: 'DynamicValue', id: 6 },
							},
						},
						Response: {
							fields: {
								newState: { type: 'DynamicValue', id: 1 },
								private: { type: 'bytes', id: 2 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 3 },
							},
						},
					},
				},
				ImportResourceState: {
					fields: {},
					nested: {
						Request: { fields: { typeName: { type: 'string', id: 1 }, id: { type: 'string', id: 2 } } },
						ImportedResource: {
							fields: {
								typeName: { type: 'string', id: 1 },
								state: { type: 'DynamicValue', id: 2 },
								private: { type: 'bytes', id: 3 },
							},
						},
						Response: {
							fields: {
								importedResources: { rule: 'repeated', type: 'ImportedResource', id: 1 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 },
							},
						},
					},
				},
				ReadDataSource: {
					fields: {},
					nested: {
						Request: {
							fields: {
								typeName: { type: 'string', id: 1 },
								config: { type: 'DynamicValue', id: 2 },
								providerMeta: { type: 'DynamicValue', id: 3 },
							},
						},
						Response: {
							fields: {
								state: { type: 'DynamicValue', id: 1 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 },
							},
						},
					},
				},
			},
		},
	},
}
