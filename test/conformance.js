
const {expect} = require('chai');
const axios = require('axios');

const statement = require('../conformance/statement.json');

describe('Conformance endpoint', async () => {
  const apiGateway = axios.create({baseURL: 'http://localhost:3000'});

  it('should return a valid conformance statement', async () => {
    const resp = await apiGateway.get('/metadata')
        .then((r) => r)
        .catch((e) => e.response);

    expect(resp).to.have.property('status');
    expect(resp.status).to.equal(200);
    expect(resp).to.have.property('data');
    expect(resp.data).to.have.property('resourceType');
    expect(resp.data.resourceType).to.equal(statement.resourceType);
    expect(resp.data).to.have.property('url');
    expect(resp.data.url).to.equal(statement.url);
    expect(resp.data).to.have.property('version');
    expect(resp.data.version).to.equal(statement.version);
    expect(resp.data).to.have.property('experimental');
    expect(resp.data.experimental).to.equal(statement.experimental);
    expect(resp.data).to.have.property('date');
    expect(resp.data.date).to.equal(statement.date);
    expect(resp.data).to.have.property('kind');
    expect(resp.data.kind).to.equal(statement.kind);
    expect(resp.data).to.have.property('fhirVersion');
    expect(resp.data.fhirVersion).to.equal(statement.fhirVersion);
    expect(resp.data).to.have.property('acceptUnknown');
    expect(resp.data.acceptUnknown).to.equal(statement.acceptUnknown);
    expect(resp.data).to.have.property('format');
    expect(resp.data.format.length).to.equal(1);
    expect(resp.data.format[0]).to.equal(statement.format[0]);
  });
});
