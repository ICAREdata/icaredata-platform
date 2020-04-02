const {expect} = require('chai');
const {handler} = require('../../bulkdata');

describe('Bulkdata', async () => {
  describe('handler', async () => {
    it('Should return a token-specification statement', async () => {
      const response = await handler();
      expect(response).to.have.property('token_endpoint');
      expect(response).to.have.property('token_endpoint_auth_methods_supported');
      expect(response).to.have.property('token_endpoint_auth_signing_alg_values_supported');
      // We have a specific 'scopes_supported' value, 'system/$process-message'; check that value
      expect(response).to.have.property('scopes_supported');
      expect(response.scopes_supported).to.contain('system/$process-message');
    });
  });
});
