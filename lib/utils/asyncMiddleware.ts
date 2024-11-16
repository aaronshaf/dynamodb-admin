import type { RequestHandler } from 'express';

export default function(endpointHandlerFunction: RequestHandler): RequestHandler {
    return function(req, res, next) {
        Promise.resolve(endpointHandlerFunction(req, res, next)).catch(next);
    };
}
