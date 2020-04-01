const {getSecret} = require('../utils/getSecret.js');
const {saveToS3} = require('../utils/saveToS3.js');
const {production} = require('../utils/knexfile.js');
const responses = require('../utils/responses.js');
const {getBundleResourcesByType, getExtensionByUrl} = require('../utils/fhirUtils');
const {getCancerType} = require('../utils/conditionUtils');
const exceljs = require('exceljs');
const Stream = require('stream');
const fs = require('fs');
const archiver = require('archiver');
archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));

exports.handler = async () => {
  const login = await getSecret('Lambda-RDS-Login');
  production.connection.user = login.username;
  production.connection.password = login.password;
  production.connection.ssl = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(__dirname + '/../utils/rds-ca-2019-root.pem'),
  };

  const workbook = new exceljs.Workbook();
  workbook.creator = 'icaredata';
  workbook.created = workbook.modified = new Date();

  // Create separate worksheets
  const diseaseStatusWorksheet = workbook.addWorksheet('Disease Status');
  diseaseStatusWorksheet.columns = [
    {header: 'Effective Date', key: 'effectiveDate', width: 30},
    {header: 'Code Value', key: 'codeValue', width: 30},
    {header: 'Cancer Type', key: 'cancerType', width: 30},
    {header: 'Cancer Code Value', key: 'cancerCodeValue', width: 30},
    {header: 'Evidence', key: 'evidence', width: 30},
    {header: 'Subject ID', key: 'subjectId', width: 30},
    {header: 'Trial ID', key: 'trialId', width: 30},
    {header: 'Site ID', key: 'siteId', width: 30},
  ];

  const treatmentPlanChangeWorksheet = workbook.addWorksheet(
      'Treatment Plan Change',
  );
  treatmentPlanChangeWorksheet.columns = [
    {header: 'Effective Date', key: 'effectiveDate', width: 30},
    {header: 'Code Value', key: 'codeValue', width: 30},
    {header: 'Subject ID', key: 'subjectId', width: 30},
    {header: 'Trial ID', key: 'trialId', width: 30},
    {header: 'Site ID', key: 'siteId', width: 30},
  ];

  const stream = new Stream.PassThrough();
  const knex = require('knex')(production);
  const response = await knex('data.messages')
      .select('*')
      .then(async (data) => {
        // Loop through all rows in data.messages
        data.forEach((d) => {
          const {
            bundle,
            subject_id: subjectId,
            trial_id: trialId,
            site_id: siteId,
          } = d;

          const bundleEntry = getBundleResourcesByType(
              bundle,
              'Bundle',
              {},
              true,
          );

          // Get Disease Status resources and add relevant data to worksheet
          const dsResources = getDiseaseStatusResources(bundleEntry);
          dsResources.forEach((resource) => {
            const evidenceExtension = getExtensionByUrl(
                resource.extension,
                'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-evidence-type',
            );

            // Joins the array of evidence items
            const evidence = evidenceExtension ?
              translateCodeableConcept(evidenceExtension.valueCodeableConcept) :
              '';
            const condition = getConditionFromReference(bundleEntry, resource.focus[0].reference);

            diseaseStatusWorksheet.addRow({
              evidence,
              subjectId,
              trialId,
              siteId,
              effectiveDate: resource.effectiveDateTime,
              cancerType: getCancerType(condition),
              cancerCodeValue: translateCodeableConcept(condition.code),
              codeValue: translateCodeableConcept(resource.valueCodeableConcept),
            });
          });

          // Get CarePlan Resources and add data to worksheet
          const carePlanResources = getBundleResourcesByType(
              bundleEntry,
              'CarePlan',
              {},
              false,
          );

          carePlanResources.forEach((resource) => {
            const reviewDate = getExtensionByUrl(
                resource.extension[0].extension,
                'ReviewDate',
            );
            const effectiveDate = reviewDate ? reviewDate.valueDate : '';
            const carePlanChangeReason = getExtensionByUrl(
                resource.extension[0].extension,
                'CarePlanChangedReason',
            );
            const changedFlag = getExtensionByUrl(
                resource.extension[0].extension,
                'ChangedFlag',
            );
            const codeValue = changedFlag.valueBoolean ?
              translateCodeableConcept(carePlanChangeReason.valueCodeableConcept) :
              'not evaluated';

            treatmentPlanChangeWorksheet.addRow({
              effectiveDate,
              codeValue,
              changedFlag: changedFlag.valueBoolean,
              subjectId: subjectId,
              trialId: trialId,
              siteId: siteId,
            });
          });
        });

        return await workbook.xlsx
            .write(stream)
            .then(async () => {
              const s3Password = await getSecret('S3-Zip-Password');
              const archive = archiver.create('zip-encrypted', {
                zlib: {level: 8},
                encryptionMethod: 'aes256',
                password: s3Password.password,
              });
              archive.append(stream, {name: 'icare.xlsx'});
              archive.finalize();
              await saveToS3(archive, 'icaredata-dev-extracted-data');
              return responses.response200;
            })
            .catch((e) => {
              console.log(e);
              return responses.response500;
            });
      })
      .catch((e) => {
        console.log(e);
        return responses.response500;
      });

  knex.destroy();

  return response;
};

// Translates `valueCodeableConcept` into a format(codeSystem : code) to be input into spreadsheet
// If there are multiple codes, will join them and delimit with |
const translateCodeableConcept = (valueCodeableConcept) => {
  return valueCodeableConcept.coding.map((c) => `${c.system} : ${c.code}`).join(' | ');
};

// Filters Observation list for system and code specific to disease status
const getDiseaseStatusResources = (bundle) => {
  return getBundleResourcesByType(
      bundle,
      'Observation',
      {},
      false,
  ).filter((r) => r.code.coding.some((c) => c.system === 'http://loinc.org' && c.code === '88040-1'));
};

// Retrieves condition resource by looking at id on reference
const getConditionFromReference = (bundle, reference) => {
  return getBundleResourcesByType(
      bundle,
      'Condition',
      {},
      false,
  ).find((r) => r.id === reference.split('/')[1]);
};
