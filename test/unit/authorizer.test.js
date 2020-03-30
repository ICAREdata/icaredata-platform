const rewire = require('rewire');
const {expect} = require('chai');
const authorizerModule = rewire('../../authorizer');
const policyFixture = require('../fixtures/authorizer/policy.json');

describe('Authorizer - handler', async () => {
  xit('should work', async () => {

  });
});

const generatePolicy = authorizerModule.__get__('generatePolicy');
describe('Authorizer - generatePolicy', async () => {
  it('should work with a principal id, effect and resource', async () => {
    const examplePrincipalId = 'examplePrincipalId';
    const exampleEffect = 'exampleEffect';
    const exampleResource = 'exampleResource';
    const policy = await generatePolicy(examplePrincipalId, exampleEffect, exampleResource);
    console.log('policy', JSON.stringify(policy));
    expect(policy).to.equal(policyFixture);
  });
});
