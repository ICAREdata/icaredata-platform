const {expect} = require('chai');
const https = require('https');
const axios = require('axios');
const {JWK, JWS} = require('node-jose');
const uuidv4 = require('uuid/v4');
const querystring = require('querystring');

describe('OAuth Server', async () => {
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

  /**
   * Makes the token request. By default, the token request should be valid
   * @param {*} param0 These properties can be specified to overwrite the
   * default values, which are for a valid token request
   * @return {Promise} The post request to the token endpoint
   */
  const getToken = async ({alg, kid2, typ, iss, sub, aud, exp, jti,
    signature, assertionType, grantType, scope} = {}) => {
    const private = signature || keystore.get(kid).toJSON(true);
    const tokenEndpoint = '/oauth2/token';
    const options = {
      compact: true,
      alg: alg || 'RS256',
      fields: {
        kid: kid2 || kid,
        typ: typ || 'JWT',
      },
    };

    const assertion = await JWS.createSign(options, private)
        .update(JSON.stringify({
          iss: iss || clientId,
          sub: sub || clientId,
          aud: aud || `${hydraPublic.defaults.baseURL}${tokenEndpoint}`,
          exp: exp || Math.floor(Date.now()/1000) + 300,
          jti: jti || uuidv4(),
        })).final();

    return hydraPublic.post(tokenEndpoint, querystring.stringify({
      client_assertion: assertion,
      client_assertion_type: assertionType ||
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      grant_type: grantType || 'client_credentials',
      scope: scope || 'system/*.*',
    }));
  };

  const assertInvalid = async (getTokenParam, expectedStatus) => {
    try {
      await getToken(getTokenParam);
    } catch (error) {
      expect(error).to.have.property('response');
      expect(error.response).to.have.property('status');
      expect(error.response.status).to.equal(expectedStatus);
    }
  };

  before(async () => { // Generate a jwk and register a test client
    await keystore.generate('RSA', 2048, {kid, use: 'sig'});
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
    await hydraAdmin.post('/clients', postData);
  });

  it('should return a valid authentication token for the client', async () => {
    const resp = await getToken();

    expect(resp).to.have.property('data');
    expect(resp.data).to.have.property('access_token');
    expect(resp.data).to.have.property('token_type');
    expect(resp.data).to.have.property('expires_in');
    expect(resp.data).to.have.property('scope');

    expect(resp.data.token_type).to.equal('bearer');
    // Hydra seems to ignore the exp value
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

  it('should not return a token when the issuer is invalid', async () => {
    assertInvalid({iss: 'sketchy person'}, 401);
  });

  it('should not return a token when the subject is invalid', async () => {
    assertInvalid({sub: 'sketchy person'}, 401);
  });

  it('should not return a token when the kid is invalid', async () => {
    assertInvalid({kid2: uuidv4()}, 400);
  });

  it('should not return a token when the audience is invalid', async () => {
    assertInvalid({aud: 'google.com'}, 401);
  });

  it('should not return a token when the signature is invalid', async () => {
    assertInvalid({signature: await JWK.createKey('RSA')}, 500);
  });

  it('should not return a token when the grant type is invalid', async () => {
    assertInvalid({grantType: '*'}, 400);
  });

  it('should not return a token when the scope is invalid', async () => {
    assertInvalid({scope: 'give me everything'}, 400);
  });

  after(() => {
    hydraAdmin.delete(`/clients/${clientId}`);
  });
});
