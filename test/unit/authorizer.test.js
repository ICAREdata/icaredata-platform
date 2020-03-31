const rewire = require('rewire');
const {expect} = require('chai');
const authorizerModule = rewire('../../authorizer');
const policyFixture = require('../fixtures/authorizer/policy.json');

const formatToken = authorizerModule.__get__('formatToken');
describe('Authorizer - formatToken', async () => {
  it('should remove the word BEARER', async () => {
    const exampleToken = 'Bearer x';
    expect(formatToken(exampleToken)).to.not.contain('Bearer');
  });
  it('should not change the string if it does not contain "Bearer"', async () => {
    const exampleToken1 = 'bearer 123123123';
    const exampleToken2 = 'BEARER 123123123';
    const exampleToken3 = '123123123';
    expect(formatToken(exampleToken1)).to.equal(exampleToken1);
    expect(formatToken(exampleToken2)).to.equal(exampleToken2);
    expect(formatToken(exampleToken3)).to.equal(exampleToken3);
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
    expect(policy).to.eql(policyFixture);
  });
});
