const { getSecret } = require('../utils/getSecret.js');
const { saveToS3 } = require('../utils/saveToS3.js');
const { getDatabaseConfiguration } = require('../utils/databaseUtils');
const {
  getBundleResourcesByType,
  getExtensionsByUrl,
  doResourceAndReferenceIdsMatch,
} = require('../utils/fhirUtils');
const { getCancerType } = require('../utils/conditionUtils');
const _ = require('lodash');
const exceljs = require('exceljs');
const Stream = require('stream');
const archiver = require('archiver');
const knex = require('knex');
const fhirpath = require('fhirpath');
archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));

// Delimiter for joining array values
const ARRAYJOINDELIMITER = ' | ';

// Creates excel workbook with Disease Status and Treatment Plan Change Worksheets
const createIcareWorkbook = () => {
  const workbook = new exceljs.Workbook();
  workbook.creator = 'icaredata';
  workbook.created = workbook.modified = new Date();

  // Create separate worksheets
  const diseaseStatusWorksheet = workbook.addWorksheet('Disease Status');
  diseaseStatusWorksheet.columns = [
    { header: 'Submission Date', key: 'submissionDate', width: 30 },
    { header: 'Bundle ID', key: 'bundleId', width: 30 },
    { header: 'Effective Date', key: 'effectiveDate', width: 30 },
    { header: 'Code Value', key: 'codeValue', width: 30 },
    { header: 'Cancer Type', key: 'cancerType', width: 30 },
    { header: 'Cancer Code Value', key: 'cancerCodeValue', width: 30 },
    { header: 'Evidence', key: 'evidence', width: 30 },
    { header: 'Subject ID', key: 'subjectId', width: 30 },
    { header: 'Trial ID', key: 'trialId', width: 30 },
    { header: 'Site ID', key: 'siteId', width: 30 },
  ];

  const treatmentPlanChangeWorksheet = workbook.addWorksheet(
    'Treatment Plan Change'
  );
  treatmentPlanChangeWorksheet.columns = [
    { header: 'Submission Date', key: 'submissionDate', width: 30 },
    { header: 'Bundle ID', key: 'bundleId', width: 30 },
    { header: 'Effective Date', key: 'effectiveDate', width: 30 },
    { header: 'Changed Flag', key: 'changedFlag', width: 30 },
    { header: 'Code Value', key: 'codeValue', width: 30 },
    { header: 'Subject ID', key: 'subjectId', width: 30 },
    { header: 'Trial ID', key: 'trialId', width: 30 },
    { header: 'Site ID', key: 'siteId', width: 30 },
  ];

  const adverseEventWorksheet = workbook.addWorksheet('Adverse Event');
  adverseEventWorksheet.columns = [
    { header: 'Submission Date', key: 'submissionDate', width: 30 },
    { header: 'Bundle ID', key: 'bundleId', width: 30 },
    { header: 'Adverse Event Grade', key: 'adverseEventGrade', width: 30 },
    { header: 'Adverse Event Code', key: 'adverseEventCode', width: 30 },
    { header: 'Suspected Cause', key: 'suspectedCause', width: 30 },
    {
      header: 'Suspected Cause Assessments',
      key: 'suspectedCauseAssessments',
      width: 30,
    },
    { header: 'Seriousness Code', key: 'seriousnessCode', width: 30 },
    { header: 'Category Code', key: 'categoryCode', width: 30 },
    { header: 'Actuality', key: 'actuality', width: 30 },
    { header: 'Effective Date', key: 'effectiveDate', width: 30 },
    { header: 'Recorded Date', key: 'recordedDate', width: 30 },
    { header: 'Outcome Code', key: 'outcomeCode', width: 30 },
    { header: 'Seriousness Outcome', key: 'seriousnessOutcome', width: 30 },
    { header: 'Resolved Date', key: 'resolvedDate', width: 30 },
    { header: 'Subject ID', key: 'subjectId', width: 30 },
    { header: 'Trial ID', key: 'trialId', width: 30 },
    { header: 'Site ID', key: 'siteId', width: 30 },
  ];

  return workbook;
};

// Translates `codeObject` into a format(codeSystem : code) to be input into spreadsheet
// If there are multiple codes, will join them and delimit with |
const translateCode = (codeObject) => {
  return codeObject && codeObject.coding
    ? codeObject.coding
        .filter((c) => c)
        .map((c) => `${c.system} : ${c.code}`)
        .join(ARRAYJOINDELIMITER)
    : '';
};

const formatSuspectedCauseData = (suspectEntityList) => {
  // SuspectedEntities have two subcomponents of interest: instances and causality
  const suspectedCauses = suspectEntityList
    ? suspectEntityList
        .map((entity) => {
          return (
            entity.instance &&
            `${entity.instance.type} : ${entity.instance.reference}`
          );
        })
        .join(ARRAYJOINDELIMITER)
    : '';
  const suspectedAssessments = suspectEntityList
    ? suspectEntityList
        .map((entity) => {
          return entity.assessment && translateCode(entity.assessment);
        })
        .join(ARRAYJOINDELIMITER)
    : '';
  return [suspectedCauses, suspectedAssessments];
};

