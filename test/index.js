const chai = require('chai');
const axios = require('axios');
const {JWK, JWS} = require('node-jose');
const uuidv4 = require('uuid/v4');

describe('Get a valid OAuth Token', async () => {
  const hydra = axios.create({
    baseURL: 'https://localhost:9001',
    headers: {'Accept': 'application/json'},
  });
  const keystore = JWK.createKeyStore();
  const kid = uuidv4();

  before(async () => {
    await keystore.generate('RSA', 2048, {kid, use: 'sig'});
  });

  it('should register a test client', async () => {
    const key = keystore.get(kid).toJSON();
    try {
      const resp = await hydra.post('/clients', {
        client_id: 'test-client',
        jwks: {
          keys: [key],
        },
      });
      console.log(resp);
    } catch (err) {
      console.log(err);
    }
  });

  // it('should receive a valid token', async () => {
  //   const payload = {};
  //   const key = await JWK.createKey('RSA', 2048);
  //   const options = {
  //     algorithm: 'RS256', // hydra doesn't support any other signing algorithm
  //     // The following comments are from https://build.fhir.org/ig/HL7/bulk-data/authorization/index.html
  //     keyid: 'e34bd62e-b02d-4607-b360-afbeaeb986c7', // The identifier of the
  //     // key-pair used to sign this JWT
  //     expiresIn: '5m', // This time SHALL be no more than five minutes in the future
  //     issuer: 'test-client', // the client's client_id
  //     subject: 'test-client', // this is the same as the value for the iss claim
  //     audience: 'https://localhost:9000/oauth2/token', // The FHIR authorization server's token URL
  //     jwtid: 'c08cad54-687f-4b35-90e9-cf108855006e',
  //   };
  //   const token = jwt.sign(payload, privateKey, options);
  // });
});
