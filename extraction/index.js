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
const knex = require('knex');
archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));

// Creates excel workbook with Disease Status and Treatment Plan Change Worksheets
const createIcareWorkbook = () => {
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

  return workbook;
};

// Translates `codeObject` into a format(codeSystem : code) to be input into spreadsheet
// If there are multiple codes, will join them and delimit with |
const translateCode = (codeObject) => {
  return codeObject.coding ?
    codeObject.coding.map((c) => `${c.system} : ${c.code}`).join(' | ') :
    '';
};

// Filters Observation list for system and code specific to disease status
const getDiseaseStatusResources = (bundle) => {
  return getBundleResourcesByType(
      bundle,
      'Observation',
      {},
      false,
  ).filter((r) => r.code && r.code.coding.some((c) => c.system === 'http://loinc.org' && c.code === '88040-1'));
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

// Add Disease Status Resource to worksheet
const addDiseaseStatusDataToWorksheet = (bundle, worksheet, trialData) => {
  const dsResources = getDiseaseStatusResources(bundle);
  dsResources.forEach((resource) => {
    const evidenceExtension = getExtensionByUrl(
        resource.extension,
        'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-evidence-type',
    );

    // Joins the array of evidence items
    const evidence = evidenceExtension ?
      translateCode(evidenceExtension.valueCodeableConcept) :
      '';
    const condition = getConditionFromReference(bundle, resource.focus[0].reference);

    worksheet.addRow({
      ...trialData,
      evidence,
      effectiveDate: resource.effectiveDateTime,
      cancerType: getCancerType(condition),
      cancerCodeValue: translateCode(condition.code),
      codeValue: translateCode(resource.valueCodeableConcept),
    });
  });
};

// Add Careplan resources to worksheet
const addCarePlanDataToWorksheet = (bundle, worksheet, trialData) => {
  // Get CarePlan Resources and add data to worksheet
  const carePlanResources = getBundleResourcesByType(
      bundle,
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
    translateCode(carePlanChangeReason.valueCodeableConcept) :
    'not evaluated';

    worksheet.addRow({
      ...trialData,
      effectiveDate,
      codeValue,
    });
  });
};

const addIcareDataToWorkbook = (bundle, workbook, trialData) => {
  const diseaseStatusWorksheet = workbook.getWorksheet('Disease Status');
  const treatmentPlanChangeWorksheet = workbook.getWorksheet('Treatment Plan Change');

  addDiseaseStatusDataToWorksheet(bundle, diseaseStatusWorksheet, trialData);
  addCarePlanDataToWorksheet(bundle, treatmentPlanChangeWorksheet, trialData);
};

// Processes rows in data.messages and adds to workbook
const processData = (data, workbook) => {
  // Loop through all rows in data.messages
  data.forEach((d) => {
    const {
      bundle,
      subject_id: subjectId,
      trial_id: trialId,
      site_id: siteId,
    } = d;

    const containedBundle = getBundleResourcesByType(
        bundle,
        'Bundle',
        {},
        true,
    );

    const trialData = {subjectId, trialId, siteId};
    addIcareDataToWorkbook(containedBundle, workbook, trialData);
  });
};

const connectToDB = async () => {
  const login = await getSecret('Lambda-RDS-Login');
  production.connection.user = login.username;
  production.connection.password = login.password;
  production.connection.ssl = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(__dirname + '/../utils/rds-ca-2019-root.pem'),
  };
  return knex(production);
};

const getData = async (dbConnection) => {
  return await dbConnection('data.messages').select('*');
};

const encryptZip = (stream, password) => {
  const archive = archiver.create('zip-encrypted', {
    password,
    zlib: {level: 8},
    encryptionMethod: 'aes256',
  });

  archive.append(stream, {name: 'icare.xlsx'});
  archive.finalize();

  return archive;
};

exports.handler = async () => {
  const dbConnection = await connectToDB();
  const workbook = createIcareWorkbook();
  const stream = new Stream.PassThrough();
  const response = await getData(dbConnection)
      .then(async (data) => {
        processData(data, workbook);

        return await workbook.xlsx
            .write(stream)
            .then(async () => {
              const s3Password = await getSecret('S3-Zip-Password');
              const archive = encryptZip(stream, s3Password.password);
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

  dbConnection.destroy();

  return response;
};
