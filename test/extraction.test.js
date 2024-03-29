const _ = require('lodash');
const { expect } = require('chai');
const rewire = require('rewire');
const extraction = rewire('../extraction');
const data = require('./fixtures/extraction/data.json');
const treatmentPlanChangeData = require('./fixtures/extraction/carePlanResources.json');

// helpers from extraction/index.js
const createIcareWorkbook = extraction.__get__('createIcareWorkbook');
const translateCode = extraction.__get__('translateCode');
const getDiseaseStatusResources = extraction.__get__(
  'getDiseaseStatusResources'
);
const processData = extraction.__get__('processData');
const getCarePlanDataFromExtensions = extraction.__get__(
  'getCarePlanDataFromExtensions'
);

describe('Extraction', () => {
  describe('translateCode', () => {
    const codingObject1 = { system: 'system1', code: 'code1' };
    const codingObject2 = { system: 'system2', code: 'code2' };
    const exampleCodeObject = {
      coding: [codingObject1],
    };

    it('returns empty string when passed empty object', () => {
      expect(translateCode({})).to.be.empty;
    });

    it('returns string in correct format', () => {
      const { system, code } = codingObject1;
      expect(translateCode(exampleCodeObject)).to.equal(`${system} : ${code}`);
    });

    it('returns delimited string in correct format when multiple codings', () => {
      const { system: system1, code: code1 } = codingObject1;
      const { system: system2, code: code2 } = codingObject2;
      const modifiedCodeObject = { ...exampleCodeObject };
      modifiedCodeObject.coding.push(codingObject2);
      expect(translateCode(modifiedCodeObject)).to.equal(
        `${system1} : ${code1} | ${system2} : ${code2}`
      );
    });
  });

  describe('getDiseaseStatusResources', () => {
    const observationWithoutCode = { resourceType: 'Observation' };
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
    const bundle = { resourceType: 'Bundle' };

    it('returns an empty array when an observation without the correct code is supplied', () => {
      bundle.entry = [{ resource: observationWithoutCode }];
      expect(getDiseaseStatusResources(bundle)).to.be.empty;
    });

    it('returns array with only disease status observations', () => {
      bundle.entry = [{ resource: observationWithCode }];
      expect(getDiseaseStatusResources(bundle)).to.have.length(1);

      bundle.entry.push({ resource: observationWithoutCode });
      expect(bundle.entry).to.have.length(2);
      // Should filter out observation without loinc code
      expect(getDiseaseStatusResources(bundle)).to.have.length(1);
    });
  });

  const workbook = createIcareWorkbook();
  // Clone these in case of race conditions with later modifications of worksheets
  const diseaseStatusWorksheet = _.cloneDeep(
    workbook.getWorksheet('Disease Status')
  );
  const treatmentPlanChangeWorksheet = _.cloneDeep(
    workbook.getWorksheet('Treatment Plan Change')
  );
  const adverseEventWorksheet = _.cloneDeep(
    workbook.getWorksheet('Adverse Event')
  );
  describe('createIcareWorkbook', () => {
    it('creates workbook with Disease Status worksheet', () => {
      expect(diseaseStatusWorksheet).to.exist;
      expect(diseaseStatusWorksheet.columnCount).to.equal(10);
      expect(diseaseStatusWorksheet.rowCount).to.equal(1);
    });
    it('creates workbook with Treatment Plan Change worksheets', () => {
      expect(treatmentPlanChangeWorksheet).to.exist;
      expect(treatmentPlanChangeWorksheet.columnCount).to.equal(8);
      expect(treatmentPlanChangeWorksheet.rowCount).to.equal(1);
    });
    it('creates workbook with Adverse Event worksheets', () => {
      expect(adverseEventWorksheet).to.exist;
      expect(adverseEventWorksheet.columnCount).to.equal(17);
      expect(adverseEventWorksheet.rowCount).to.equal(1);
    });
    it('does not create workbook with an unexpected worksheet', () => {
      expect(workbook.getWorksheet('Test Worksheet')).to.not.exist;
    });
  });

  describe('processData', () => {
    const expectedDsRow = {
      submissionDate: '2019-04-01',
      bundleId: '1',
      effectiveDate: '2019-04-01',
      codeValue: 'http://snomed.info/sct : 268910001',
      cancerType: 'primary',
      cancerCodeValue:
        'http://snomed.info/sct : 254637007 | http://hl7.org/fhir/sid/icd-10-cm : C50.211',
      evidence: 'http://snomed.info/sct : 252416005',
      subjectId: 'subjectId1',
      trialId: 'trialId1',
      siteId: 'siteId1',
    };

    const expectedTpRow = {
      submissionDate: '2019-04-01',
      bundleId: '2',
      effectiveDate: '2020-02-23',
      changedFlag: 'false',
      codeValue: '',
      subjectId: 'subjectId2',
      trialId: 'trialId2',
      siteId: 'siteId2',
    };

    const expectedAeRow = {
      submissionDate: '2019-04-01',
      bundleId: '1',
      adverseEventGrade:
        '2 : http://hl7.org/fhir/us/ctcae/CodeSystem/ctcae-grade-code-system',
      adverseEventCode: 'code-system : 109006',
      suspectedCause: 'Procedure : urn:uuid:procedure-id',
      seriousnessCode:
        'http://terminology.hl7.org/CodeSystem/adverse-event-seriousness : serious',
      categoryCode:
        'http://terminology.hl7.org/CodeSystem/adverse-event-category : product-use-error',
      actuality: 'actual',
      effectiveDate: '1994-12-09',
      recordedDate: '1994-12-09',
      subjectId: 'subjectId1',
      trialId: 'trialId1',
      siteId: 'siteId1',
      seriousnessOutcome:
        'C113380 : http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
      resolvedDate: '2021-12-09',
      suspectedCauseAssessments: '',
      outcomeCode: '',
    };

    // Process data should have side effects
    processData(data, workbook);
    // Local copies of the worksheets after data processing
    const diseaseStatusWorksheet = workbook.getWorksheet('Disease Status');
    const treatmentPlanChangeWorksheet = workbook.getWorksheet(
      'Treatment Plan Change'
    );
    const adverseEventWorksheet = workbook.getWorksheet('Adverse Event');
    it('adds rows to disease worksheet', () => {
      // Header + 2 disease statuses from 1st bundle + 1 disease status from 2nd
      expect(diseaseStatusWorksheet.rowCount).to.equal(4);
      const dsRow = diseaseStatusWorksheet.getRow(2);
      expect(dsRow.getCell('effectiveDate').text).to.equal(
        expectedDsRow.effectiveDate
      );
      expect(dsRow.getCell('codeValue').text).to.equal(expectedDsRow.codeValue);
      expect(dsRow.getCell('cancerType').text).to.equal(
        expectedDsRow.cancerType
      );
      expect(dsRow.getCell('cancerCodeValue').text).to.equal(
        expectedDsRow.cancerCodeValue
      );
      expect(dsRow.getCell('evidence').text).to.equal(expectedDsRow.evidence);
      expect(dsRow.getCell('subjectId').text).to.equal(expectedDsRow.subjectId);
      expect(dsRow.getCell('trialId').text).to.equal(expectedDsRow.trialId);
      expect(dsRow.getCell('siteId').text).to.equal(expectedDsRow.siteId);

      // A disease status bundle with a dataAbsentReason extension should have 'not-asked' in it's codeValue field
      const dsNotAskedRow = diseaseStatusWorksheet.getRow(4);
      expect(dsNotAskedRow.getCell('codeValue').text).to.equal('not-asked');
    });
    it('adds rows to treatment plan change worksheet', () => {
      // Header + 1 careplan extension from each bundle
      expect(treatmentPlanChangeWorksheet.rowCount).to.equal(4);
      const tpRow = treatmentPlanChangeWorksheet.getRow(4);
      expect(tpRow.getCell('effectiveDate').text).to.equal(
        expectedTpRow.effectiveDate
      );
      expect(tpRow.getCell('changedFlag').text).to.equal(
        expectedTpRow.changedFlag
      );
      expect(tpRow.getCell('codeValue').text).to.equal(expectedTpRow.codeValue);
      expect(tpRow.getCell('subjectId').text).to.equal(expectedTpRow.subjectId);
      expect(tpRow.getCell('trialId').text).to.equal(expectedTpRow.trialId);
      expect(tpRow.getCell('siteId').text).to.equal(expectedTpRow.siteId);
    });
    it('adds rows to adverse events worksheet', () => {
      // Header + 1 AE from the first bundle only
      expect(adverseEventWorksheet.rowCount).to.equal(2);
      const aeRow = adverseEventWorksheet.getRow(2);
      expect(aeRow.getCell('submissionDate').text).to.equal(
        expectedAeRow.submissionDate
      );
      expect(aeRow.getCell('bundleId').text).to.equal(expectedAeRow.bundleId);
      expect(aeRow.getCell('adverseEventCode').text).to.equal(
        expectedAeRow.adverseEventCode
      );
      expect(aeRow.getCell('suspectedCause').text).to.equal(
        expectedAeRow.suspectedCause
      );
      expect(aeRow.getCell('seriousnessCode').text).to.equal(
        expectedAeRow.seriousnessCode
      );
      expect(aeRow.getCell('categoryCode').text).to.equal(
        expectedAeRow.categoryCode
      );
      expect(aeRow.getCell('actuality').text).to.equal(expectedAeRow.actuality);
      expect(aeRow.getCell('effectiveDate').text).to.equal(
        expectedAeRow.effectiveDate
      );
      expect(aeRow.getCell('recordedDate').text).to.equal(
        expectedAeRow.recordedDate
      );
      expect(aeRow.getCell('subjectId').text).to.equal(expectedAeRow.subjectId);
      expect(aeRow.getCell('trialId').text).to.equal(expectedAeRow.trialId);
      expect(aeRow.getCell('siteId').text).to.equal(expectedAeRow.siteId);
    });
  });

  describe('getCarePlanDataFromExtensions', () => {
    it('gets proper list of extension entries', () => {
      const expectedReturn = [
        {
          effectiveDate: '2020-03-23',
          changedFlag: 'true',
          codeValue: 'http://snomed.info/sct : 281647001',
        },
        {
          effectiveDate: '2020-02-23',
          changedFlag: 'false',
          codeValue: '',
        },
      ];

      const extensionData = getCarePlanDataFromExtensions(
        treatmentPlanChangeData,
        ''
      );

      expect(extensionData).to.deep.equal(expectedReturn);
    });
  });
});
