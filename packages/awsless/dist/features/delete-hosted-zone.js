import { Route53Client, ChangeResourceRecordSetsCommand, ListResourceRecordSetsCommand } from '@aws-sdk/client-route-53';

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

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var chunk$1 = {exports: {}};

(function (module, exports) {

	(function () {
	  function chunk(collection, size) {
	    var result = [];

	    // default size to two item
	    size = parseInt(size) || 2;

	    // add each chunk to the result
	    for (var x = 0; x < Math.ceil(collection.length / size); x++) {
	      var start = x * size;
	      var end = start + size;

	      result.push(collection.slice(start, end));
	    }

	    return result;
	  }

	  // export in node or browser
	  {
	    if (module.exports) {
	      exports = module.exports = chunk;
	    }
	    exports.chunk = chunk;
	  }
	}.call(commonjsGlobal)); 
} (chunk$1, chunk$1.exports));

var chunkExports = chunk$1.exports;
var chunk = /*@__PURE__*/getDefaultExportFromCjs(chunkExports);

const client = new Route53Client({});
const handler = async (event)=>{
    const type = event.RequestType;
    const hostedZoneId = event.ResourceProperties.hostedZoneId;
    console.log('Type:', type);
    console.log('HostedZoneId:', hostedZoneId);
    try {
        if (type === 'Delete') {
            const records = await listHostedZoneRecords(hostedZoneId);
            console.log('Records:', records);
            await deleteHostedZoneRecords(hostedZoneId, records);
        }
        await send(event, hostedZoneId, 'SUCCESS');
    } catch (error) {
        if (error instanceof Error) {
            await send(event, hostedZoneId, 'FAILED', {}, error.message);
        } else {
            await send(event, hostedZoneId, 'FAILED', {}, 'Unknown error');
        }
        console.error(error);
    }
};
const deleteHostedZoneRecords = async (hostedZoneId, records)=>{
    records = records.filter((record)=>![
            'SOA',
            'NS'
        ].includes(record.Type));
    if (records.length === 0) {
        return;
    }
    await Promise.all(chunk(records, 100).map(async (records)=>{
        await client.send(new ChangeResourceRecordSetsCommand({
            HostedZoneId: hostedZoneId,
            ChangeBatch: {
                Changes: records.map((record)=>({
                        Action: 'DELETE',
                        ResourceRecordSet: record
                    }))
            }
        }));
    }));
};
const listHostedZoneRecords = async (hostedZoneId)=>{
    const records = [];
    let token;
    while(true){
        const result = await client.send(new ListResourceRecordSetsCommand({
            HostedZoneId: hostedZoneId,
            StartRecordName: token
        }));
        if (result.ResourceRecordSets && result.ResourceRecordSets.length) {
            records.push(...result.ResourceRecordSets);
        }
        if (result.NextRecordName) {
            token = result.NextRecordName;
        } else {
            return records;
        }
    }
};

export { handler };
