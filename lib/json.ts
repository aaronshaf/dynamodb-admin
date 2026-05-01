import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import bodyParser from 'body-parser';

type BinaryTransform = (value: any) => any;

/**
 * Recursively transform B and BS values in a single DynamoDB attribute.
 */
function transformBinaryAttr(attr: any, transformB: BinaryTransform): any {
    if (attr == null) return attr;
    if (attr.B !== undefined) return { B: transformB(attr.B) };
    if (attr.BS) return { BS: attr.BS.map(transformB) };
    if (attr.L) return { L: attr.L.map((item: any) => transformBinaryAttr(item, transformB)) };
    if (attr.M) return { M: transformBinaryMap(attr.M, transformB) };
    return attr;
}

/**
 * Recursively transform B and BS values in a DynamoDB attribute map.
 */
function transformBinaryMap(attrMap: Record<string, any>, transformB: BinaryTransform): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, attr] of Object.entries(attrMap)) {
        result[key] = transformBinaryAttr(attr, transformB);
    }
    return result;
}

function bufferToBase64(buf: any): string {
    if (buf instanceof Uint8Array) return Buffer.from(buf).toString('base64');
    if (typeof buf === 'string') return buf;
    // {type: "Buffer", data: [...]} shape from JSON.stringify(Buffer)
    if (buf && buf.type === 'Buffer' && Array.isArray(buf.data)) {
        return Buffer.from(buf.data).toString('base64');
    }
    return String(buf);
}

function base64ToBuffer(b: any): Buffer {
    return typeof b === 'string' ? Buffer.from(b, 'base64') : b;
}

/**
 * Converts a Document Client item to a DynamoDB attribute map that is safe
 * for native JSON.stringify. Numbers are {"N": "string"}, binary data is base64.
 */
export function itemToAttributeMap(item: Record<string, any>): Record<string, AttributeValue> {
    return transformBinaryMap(marshall(item, { removeUndefinedValues: true }), bufferToBase64) as Record<string, AttributeValue>;
}

/**
 * Converts a DynamoDB attribute map back to a Document Client item.
 * Converts base64 strings in B/BS back to Buffers, then unmarshalls
 * with wrapNumbers so large numbers become NumberValue objects.
 */
export function attributeMapToItem(attributeMap: Record<string, AttributeValue>): Record<string, any> {
    return unmarshall(transformBinaryMap(attributeMap, base64ToBuffer) as Record<string, AttributeValue>, { wrapNumbers: true });
}

/**
 * Express body parser middleware for attribute map JSON bodies.
 * Parses the JSON body with native JSON.parse (safe since attribute maps
 * represent all numbers as strings), then unmarshalls to a Document Client item.
 */
export function attributeMapBodyParser(options?: { limit?: string }) {
    return [
        bodyParser.json({ limit: options?.limit ?? '500kb' }),
        (req: any, _res: any, next: any) => {
            if (req.body && typeof req.body === 'object') {
                try {
                    req.body = attributeMapToItem(req.body);
                } catch (err) {
                    return next(err);
                }
            }
            next();
        },
    ];
}
