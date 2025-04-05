export default {
	options: { syntax: 'proto3' },
	nested: {
		tfplugin5: {
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
				Stop: {
					fields: {},
					nested: { Request: { fields: {} }, Response: { fields: { Error: { type: 'string', id: 1 } } } },
				},
				RawState: {
					fields: { json: { type: 'bytes', id: 1 }, flatmap: { keyType: 'string', type: 'string', id: 2 } },
				},
				Schema: {
					fields: { version: { type: 'int64', id: 1 }, block: { type: 'Block', id: 2 } },
					nested: {
						Block: {
							fields: {
								version: { type: 'int64', id: 1 },
								attributes: { rule: 'repeated', type: 'Attribute', id: 2 },
								blockTypes: { rule: 'repeated', type: 'NestedBlock', id: 3 },
							},
						},
						Attribute: {
							fields: {
								name: { type: 'string', id: 1 },
								type: { type: 'bytes', id: 2 },
								description: { type: 'string', id: 3 },
								required: { type: 'bool', id: 4 },
								optional: { type: 'bool', id: 5 },
								computed: { type: 'bool', id: 6 },
								sensitive: { type: 'bool', id: 7 },
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
					},
				},
				Provider: {
					methods: {
						GetSchema: {
							requestType: 'GetProviderSchema.Request',
							responseType: 'GetProviderSchema.Response',
						},
						PrepareProviderConfig: {
							requestType: 'PrepareProviderConfig.Request',
							responseType: 'PrepareProviderConfig.Response',
						},
						ValidateResourceTypeConfig: {
							requestType: 'ValidateResourceTypeConfig.Request',
							responseType: 'ValidateResourceTypeConfig.Response',
						},
						ValidateDataSourceConfig: {
							requestType: 'ValidateDataSourceConfig.Request',
							responseType: 'ValidateDataSourceConfig.Response',
						},
						UpgradeResourceState: {
							requestType: 'UpgradeResourceState.Request',
							responseType: 'UpgradeResourceState.Response',
						},
						Configure: { requestType: 'Configure.Request', responseType: 'Configure.Response' },
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
						Stop: { requestType: 'Stop.Request', responseType: 'Stop.Response' },
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
							},
						},
					},
				},
				PrepareProviderConfig: {
					fields: {},
					nested: {
						Request: { fields: { config: { type: 'DynamicValue', id: 1 } } },
						Response: {
							fields: {
								preparedConfig: { type: 'DynamicValue', id: 1 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 },
							},
						},
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
				ValidateResourceTypeConfig: {
					fields: {},
					nested: {
						Request: {
							fields: { typeName: { type: 'string', id: 1 }, config: { type: 'DynamicValue', id: 2 } },
						},
						Response: { fields: { diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 1 } } },
					},
				},
				ValidateDataSourceConfig: {
					fields: {},
					nested: {
						Request: {
							fields: { typeName: { type: 'string', id: 1 }, config: { type: 'DynamicValue', id: 2 } },
						},
						Response: { fields: { diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 1 } } },
					},
				},
				Configure: {
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
							},
						},
						Response: {
							fields: {
								plannedState: { type: 'DynamicValue', id: 1 },
								requiresReplace: { rule: 'repeated', type: 'AttributePath', id: 2 },
								plannedPrivate: { type: 'bytes', id: 3 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 4 },
								legacyTypeSystem: { type: 'bool', id: 5 },
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
							},
						},
						Response: {
							fields: {
								newState: { type: 'DynamicValue', id: 1 },
								private: { type: 'bytes', id: 2 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 3 },
								legacyTypeSystem: { type: 'bool', id: 4 },
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
							fields: { typeName: { type: 'string', id: 1 }, config: { type: 'DynamicValue', id: 2 } },
						},
						Response: {
							fields: {
								state: { type: 'DynamicValue', id: 1 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 },
							},
						},
					},
				},
				Provisioner: {
					methods: {
						GetSchema: {
							requestType: 'GetProvisionerSchema.Request',
							responseType: 'GetProvisionerSchema.Response',
						},
						ValidateProvisionerConfig: {
							requestType: 'ValidateProvisionerConfig.Request',
							responseType: 'ValidateProvisionerConfig.Response',
						},
						ProvisionResource: {
							requestType: 'ProvisionResource.Request',
							responseType: 'ProvisionResource.Response',
							responseStream: true,
						},
						Stop: { requestType: 'Stop.Request', responseType: 'Stop.Response' },
					},
				},
				GetProvisionerSchema: {
					fields: {},
					nested: {
						Request: { fields: {} },
						Response: {
							fields: {
								provisioner: { type: 'Schema', id: 1 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 },
							},
						},
					},
				},
				ValidateProvisionerConfig: {
					fields: {},
					nested: {
						Request: { fields: { config: { type: 'DynamicValue', id: 1 } } },
						Response: { fields: { diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 1 } } },
					},
				},
				ProvisionResource: {
					fields: {},
					nested: {
						Request: {
							fields: {
								config: { type: 'DynamicValue', id: 1 },
								connection: { type: 'DynamicValue', id: 2 },
							},
						},
						Response: {
							fields: {
								output: { type: 'string', id: 1 },
								diagnostics: { rule: 'repeated', type: 'Diagnostic', id: 2 },
							},
						},
					},
				},
			},
		},
	},
}