// Filters Observation list for system and code specific to disease status
const getDiseaseStatusResources = (bundle) => {
  return getBundleResourcesByType(bundle, 'Observation', {}, false).filter(
    (r) =>
      r.code &&
      r.code.coding
        .filter((c) => c)
        // Observations must contain a LOINC coding with STU1 (88040-1) or STU2 (97509-4) CDS code
        .some((c) => {
          return (
            c.system === 'http://loinc.org' &&
            (c.code === '97509-4' || c.code === '88040-1')
          );
        })
  );
};

// Retrieves condition resource by looking at ids and identifiers on focus reference
const getConditionFromFocusReference = (bundle, focuses) => {
  if (!(focuses && focuses.length > 0)) return;
  const references = focuses.map((f) => f.reference).filter((f) => f);
  return getBundleResourcesByType(bundle, 'Condition', {}, false).find(
    (resource) =>
      references.some((reference) =>
        doResourceAndReferenceIdsMatch(resource, reference)
      )
  );
};

// Add Disease Status Resource to worksheet
const addDiseaseStatusDataToWorksheet = (bundle, worksheet, trialData) => {
  const bundleId = fhirpath.evaluate(bundle, 'Bundle.id')[0];

  const dsResources = getDiseaseStatusResources(bundle);
  console.log(
    `${dsResources.length} Cancer Disese Status Resources found on Bundle ${bundleId}.`
  );
  dsResources.forEach((resource) => {
    const evidenceExtensions = getExtensionsByUrl(
      fhirpath.evaluate(resource, 'Observation.extension'),
      'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-evidence-type'
    );

    if (evidenceExtensions.length === 0) {
      console.log(`No evidence extensions were found on Bundle ${bundleId}.`);
    }

    // Joins the array of evidence items
    const evidence = evidenceExtensions
      .map((extension) => {
        return translateCode(extension.valueCodeableConcept);
      })
      .filter((evidence) => evidence)
      .join(ARRAYJOINDELIMITER);

    const condition = getConditionFromFocusReference(
      bundle,
      fhirpath.evaluate(resource, 'Observation.focus')
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
      codeValue:
        resource.valueCodeableConcept &&
        resource.valueCodeableConcept.extension &&
        resource.valueCodeableConcept.extension.some(
          (e) => e.valueCode === 'not-asked'
        )
          ? 'not-asked'
          : translateCode(resource.valueCodeableConcept),
    };
    const newRowValues = worksheet.columns.map((col) => newRow[col.key]);
    let duplicate = false;
    for (let i = 1; i < worksheet.rowCount + 1; i++) {
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
  const reviewExtensionUrl =
    'http://mcodeinitiative.org/codex/us/icare/StructureDefinition/icare-care-plan-review';
  const reviewExtensions = fhirpath.evaluate(
    carePlanResource,
    `CarePlan.extension.where(url='${reviewExtensionUrl}')`
  );

  return reviewExtensions.map((e) => {
    const reviewExtension = e.extension;
    const reviewDate = getExtensionsByUrl(reviewExtension, 'ReviewDate', true);
    const effectiveDate = reviewDate ? reviewDate.valueDate : '';
    const carePlanChangeReason = getExtensionsByUrl(
      reviewExtension,
      'CarePlanChangeReason',
      true
    );
    const changedFlag = getExtensionsByUrl(
      reviewExtension,
      'ChangedFlag',
      true
    );
    const codeValue =
      changedFlag.valueBoolean && carePlanChangeReason
        ? translateCode(carePlanChangeReason.valueCodeableConcept)
        : '';

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
      changedFlag:
        changedFlag.valueBoolean != null ? `${changedFlag.valueBoolean}` : '',
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
    false
  );
  console.log(
    `${carePlanResources.length} CarePlan Resources found on Bundle ${bundleId}.`
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
      for (let i = 1; i < worksheet.rowCount + 1; i++) {
        if (_.isEqual(newRowValues, worksheet.getRow(i).values.splice(1))) {
          duplicate = true;
          break;
        }
      }
      if (!duplicate) worksheet.addRow(newRow);
    });
  });
};

const getAdverseEventDataFromExtensions = (adverseEventResource, bundleId) => {
  const adverseEventResourceExtension = adverseEventResource.extension;
  const gradeUrl =
    'http://hl7.org/fhir/us/ctcae/StructureDefinition/ctcae-grade';
  const resolvedDateUrl =
    'http://hl7.org/fhir/us/ctcae/StructureDefinition/adverse-event-resolved-date';
  const seriousnessOutcomeUrl =
    'http://hl7.org/fhir/us/ctcae/StructureDefinition/adverse-event-seriousness-outcome';
  const grade = getExtensionsByUrl(
    adverseEventResourceExtension,
    gradeUrl,
    true
  );
  const resolvedDate = getExtensionsByUrl(
    adverseEventResourceExtension,
    resolvedDateUrl,
    true
  );
  const seriousnessOutcome = getExtensionsByUrl(
    adverseEventResourceExtension,
    seriousnessOutcomeUrl,
    true
  );
  if (!grade) {
    console.log(`No grade extension was found on Bundle ${bundleId}`);
  }
  if (!resolvedDate) {
    console.log(`No resolvedDate extension was found on Bundle ${bundleId}`);
  }
  if (!seriousnessOutcome) {
    console.log(
      `No seriousnessOutcome extension was found on Bundle ${bundleId}`
    );
  }
  return {
    grade: grade && translateCode(grade.value),
    resolvedDate: resolvedDate && translateCode(resolvedDate.valueDateTime),
    seriousnessOutcome:
      seriousnessOutcome && translateCode(seriousnessOutcome.value),
  };
};

// Add AdverseEvent resources to worksheet
const addAdverseEventDataToWorksheet = (bundle, worksheet, trialData) => {
  const bundleId = fhirpath.evaluate(bundle, 'Bundle.id')[0];

  // Get AdverseEvent Resources and add data to worksheet
  const adverseEventResources = getBundleResourcesByType(
    bundle,
    'AdverseEvent',
    {},
    false
  );

  console.log(
    `${adverseEventResources.length} AdverseEvent Resources found on Bundle ${bundleId}.`
  );

  adverseEventResources.forEach((resource) => {
    // All data from extensions
    const { grade, resolvedDate, seriousnessOutcome } =
      getAdverseEventDataFromExtensions(resource, bundleId);

    // AdverseEvent data is a CodeableConcept
    const adverseEventCode = translateCode(resource.event);
    if (!adverseEventCode) {
      console.log('No code found on this Adverse Event Resource ');
    }
    // Suspected cause data
    const [suspectedCause, suspectedCauseAssessments] =
      formatSuspectedCauseData(resource.suspectEntity);
    if (!suspectedCause) {
      console.log(
        'No suspected entity data found on this Adverse Event Resource '
      );
    }
    if (!suspectedCauseAssessments) {
      console.log(
        'No suspected entity assessment data found on this Adverse Event Resource '
      );
    }
    // Seriousness data is a CodeableConcept
    const seriousnessCode = translateCode(resource.seriousness);
    if (!seriousnessCode) {
      console.log('No seriousness data found on this Adverse Event Resource ');
    }
    // Category data is an array of CodeableConcepts
    const categoryCode =
      resource.category &&
      resource.category.length &&
      resource.category.map(translateCode).join(ARRAYJOINDELIMITER);
    if (!categoryCode || categoryCode.length === 0) {
      console.log('No category data found on this Adverse Event Resource ');
    }
    // Outcome is a CodeableConcept
    const outcomeCode = translateCode(resource.outcome);
    if (!outcomeCode) {
      console.log('No seriousness data found on this Adverse Event Resource ');
    }

    // const trialData = { subjectId, trialId, siteId, submissionDate, bundleId };
    const newAdverseEventRow = {
      ...trialData,
      grade,
      adverseEventCode,
      suspectedCause,
      suspectedCauseAssessments,
      seriousnessCode,
      categoryCode,
      actuality: resource.actuality,
      outcomeCode,
      seriousnessOutcome,
      effectiveDate: resource.date,
      recordedDate: resource.recordedDate,
      resolvedDate: resolvedDate,
    };
    const newRowValues = worksheet.columns.map(
      (col) => newAdverseEventRow[col.key]
    );
    let duplicate = false;
    for (let i = 1; i < worksheet.rowCount + 1; i++) {
      if (_.isEqual(newRowValues, worksheet.getRow(i).values.slice(1))) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) worksheet.addRow(newAdverseEventRow);
  });
};

const addIcareDataToWorkbook = (bundle, workbook, trialData) => {
  const diseaseStatusWorksheet = workbook.getWorksheet('Disease Status');
  const treatmentPlanChangeWorksheet = workbook.getWorksheet(
    'Treatment Plan Change'
  );
  const adverseEventWorksheet = workbook.getWorksheet('Adverse Event');

  addDiseaseStatusDataToWorksheet(bundle, diseaseStatusWorksheet, trialData);
  addCarePlanDataToWorksheet(bundle, treatmentPlanChangeWorksheet, trialData);
  addAdverseEventDataToWorksheet(bundle, adverseEventWorksheet, trialData);
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
      submission_time: submissionDate,
      bundle_id: bundleId,
    } = d;

    const containedBundle = getBundleResourcesByType(
      bundle,
      'Bundle',
      {},
      true
    );

    const trialData = { subjectId, trialId, siteId, submissionDate, bundleId };
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
    zlib: { level: 8 },
    encryptionMethod: 'aes256',
  });

  archive.append(stream, { name: 'icare.xlsx' });
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
          const bucketName =
            process.env.S3_BUCKET || 'icaredata-dev-extracted-data';
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
