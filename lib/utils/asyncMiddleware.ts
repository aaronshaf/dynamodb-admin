import type { RequestHandler } from 'express';

export default function asyncMiddleware<
    P extends Record<string, string> = Record<string, string>,
    ResBody = any,
    ReqBody = any,
    ReqQuery extends Record<string, string | string[] | undefined> = Record<string, string | string[] | undefined>,
>(handler: RequestHandler<P, ResBody, ReqBody, ReqQuery>): RequestHandler {
    return function(req, res, next) {
        Promise.resolve(handler(req as Parameters<typeof handler>[0], res, next)).catch(next);
    };
}
