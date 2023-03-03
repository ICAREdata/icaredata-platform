const { getDatabaseConfiguration } = require('../utils/databaseUtils');
const responses = require('../utils/submissionResponses.js');
const { getBundleResourcesByType } = require('../utils/fhirUtils');
const schema = require('../utils/fhir.schema.json');
const fhirpath = require('fhirpath');
const Ajv = require('ajv');
const knex = require('knex');

const ajv = new Ajv({ logger: false });
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
const validator = ajv.addSchema(schema, 'FHIR');

const isValidFHIRBundle = (bundle) => validator.validate('FHIR', bundle);
const isMessageBundle = (bundle) =>
  fhirpath.evaluate(bundle, 'Bundle.type')[0] === 'message';

const getBundleId = (bundle) => fhirpath.evaluate(bundle, 'Bundle.id')[0];
const getSubjectId = (subject) =>
  fhirpath.evaluate(subject, 'ResearchSubject.identifier.first().value')[0];
const getSiteId = (messageHeader) =>
  fhirpath.evaluate(messageHeader, 'MessageHeader.sender.identifier.value')[0];
const getTrialId = (study) =>
  fhirpath.evaluate(study, 'ResearchStudy.identifier.first().value')[0];
// Responses are stringified JSON objs; have to parse first
const getResponseCode = (response) =>
  fhirpath.evaluate(
    JSON.parse(response),
    'Bundle.entry[0].resource.response.code'
  )[0];
// Get a list of all resourceTypes in the ContainedBundle
const getResourceTypesInBundle = (containedBundle) =>
  fhirpath.evaluate(
    containedBundle,
    'Bundle.entry.resource.resourceType.distinct()'
  );
// For a given resourceType, determine how many of those resources are on a ContainedBundle
const getResourceCount = (containedBundle, resourceType) =>
  fhirpath.evaluate(
    containedBundle,
    `Bundle.entry.resource.where(resourceType = '${resourceType}').count()`
  );

exports.handler = async (bundle, context, callback) => {
  const databaseConfig = await getDatabaseConfiguration('Lambda-RDS-Login');
  const dbConnection = knex(databaseConfig);

  // Get message header and Site Id early on for logging purposes;
  // Will use these variables later for validating the shape of the uploaded bundle
  const messageHeader = getBundleResourcesByType(
    bundle,
    'MessageHeader',
    {},
    true
  );
  let siteId = getSiteId(messageHeader);
  if (!siteId) {
    console.log(
      `Log messages may look strange; no site-id was found on bundle's Message Header`
    );
    siteId = 'NO-SITE-ID-PROVIDED';
  }

  // Since bundleId is needed for the response error, we'll check that first
  const bundleId = getBundleId(bundle);
  if (!bundleId) {
    callback(
      responses.response400(
        'no-id-found',
        'Request body does not contain a valid Bundle ID.'
      )
    );
    return;
  }

  if (!isValidFHIRBundle(bundle)) {
    callback(
      responses.response400(
        bundleId,
        'Request body is not a valid FHIR R4 Bundle.'
      )
    );
    return;
  }
  console.log(`${siteId}: Bundle ${bundleId} is valid FHIR R4.`);

  if (!isMessageBundle(bundle)) {
    callback(responses.response400(bundleId, 'FHIR Bundle is not a Message.'));
    return;
  }
  console.log(`${siteId}: Verified Bundle ${bundleId} is a Message.`);

  //
  if (!messageHeader) {
    callback(
      responses.response400(bundleId, 'Message does not contain MessageHeader.')
    );
    return;
  }

  const containedBundle = getBundleResourcesByType(bundle, 'Bundle', {}, true);
  if (!containedBundle) {
    callback(
      responses.response400(bundleId, 'Message does not contain Bundle.')
    );
    return;
  }
  console.log(`${siteId}: Collected MessageHeader and Bundle.`);

  const researchSubject = getBundleResourcesByType(
    containedBundle,
    'ResearchSubject',
    {},
    true
  );
  if (!researchSubject) {
    callback(
      responses.response400(
        bundleId,
        'ContainedBundle does not contain ResearchSubject.'
      )
    );
    return;
  }
  const researchStudy = getBundleResourcesByType(
    containedBundle,
    'ResearchStudy',
    {},
    true
  );
  if (!researchStudy) {
    callback(
      responses.response400(
        bundleId,
        'ContainedBundle does not contain ResearchStudy.'
      )
    );
    return;
  }
  console.log(`${siteId}: Collected ResearchSubject and ResearchStudy.`);

  // Collect all information that we want to store in the database
  // from the resources - bundleId was collected earlier
  const subjectId = getSubjectId(researchSubject);
  const trialId = getTrialId(researchStudy);
  const hasInfo = bundleId && subjectId && trialId; // siteId not required
  if (!hasInfo) {
    callback(
      responses.response400(
        bundleId,
        'Message resources do not contain all required data.'
      )
    );
    return;
  }
  console.log(`${siteId}: Collected relevant data from Message resources.`);

  // Now that we've collected the data, format it so we can put in the database
  const info = {
    bundle_id: bundleId,
    subject_id: subjectId,
    site_id: siteId,
    trial_id: trialId,
    bundle: bundle,
  };

  // Get some metadata about the bundle for logging
  const resourceTypes = getResourceTypesInBundle(containedBundle);
  console.log(
    `${siteId}: Message's contained bundle contains the following resources`
  );
  resourceTypes.forEach((resourceType) => {
    console.log(
      `${siteId}: ${resourceType} | ${getResourceCount(
        containedBundle,
        resourceType
      )}`
    );
  });

  console.log(`${siteId}: Inserting Message data into the database.`);
  // Finally, try to insert the data into the database
  const response = await dbConnection
    .insert([info])
    .into('data.messages')
    .then((r) => {
      console.log(`${siteId}: Data successfully inserted into database.`);
      return responses.response200(bundleId);
    })
    .catch((e) => {
      console.log(
        `${siteId}: Error occurred while inserting data into the database`
      );
      console.log(e);
      // The below link describes error codes for PostgreSQL
      // https://www.postgresql.org/docs/9.6/errcodes-appendix.html

      if (e.code.startsWith('23')) {
        // Throw a 400 error for any integrity constraint violation (Class 23)
        const violationMap = {
          23000: 'Integrity Constraint Violation',
          23001: 'Restrict Violation',
          23502: 'Not Null Violation',
          23503: 'Foreign Key Violation',
          23505: 'Unique Violation',
          23514: 'Check Violation',
          '23P01': 'Exclusion Violation',
        };
        const violation =
          violationMap[e.code] || 'Integrity Constraint Violation';
        return responses.response400(bundleId, violation);
      } else {
        // Throw a 500 Internal Server Error for any other error
        return responses.response500(bundleId);
      }
    });
  dbConnection.destroy();

  if (getResponseCode(response) === 'ok') {
    callback(null, response);
  }
  callback(response);
};
