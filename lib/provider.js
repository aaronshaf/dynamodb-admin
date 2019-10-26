const { chain, memoize } = require("@aws-sdk/property-provider")
const { fromEnv } = require("@aws-sdk/credential-provider-env")
const { ENV_PROFILE, fromIni } = require("@aws-sdk/credential-provider-ini")


/**
 *
 * Removes the use of remote providers from the standard AWS credential provider.
 * Using the instance metadata service implies use of real DynamoDB, which is not
 * supported.
 *
 * https://github.com/aws/aws-sdk-js-v3/blob/58f58298/packages/credential-provider-node/src/index.ts#L51
 */
exports.CustomCredentialProvider = (defaultAccessKeyId, defaultSecretAccessKey) => {
  const fromDefaults = () => {
    return Promise.resolve({accessKeyId: defaultAccessKeyId, secretAccessKey: defaultSecretAccessKey})
  }
  return (init) => {
    init = init || {}
    const { profile = process.env[ENV_PROFILE] } = init;
    const providerChain = profile ? fromIni(init) : chain(
      fromEnv(), fromIni(init), fromDefaults,
    );

    return memoize(
      providerChain,
      credentials =>
        credentials.expiration !== undefined &&
        credentials.expiration - getEpochTs() < 300,
      credentials => credentials.expiration !== undefined
    );
  }
}


function getEpochTs() {
  return Math.floor(Date.now() / 1000);
}
