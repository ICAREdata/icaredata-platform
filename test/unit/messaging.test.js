require('dotenv').config({path: '../fixtures/.env'});
const {expect} = require('chai');
const rewire = require('rewire');
const exampleMessage = require('../fixtures/messaging/exampleR4Message.json');
const processMessage = rewire('../../process-message');

// helpers from process-message/index.js
const isValidFHIRBundle = processMessage.__get__('isValidFHIRBundle');
const isMessageBundle = processMessage.__get__('isMessageBundle');
const getBundleResourcesByType = processMessage.__get__('getBundleResourcesByType');
const getBundleId = processMessage.__get__('getBundleId');
const getSubjectId = processMessage.__get__('getSubjectId');
const getSiteId = processMessage.__get__('getSiteId');
const getTrialId = processMessage.__get__('getTrialId');

describe('Process Message - validation', () => {
  it('should return true for valid FHIR', () => {
    const isValid = isValidFHIRBundle(exampleMessage);
    expect(isValid).to.be.true;
  });

  it('should return false for invalid FHIR', () => {
    const invalidFHIR = {...exampleMessage};
    invalidFHIR.type = 'not-a-fhir-bundle-type';
    const isValid = isValidFHIRBundle(invalidFHIR);
    expect(isValid).to.be.false;
  });

  it('should return true for valid FHIR Message Bundle', () => {
    const isMessage = isMessageBundle(exampleMessage);
    expect(isMessage).to.be.true;
  });

  it('should return false for invalid FHIR Message Bundle', () => {
    const nonMessageBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [],
    };
    const isMessage = isMessageBundle(nonMessageBundle);
    expect(isMessage).to.be.false;
  });
});

describe('Process Message - resource retrieval', () => {
  it('should return resource of deisred type', () => {
    const resource = getBundleResourcesByType(exampleMessage, 'MessageHeader', {}, true);
    expect(resource).to.be.an('object');
    expect(resource.resourceType).to.equal('MessageHeader');
  });

  it('should return multiple resources of same time', () => {
    const bundle = getBundleResourcesByType(exampleMessage, 'Bundle', {}, true);
    expect(bundle).to.be.an('object');
    expect(bundle.resourceType).to.equal('Bundle');

    const observations = getBundleResourcesByType(bundle, 'Observation');
    expect(observations).to.be.an('array');
    expect(observations).to.have.length(2);
    expect(observations).to.satisfy((arr) => arr.every((r) => r.resourceType === 'Observation'));
  });
});

describe('Process Message - fhirpath queries', () => {
  const exampleBundleId = '10bb101f-a121-4264-a920-67be9cb82c74';
  const exampleSubjectId = '123';
  const exampleSiteId = 'http://icaredata.org/submission-client';
  const exampleTrialId = 'AFT1235';
  const bundle = getBundleResourcesByType(exampleMessage, 'Bundle', {}, true);

  it('should retrieve proper bundle id', () => {
    expect(getBundleId(exampleMessage)).to.equal(exampleBundleId);
  });

  it('should retrieve proper subject id', () => {
    const researchSubject = getBundleResourcesByType(bundle, 'ResearchSubject', {}, true);
    expect(getSubjectId(researchSubject)).to.equal(exampleSubjectId);
  });

  it('should retrieve proper site id', () => {
    const messageHeader = getBundleResourcesByType(exampleMessage, 'MessageHeader', {}, true);
    expect(getSiteId(messageHeader)).to.equal(exampleSiteId);
  });

  it('should retrieve proper trial id', () => {
    const researchStudy = getBundleResourcesByType(bundle, 'ResearchStudy', {}, true);
    expect(getTrialId(researchStudy)).to.equal(exampleTrialId);
  });
});
