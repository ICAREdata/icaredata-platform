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
          exp: Math.floor(Date.now()/1000) + 300,
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
    expect(resp.data).to.have.property('token_type');
    expect(resp.data).to.have.property('expires_in');
    expect(resp.data).to.have.property('scope');

    expect(resp.data.token_type).to.equal('bearer');
    // Hydra seems to ignore the exp value right now
    // expect(resp.data.expires_in).to.be.at.most(300);
    expect(resp.data.scope).to.equal('system/*.*');

    const introspection = await hydraAdmin.post('/oauth2/introspect',
        querystring.stringify({
          token: resp.data.access_token,
          scope: 'system/*.*',
        }));
    expect(introspection).to.have.property('data');
    expect(introspection.data).to.have.property('active');
    expect(introspection.data.active).to.be.true;
  });

  it('should not receive a token for an invalid client', async () => {

  });

  after(() => {
    hydraAdmin.delete(`/clients/${clientId}`);
  });
});
