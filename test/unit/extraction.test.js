const {expect} = require('chai');
const rewire = require('rewire');
const extraction = rewire('../../extraction');

// helpers from extraction/index.js
const createIcareWorkbook = extraction.__get__('createIcareWorkbook');
const translateCode = extraction.__get__('translateCode');
const getDiseaseStatusResources = extraction.__get__('getDiseaseStatusResources');
const getConditionFromReference = extraction.__get__('getConditionFromReference');
const addDiseaseStatusDataToWorksheet = extraction.__get__('addDiseaseStatusDataToWorksheet');
const addCarePlanDataToWorksheet = extraction.__get__('addCarePlanDataToWorksheet');
const addIcareDataToWorkbook = extraction.__get__('addIcareDataToWorkbook');
const processData = extraction.__get__('processData');

describe('Extraction', () => {
  describe('createIcareWorkbook', () => {
    it('creates workbook with Disease Status and Treatment Plan Change worksheets', () => {
      const workbook = createIcareWorkbook();
      expect(workbook.getWorksheet('Disease Status')).to.exist;
      expect(workbook.getWorksheet('Treatment Plan Change')).to.exist;
      expect(workbook.getWorksheet('Test Worksheet')).to.not.exist;
    });
  });

  describe('translateCode', () => {
    const codingObject1 = {system: 'system1', code: 'code1'};
    const codingObject2 = {system: 'system2', code: 'code2'};
    const exampleCodeObject = {
      coding: [codingObject1],
    };

    it('returns empty string when passed empty object', () => {
      expect(translateCode({})).to.be.empty;
    });

    it('returns string in correct format', () => {
      const {system, code} = codingObject1;
      expect(translateCode(exampleCodeObject)).to.equal(`${system} : ${code}`);
    });

    it('returns delimited string in correct format when multiple codings', () => {
      const {system: system1, code: code1} = codingObject1;
      const {system: system2, code: code2} = codingObject2;
      const modifiedCodeObject = {...exampleCodeObject};
      modifiedCodeObject.coding.push(codingObject2);
      expect(translateCode(modifiedCodeObject)).to.equal(`${system1} : ${code1} | ${system2} : ${code2}`);
    });
  });

  describe('getDiseaseStatusResources', () => {
    const observationWithoutCode = {resourceType: 'Observation'};
    const observationWithCode = {
      resourceType: 'Observation',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '88040-1',
          },
        ],
      },
    };
    const bundle = {resourceType: 'Bundle'};

    it('returns an empty array', () => {
      bundle.entry = [{resource: observationWithoutCode}];
      expect(getDiseaseStatusResources(bundle)).to.be.empty;
    });

    it('returns array with disease status', () => {
      bundle.entry = [{resource: observationWithCode}];
      console.log(bundle);
      expect(getDiseaseStatusResources(bundle)).to.have.length(1);

      bundle.entry.push({resource: observationWithoutCode});
      expect(bundle.entry).to.have.length(2);
      // Should filter out observation without loinc code
      expect(getDiseaseStatusResources(bundle)).to.have.length(1);
    });
  });
});
