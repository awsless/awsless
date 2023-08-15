import { paramCase, pascalCase } from "change-case"

export const ref = <T = string>(logicalId: string): T => {
	return { Ref: logicalId } as T
}

export const getAtt = <T = string>(logicalId: string, attr: string): T => {
	return { GetAtt: [ logicalId, attr ] } as T
}

export const formatLogicalId = (id: string) => {
	return pascalCase(id)
}

export const formatName = (name: string) => {
	return paramCase(name)
}
