const rewire = require('rewire');
const {expect} = require('chai');
const authorizerModule = rewire('../../authorizer');
const requestOptsWithAuthHeader = require('../fixtures/authorizer/requestOptsWithAuthHeader.json');
const policy = require('../fixtures/authorizer/policy.json');
const policyWithoutDocument = require('../fixtures/authorizer/policyWithoutDocument.json');

const generateOptionsWithAuthHeader = authorizerModule.__get__('generateOptionsWithAuthHeader');
describe('Authorizer - generateOptionsWithAuthHeader', async () => {
  it('should work', () => {
    const username = 'test-username';
    const password = 'test-password';
    const generatedRequestOptions = generateOptionsWithAuthHeader(username, password);
    expect(generatedRequestOptions).to.eql(requestOptsWithAuthHeader);
  });
});

const formatToken = authorizerModule.__get__('formatToken');
describe('Authorizer - formatToken', async () => {
  it('should remove the word Bearer', async () => {
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
    const policyResp = await generatePolicy(examplePrincipalId, exampleEffect, exampleResource);
    expect(policyResp).to.eql(policy);
  });

  it('should generate a fairly empty policy if missing effect or resource', async () => {
    const examplePrincipalId = 'examplePrincipalId';
    const exampleEffect = 'exampleEffect';
    const exampleResource = 'exampleResource';
    const policyWithoutResource = await generatePolicy(examplePrincipalId, exampleEffect, undefined);
    const policyWithoutEffect = await generatePolicy(examplePrincipalId, undefined, exampleResource);
    const policyWithoutBoth = await generatePolicy(examplePrincipalId, undefined, undefined);
    expect(policyWithoutResource).to.eql(policyWithoutDocument);
    expect(policyWithoutEffect).to.eql(policyWithoutDocument);
    expect(policyWithoutBoth).to.eql(policyWithoutDocument);
  });
});
