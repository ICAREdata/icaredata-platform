const {expect} = require('chai');
const {handler} = require('../../conformance');

describe('Metadata - handler', async () => {
  it('Should return a FHIR conformance statement', async () => {
    const response = await handler();
    expect(response.resourceType).to.equal('Conformance');
    expect(response.format).to.contain('application/json+fhir');
  });
});
