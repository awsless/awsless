import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

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
    // @ts-ignore
    await fetch(event.ResponseURL, {
        method: 'PUT',
        port: 443,
        body,
        headers: {
            'content-type': '',
            'content-length': Buffer.from(body).byteLength
        }
    });
};

const client = new CloudFrontClient({});
const handler = async (event)=>{
    const type = event.RequestType;
    const { distributionId, paths } = event.ResourceProperties;
    console.log('Type', type);
    console.log('DistributionId', distributionId);
    console.log('Paths', paths);
    try {
        if (type === 'Update') {
            await invalidateCache(distributionId, paths);
        }
        await send(event, distributionId, 'SUCCESS');
    } catch (error) {
        if (error instanceof Error) {
            await send(event, distributionId, 'FAILED', {}, error.message);
        } else {
            await send(event, distributionId, 'FAILED', {}, 'Unknown error');
        }
        console.error(error);
    }
};
const invalidateCache = async (distributionId, paths)=>{
    const result = await client.send(new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
            CallerReference: Date.now().toString(),
            Paths: {
                Quantity: paths.length,
                Items: paths
            }
        }
    }));
    return result.Invalidation.Id;
};

export { handler };
