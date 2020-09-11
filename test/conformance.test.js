const {expect} = require('chai');
const {handler} = require('../conformance');

describe('Metadata', async () => {
  describe('handler', async () => {
    it('Should return a FHIR conformance statement', async () => {
      const response = await handler();
      expect(response.resourceType).to.equal('CapabilityStatement');
      expect(response.format).to.contain('application/json+fhir');
    });
  });
});
