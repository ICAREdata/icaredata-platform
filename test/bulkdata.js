
const {expect} = require('chai');
const axios = require('axios');

const statement = require('../bulkdata/statement.json');

describe('SMART Configuration endpoint', async () => {
  const apiGateway = axios.create({baseURL: 'http://localhost:3000'});

  it('should return a valid SMART configuration statement', async () => {
    const resp = await apiGateway.get('/.well-known/smart-configuration')
        .then((r) => r)
        .catch((e) => e.response);

    expect(resp).to.have.property('status');
    expect(resp.status).to.equal(200);
    expect(resp).to.have.property('data');
    expect(resp.data).to.have.property('token_endpoint');
    expect(resp.data.token_endpoint).to.equal(statement.token_endpoint);
    expect(resp.data).to.have.property('token_endpoint_auth_methods_supported');
    expect(resp.data.token_endpoint_auth_methods_supported.length).to.equal(1);
    expect(resp.data.token_endpoint_auth_methods_supported[0])
        .to.equal(statement.token_endpoint_auth_methods_supported[0]);
    expect(resp.data)
        .to.have.property('token_endpoint_auth_signing_alg_values_supported');
    expect(resp.data.token_endpoint_auth_signing_alg_values_supported.length)
        .to.equal(2);
    expect(resp.data.token_endpoint_auth_signing_alg_values_supported[0])
        .to.equal(
            statement.token_endpoint_auth_signing_alg_values_supported[0]);
    expect(resp.data.token_endpoint_auth_signing_alg_values_supported[1])
        .to.equal(
            statement.token_endpoint_auth_signing_alg_values_supported[1]);
    expect(resp.data).to.have.property('scopes_supported');
    expect(resp.data.scopes_supported.length).to.equal(1);
    expect(resp.data.scopes_supported[0])
        .to.equal(statement.scopes_supported[0]);
    expect(resp.data).to.have.property('registration_endpoint');
    expect(resp.data.registration_endpoint)
        .to.equal(statement.registration_endpoint);
  });
});
