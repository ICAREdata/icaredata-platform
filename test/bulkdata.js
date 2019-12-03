
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
    expect(resp.data).to.deep.equal(statement);
  });
});
