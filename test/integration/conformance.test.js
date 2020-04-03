
const {expect} = require('chai');
const axios = require('axios');

const statement = require('../../conformance/statement.json');

describe('Conformance endpoint', async () => {
  const apiGateway = axios.create({baseURL: 'https://testing.icaredata.org'});

  it('should return a valid conformance statement', async () => {
    const resp = await apiGateway.get('/metadata')
        .then((r) => r)
        .catch((e) => e.response);
    console.log(resp);

    expect(resp).to.have.property('status');
    expect(resp.status).to.equal(200);
    expect(resp).to.have.property('data');
    expect(resp.data).to.deep.equal(statement);
  });
});
