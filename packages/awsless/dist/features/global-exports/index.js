'use strict';

var clientCloudformation = require('@aws-sdk/client-cloudformation');

const send = async (event, id, status, data, reason = '')=>{
    const body = JSON.stringify({
        Status: status,
        Reason: reason,
        PhysicalResourceId: id,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        NoEcho: false,
        Data: data
    });
    await fetch(event.ResponseURL, {
        method: 'PUT',
        // @ts-ignore
        port: 443,
        body,
        headers: {
            'content-type': '',
            'content-length': Buffer.from(body).byteLength.toString()
        }
    });
};

const handler = async (event)=>{
    const region = event.ResourceProperties.region;
    try {
        const data = await listExports(region);
        await send(event, region, 'SUCCESS', data);
    } catch (error) {
        if (error instanceof Error) {
            await send(event, region, 'FAILED', {}, error.message);
        } else {
            await send(event, region, 'FAILED', {}, 'Unknown error');
        }
        console.error(error);
    }
};
const listExports = async (region)=>{
    const client = new clientCloudformation.CloudFormationClient({
        region
    });
    const data = {};
    let token;
    while(true){
        const result = await client.send(new clientCloudformation.ListExportsCommand({
            NextToken: token
        }));
        result.Exports?.forEach((item)=>{
            data[item.Name] = item.Value;
        });
        if (result.NextToken) {
            token = result.NextToken;
        } else {
            return data;
        }
    }
};

exports.handler = handler;
