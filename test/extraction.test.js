const {expect} = require('chai');
const rewire = require('rewire');
const extraction = rewire('../extraction');
const data = require('./fixtures/extraction/data.json');

// helpers from extraction/index.js
const createIcareWorkbook = extraction.__get__('createIcareWorkbook');
const translateCode = extraction.__get__('translateCode');
const getDiseaseStatusResources = extraction.__get__('getDiseaseStatusResources');
const processData = extraction.__get__('processData');

describe('Extraction', () => {
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
      expect(getDiseaseStatusResources(bundle)).to.have.length(1);

      bundle.entry.push({resource: observationWithoutCode});
      expect(bundle.entry).to.have.length(2);
      // Should filter out observation without loinc code
      expect(getDiseaseStatusResources(bundle)).to.have.length(1);
    });
  });

  const workbook = createIcareWorkbook();
  const diseaseStatusWorksheet = workbook.getWorksheet('Disease Status');
  const treatmentPlanChangeWorksheet = workbook.getWorksheet('Treatment Plan Change');
  describe('createIcareWorkbook', () => {
    it('creates workbook with Disease Status and Treatment Plan Change worksheets', () => {
      expect(diseaseStatusWorksheet).to.exist;
      expect(diseaseStatusWorksheet.columnCount).to.equal(8);
      expect(diseaseStatusWorksheet.rowCount).to.equal(1);
      expect(treatmentPlanChangeWorksheet).to.exist;
      expect(treatmentPlanChangeWorksheet.columnCount).to.equal(5);
      expect(treatmentPlanChangeWorksheet.rowCount).to.equal(1);
      expect(workbook.getWorksheet('Test Worksheet')).to.not.exist;
    });
  });

  describe('processData', () => {
    expectedDsRow = {
      effectiveDate: '2019-04-01',
      codeValue: 'http://snomed.info/sct : 268910001',
      cancerType: 'primary',
      cancerCodeValue: 'http://snomed.info/sct : 254637007 | http://hl7.org/fhir/sid/icd-10-cm : C50211',
      evidence: 'http://snomed.info/sct : 252416005',
      subjectId: 'subjectId1',
      trialId: 'trialId1',
      siteId: 'siteId1',
    };

    expectedTpRow = {
      effectiveDate: '2020-02-23',
      codeValue: 'not evaluated',
      subjectId: 'subjectId2',
      trialId: 'trialId2',
      siteId: 'siteId2',
    };

    it('adds rows to disease status and treatment plan change worksheets', () => {
      processData(data, workbook);

      // Header + 2 disease statuses from 1st bundle + 1 disease status from 2nd
      expect(diseaseStatusWorksheet.rowCount).to.equal(4);
      const dsRow = diseaseStatusWorksheet.getRow(2);
      expect(dsRow.getCell('effectiveDate').text).to.equal(expectedDsRow.effectiveDate);
      expect(dsRow.getCell('codeValue').text).to.equal(expectedDsRow.codeValue);
      expect(dsRow.getCell('cancerType').text).to.equal(expectedDsRow.cancerType);
      expect(dsRow.getCell('cancerCodeValue').text).to.equal(expectedDsRow.cancerCodeValue);
      expect(dsRow.getCell('evidence').text).to.equal(expectedDsRow.evidence);
      expect(dsRow.getCell('subjectId').text).to.equal(expectedDsRow.subjectId);
      expect(dsRow.getCell('trialId').text).to.equal(expectedDsRow.trialId);
      expect(dsRow.getCell('siteId').text).to.equal(expectedDsRow.siteId);

      // Header + 1 careplan from each bundle
      expect(treatmentPlanChangeWorksheet.rowCount).to.equal(3);
      const tpRow = treatmentPlanChangeWorksheet.getRow(3);
      expect(tpRow.getCell('effectiveDate').text).to.equal(expectedTpRow.effectiveDate);
      expect(tpRow.getCell('codeValue').text).to.equal(expectedTpRow.codeValue);
      expect(tpRow.getCell('subjectId').text).to.equal(expectedTpRow.subjectId);
      expect(tpRow.getCell('trialId').text).to.equal(expectedTpRow.trialId);
      expect(tpRow.getCell('siteId').text).to.equal(expectedTpRow.siteId);
    });
  });
});
