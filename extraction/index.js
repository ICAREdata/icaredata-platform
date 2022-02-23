const {getSecret} = require('../utils/getSecret.js');
const {saveToS3} = require('../utils/saveToS3.js');
const {getDatabaseConfiguration} = require('../utils/databaseUtils');
const {
  getBundleResourcesByType,
  getExtensionsByUrl,
  doResourceAndReferenceIdsMatch,
} = require('../utils/fhirUtils');
const {getCancerType} = require('../utils/conditionUtils');
const _ = require('lodash');
const exceljs = require('exceljs');
const Stream = require('stream');
const archiver = require('archiver');
const knex = require('knex');
const fhirpath = require('fhirpath');
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
    {header: 'Changed Flag', key: 'changedFlag', width: 30},
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
  return (codeObject && codeObject.coding) ?
    codeObject.coding.filter((c) => c).map((c) => `${c.system} : ${c.code}`).join(' | ') :
    '';
};

// Filters Observation list for system and code specific to disease status
const getDiseaseStatusResources = (bundle) => {
  return getBundleResourcesByType(
      bundle,
      'Observation',
      {},
      false,
  ).filter((r) => r.code && r.code.coding.filter((c) => c).some((c) => c.system === 'http://loinc.org' && c.code === '88040-1'));
};

// Retrieves condition resource by looking at ids and identifiers on focus reference
const getConditionFromFocusReference = (bundle, focuses) => {
  if (!(focuses && (focuses.length > 0))) return;
  const references = focuses.map((f) => f.reference).filter((f) => f);
  return getBundleResourcesByType(
      bundle,
      'Condition',
      {},
      false,
  ).find((resource) => references.some((reference) => doResourceAndReferenceIdsMatch(resource, reference)));
};

// Add Disease Status Resource to worksheet
const addDiseaseStatusDataToWorksheet = (bundle, worksheet, trialData) => {
  const bundleId = fhirpath.evaluate(bundle, 'Bundle.id')[0];

  const dsResources = getDiseaseStatusResources(bundle);
  dsResources.forEach((resource) => {
    const evidenceExtensions = getExtensionsByUrl(
        fhirpath.evaluate(resource, 'Observation.extension'),
        'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-evidence-type',
    );

    if (evidenceExtensions.length === 0) {
      console.log(`No evidence extensions were found on Bundle ${bundleId}.`);
    }

    // Joins the array of evidence items
    const evidence = evidenceExtensions.map((extension) => {
      return translateCode(extension.valueCodeableConcept);
    }).filter((evidence) => evidence).join(' | ');

    const condition = getConditionFromFocusReference(
        bundle,
        fhirpath.evaluate(resource, 'Observation.focus'),
    );

    if (!condition) {
      console.log(`No Condition was found by reference on Bundle ${bundleId}.`);
    }

    const newRow = {
      ...trialData,
      evidence,
      effectiveDate: resource.effectiveDateTime,
      cancerType: condition ? getCancerType(condition) : '',
      cancerCodeValue: condition ? translateCode(condition.code) : '',
      codeValue: resource.valueCodeableConcept && resource.valueCodeableConcept.extension && resource.valueCodeableConcept.extension.some((e) => e.valueCode === 'not-asked') ?
        'not-asked' :
        translateCode(resource.valueCodeableConcept),
    };
    const newRowValues = worksheet.columns.map((col) => newRow[col.key]);
    let duplicate = false;
    for (let i = 1; i < worksheet.rowCount+1; i++) {
      if (_.isEqual(newRowValues, worksheet.getRow(i).values.slice(1))) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) worksheet.addRow(newRow);
  });
};

// Get list of data objects for each extension on CarePlan
const getCarePlanDataFromExtensions = (carePlanResource, bundleId) => {
  const reviewExtensionUrl = 'http://mcodeinitiative.org/codex/us/icare/StructureDefinition/icare-care-plan-review';
  const reviewExtensions = fhirpath.evaluate(
      carePlanResource,
      `CarePlan.extension.where(url='${reviewExtensionUrl}')`,
  );

  return reviewExtensions.map((e) => {
    const reviewExtension = e.extension;
    const reviewDate = getExtensionsByUrl(reviewExtension, 'ReviewDate', true);
    const effectiveDate = reviewDate ? reviewDate.valueDate : '';
    const carePlanChangeReason = getExtensionsByUrl(reviewExtension, 'CarePlanChangeReason', true);
    const changedFlag = getExtensionsByUrl(reviewExtension, 'ChangedFlag', true);
    const codeValue = changedFlag.valueBoolean && carePlanChangeReason ?
      translateCode(carePlanChangeReason.valueCodeableConcept) :
      '';

    if (!reviewDate) {
      console.log(`No ReviewDate was found on Bundle ${bundleId}.`);
    }

    if (!changedFlag) {
      console.log(`No ChangedFlag was found on Bundle ${bundleId}.`);
    }

    if (changedFlag && changedFlag.valueBoolean && !carePlanChangeReason) {
      console.log(`No CarePlanChangeReason was found on Bundle ${bundleId}.`);
    }

    return {
      effectiveDate,
      changedFlag: (changedFlag.valueBoolean != null) ? `${changedFlag.valueBoolean}` : '',
      codeValue,
    };
  });
};

// Add Careplan resources to worksheet
const addCarePlanDataToWorksheet = (bundle, worksheet, trialData) => {
  const bundleId = fhirpath.evaluate(bundle, 'Bundle.id')[0];

  // Get CarePlan Resources and add data to worksheet
  const carePlanResources = getBundleResourcesByType(
      bundle,
      'CarePlan',
      {},
      false,
  );
  carePlanResources.forEach((resource) => {
    const extensionData = getCarePlanDataFromExtensions(resource, bundleId);

    extensionData.forEach((d) => {
      const newRow = {
        ...trialData,
        ...d,
      };
      const newRowValues = worksheet.columns.map((col) => newRow[col.key]);
      let duplicate = false;
      for (let i = 1; i < worksheet.rowCount+1; i++) {
        if (_.isEqual(newRowValues, worksheet.getRow(i).values.splice(1))) {
          duplicate = true;
          break;
        }
      }
      if (!duplicate) worksheet.addRow(newRow);
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
  const databaseConfig = await getDatabaseConfiguration('Lambda-RDS-Login');
  return knex(databaseConfig);
};

const getData = async (dbConnection, siteId) => {
  let data;
  if (siteId) {
    data = await dbConnection('data.messages').where('site_id', siteId);
  } else {
    data = await dbConnection('data.messages').select('*');
  }
  console.log(`Collected data for ${data.length} bundles.`);
  return data;
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

exports.handler = async (event) => {
  const dbConnection = await connectToDB();
  const workbook = createIcareWorkbook();
  const stream = new Stream.PassThrough();
  const response = await getData(dbConnection, event.siteId)
      .then(async (data) => {
        processData(data, workbook);

        return await workbook.xlsx
            .write(stream)
            .then(async () => {
              const s3Password = await getSecret('S3-Zip-Password');
              const archive = encryptZip(stream, s3Password.password);
              const bucketName = process.env.S3_BUCKET || 'icaredata-dev-extracted-data';
              await saveToS3(archive, bucketName);
              return JSON.stringify({
                status: '200',
                statusText: 'Data successfully extracted',
              });
            })
            .catch((e) => {
              console.log(e);
              return JSON.stringify({
                status: '500',
                statusText: 'Internal Server Error',
              });
            });
      })
      .catch((e) => {
        console.log(e);
        return JSON.stringify({
          status: '500',
          statusText: 'Internal Server Error',
        });
      });

  dbConnection.destroy();

  return response;
};
