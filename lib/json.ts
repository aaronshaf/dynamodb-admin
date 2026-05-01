import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import bodyParser from 'body-parser';

/**
 * Converts a Document Client item (JS object with NumberValue for large numbers)
 * to a DynamoDB attribute map that is safe for native JSON.stringify.
 *
 * Numbers are represented as {"N": "string"} so no precision is lost.
 */
export function itemToAttributeMap(item: Record<string, any>): Record<string, AttributeValue> {
    return marshall(item, { removeUndefinedValues: true });
}

/**
 * Converts a DynamoDB attribute map back to a Document Client item.
 * Uses wrapNumbers so large numbers become NumberValue objects that
 * the Document Client can handle without precision loss.
 */
export function attributeMapToItem(attributeMap: Record<string, AttributeValue>): Record<string, any> {
    return unmarshall(attributeMap, { wrapNumbers: true });
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
