import { CognitoIdentityProviderClient, DescribeUserPoolClientCommand } from '@aws-sdk/client-cognito-identity-provider';

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

const client = new CognitoIdentityProviderClient({});
const handler = async (event)=>{
    const type = event.RequestType;
    const userPoolId = event.ResourceProperties.userPoolId;
    const clientId = event.ResourceProperties.clientId;
    console.log('Type:', type);
    console.log('UserPoolId:', userPoolId);
    console.log('ClientId:', clientId);
    try {
        if (type === 'Create' || type === 'Update') {
            const input = {
                UserPoolId: userPoolId,
                ClientId: clientId
            };
            const command = new DescribeUserPoolClientCommand(input);
            const response = await client.send(command);
            const secret = response.UserPoolClient?.ClientSecret;
            await send(event, clientId, 'SUCCESS', {
                secret
            });
        } else {
            await send(event, clientId, 'SUCCESS');
        }
    } catch (error) {
        if (error instanceof Error) {
            await send(event, clientId, 'FAILED', {}, error.message);
        } else {
            await send(event, clientId, 'FAILED', {}, 'Unknown error');
        }
        console.error(error);
    }
};

export { handler };
