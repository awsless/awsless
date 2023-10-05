import { paramCase, pascalCase } from "change-case"
import { Lazy } from './resource.js';
import { Stack } from "./stack.js";

export type ConstructorOf<C> = { new (...args: any[]): C; };

export const ref = <T = string>(logicalId: string): T => {
	return { Ref: logicalId } as T
}

export const sub = <T = string>(value: string, params?: Record<string, string>): T => {
	if(params) {
		return { 'Fn::Sub': [ value, params ] } as T
	}

	return { 'Fn::Sub': value } as T
}

export const split = <T = string>(seperator: string, value: string): T => {
	return { 'Fn::Split': [ seperator, value ] } as T
}

export const select = <T = string>(index: number, value: string): T => {
	return { 'Fn::Select': [ index, value ] } as T
}

export const getAtt = <T = string>(logicalId: string, attr: string): T => {
	return { 'Fn::GetAtt': [ logicalId, attr ] } as T
}

export const lazy = <T = string>(cb: (stack:Stack) => T): T => {
	return new Lazy(cb) as T
}

export const importValue = <T = string>(name: string): T => {
	// return lazy<T>((stack) => ({
	// 	'Fn::ImportValue': `${ stack.app!.name }-${name}`
	// } as T))

	return { 'Fn::ImportValue': name } as T
}

export const formatLogicalId = (id: string) => {
	return pascalCase(id).replaceAll('_', '')
}

export const formatName = (name: string) => {
	return paramCase(name)
}

export const formatArn = (props: { service: string, resource: string, resourceName: string, seperator?: string }) => {
	return sub('arn:${AWS::Partition}:${service}:${AWS::Region}:${AWS::AccountId}:${resource}${seperator}${resourceName}', {
		seperator: '/',
		...props
	})
}
