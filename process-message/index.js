const {getSecret} = require('../utils/getSecret.js');
const {production} = require('../utils/knexfile.js');
const responses = require('../utils/responses.js');
const {getBundleResourcesByType} = require('../utils/fhirUtils');
const schema = require('../utils/fhir.schema.json');
const fhirpath = require('fhirpath');
const fs = require('fs');
const Ajv = require('ajv');

const ajv = new Ajv({logger: false});
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
const validator = ajv.addSchema(schema, 'FHIR');

const isValidFHIRBundle = (bundle) => validator.validate('FHIR', bundle);
const isMessageBundle = (bundle) => fhirpath.evaluate(bundle, 'Bundle.type')[0] === 'message';

// Utility function to get the resources of a type from our message bundle
// Optionally get only the first resource of that type via 'first' parameter
const getBundleResourcesByType = (message, type, context = {}, first) => {
  const resources = fhirpath.evaluate(
      message,
      `Bundle.entry.where(resource.resourceType='${type}').resource`,
      context,
  );

  if (resources.length > 0) {
    return first ? resources[0] : resources;
  } else {
    return first ? null : [];
  }
};

const getBundleId = (bundle) => fhirpath.evaluate(bundle, 'Bundle.id')[0];
const getSubjectId = (subject) => fhirpath.evaluate(subject, 'ResearchSubject.identifier.first().value')[0];
const getSiteId = (messageHeader) => fhirpath.evaluate(messageHeader, 'MessageHeader.source.endpoint')[0];
const getTrialId = (study) => fhirpath.evaluate(study, 'ResearchStudy.identifier.first().value')[0];

exports.handler = async (bundle, context, callback) => {
  const secret = await getSecret('Lambda-RDS-Login');
  production.connection.user = secret.username;
  production.connection.password = secret.password;
  production.connection.ssl = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(__dirname + '/../utils/rds-ca-2019-root.pem'),
  };

  const knex = require('knex')(production);

  if (!isValidFHIRBundle(bundle)) {
    callback(responses.response400(
        'Request body is not a valid FHIR R4 Bundle.',
    ));
    return;
  }
  console.log(`Bundle is valid FHIR R4.`);

  if (!isMessageBundle(bundle)) {
    callback(responses.response400(
        'FHIR Bundle is not a Message.',
    ));
    return;
  }
  console.log('Verified Bundle is a Message.');

  const messageHeader = getBundleResourcesByType(bundle, 'MessageHeader', {}, true);
  if (!messageHeader) {
    callback(responses.response400(
        'Message does not contain MessageHeader.',
    ));
    return;
  }

  const containedBundle = getBundleResourcesByType(bundle, 'Bundle', {}, true);
  if (!containedBundle) {
    callback(responses.response400(
        'Message does not contain Bundle.',
    ));
    return;
  }
  console.log('Collected MessageHeader and Bundle.');

  const researchSubject = getBundleResourcesByType(bundle, 'ResearchSubject', {}, true);
  if (!researchSubject) {
    callback(responses.response400(
        'Bundle does not contain ResearchSubject.',
    ));
    return;
  }
  const researchStudy = getBundleResourcesByType(bundle, 'ResearchStudy', {}, true);
  if (!researchStudy) {
    callback(responses.response400(
        'Bundle does not contain ResearchStudy.',
    ));
    return;
  }
  console.log('Collected ResearchSubject and ResearchStudy.');

  // Collect all information that we want to store in the database
  // from the resources
  const bundleId = getBundleId(bundle);
  const subjectId = getSubjectId(researchSubject);
  const siteId = getSiteId(messageHeader);
  const trialId = getTrialId(researchStudy);
  const hasInfo = (bundleId && subjectId && trialId); // siteId not required
  if (!hasInfo) {
    callback(responses.response400(
        'Message resources do not contain all required data.',
    ));
    return;
  };
  console.log('Collected relevant data from Message resources.');

  // Now that we've collected the data, format it so we can put in the database
  const info = {
    bundle_id: bundleId,
    subject_id: subjectId,
    site_id: siteId,
    trial_id: trialId,
    bundle: bundle,
  };

  console.log('Inserting Message data into the database.');
  // Finally, try to insert the data into the database
  const response = await knex
      .insert([info])
      .into('data.messages')
      .then((r) => {
        console.log('Data inserted into database.');
        return responses.response200;
      })
      .catch((e) => {
        console.log(e);
        // The below link describes error codes for PostgreSQL
        // https://www.postgresql.org/docs/9.6/errcodes-appendix.html

        if (e.code.startsWith('23')) {
          // Throw a 400 error for any integrity constraint violation (Class 23)
          const violationMap = {
            '23000': 'Integrity Constraint Violation',
            '23001': 'Restrict Violation',
            '23502': 'Not Null Violation',
            '23503': 'Foreign Key Violation',
            '23505': 'Unique Violation',
            '23514': 'Check Violation',
            '23P01': 'Exclusion Violation',
          };
          const violation =
            violationMap[e.code] || 'Integrity Constraint Violation';
          return responses.response400(violation);
        } else {
          // Throw a 500 Internal Server Error for any other error
          return responses.response500;
        }
      });
  knex.destroy();

  if (response === responses.response200) {
    return response;
  }
  callback(response);
};
