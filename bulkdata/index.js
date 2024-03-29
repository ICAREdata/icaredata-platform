const configurationStatement = {
  token_endpoint:
    process.env.TOKEN_ENDPOINT || 'https://testing.icaredata.org/oauth/token',
  token_endpoint_auth_methods_supported: ['private_key_jwt'],
  token_endpoint_auth_signing_alg_values_supported: ['RS384', 'ES384'],
  scopes_supported: ['system/$process-message'],
};

exports.handler = async () => {
  return configurationStatement;
};
