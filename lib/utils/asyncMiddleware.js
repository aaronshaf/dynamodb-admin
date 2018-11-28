/**
 * @typedef {import('express').RequestHandler} RequestHandler
 *
 * @param {RequestHandler} endpointHandlerFunction
 *
 * @returns {RequestHandler}
 */
module.exports = function(endpointHandlerFunction) {
  return function(req, res, next) {
    Promise.resolve(endpointHandlerFunction(req, res, next)).catch(next)
  }
}
