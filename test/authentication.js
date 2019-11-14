const {expect} = require('chai');
const https = require('https');
const axios = require('axios');
const {JWK, JWS} = require('node-jose');
const uuidv4 = require('uuid/v4');
const querystring = require('querystring');

describe('Get a valid OAuth Token', async () => {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // Turn off ssl verification
  });
  const hydraAdmin = axios.create({
    httpsAgent,
    baseURL: 'https://localhost:9001',
    headers: {'Accept': 'application/json'},
  });
  const hydraPublic = axios.create({
    httpsAgent,
    baseURL: 'https://localhost:9000',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const keystore = JWK.createKeyStore();
  const kid = uuidv4(); // The jwk's id
  const clientId = 'test-client';

  before(async () => { // Generate a jwk
    await keystore.generate('RSA', 2048, {kid, use: 'sig'});
  });

  it('should register a test client', async () => {
    const public = keystore.get(kid).toJSON();
    const postData = {
      client_id: clientId,
      jwks: {
        keys: [public],
      },
      token_endpoint_auth_method: 'private_key_jwt',
      scope: 'system/*.*',
      grant_types: ['client_credentials'],
    };
    const resp = await hydraAdmin.post('/clients', postData);
    expect(resp).to.have.property('data');
    expect(resp.data).to.deep.include(postData);
  });

  it('should receive a valid token for the test client', async () => {
    const private = keystore.get(kid).toJSON(true);
    const tokenEndpoint = '/oauth2/token';
    const options = {
      compact: true,
      alg: 'RS256',
      fields: {
        kid,
        typ: 'JWT',
      },
    };

    const assertion = await JWS.createSign(options, private)
        .update(JSON.stringify({
          iss: clientId,
          sub: clientId,
          aud: `${hydraPublic.defaults.baseURL}${tokenEndpoint}`,
          exp: new Date().getTime() + 300000,
          jti: uuidv4(),
        })).final();

    const resp = await hydraPublic.post(tokenEndpoint, querystring.stringify({
      client_assertion: assertion,
      client_assertion_type:
          'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      grant_type: 'client_credentials',
      scope: 'system/*.*',
    }));

    expect(resp).to.have.property('data');
    expect(resp.data).to.have.property('access_token');
  });

  it('should not receive a token for an invalid client', async () => {

  });

  after(() => {
    hydraAdmin.delete(`/clients/${clientId}`);
  });
});
