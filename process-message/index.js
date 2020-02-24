'use strict';

const {production} = require('../utils/knexfile.js');
const responses = require('../utils/responses.js');
const schema = require('../utils/fhir.schema.json');
const fhirpath = require('fhirpath');
const fs = require('fs');
const Ajv = require('ajv');

exports.handler = async (event) => {
  production.connection.ssl = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(__dirname + '/../utils/rds-ca-2019-root.pem'),
  };

  const knex = require('knex')(production);

  const ajv = new Ajv({logger: false});
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
  const valid = ajv.addSchema(schema, 'FHIR').validate('FHIR', event);
  // TODO: Return an error if message is invalid, once we have valid
  // FHIR R4 messages to use for testing
  // if (!valid) {
  //   return responses.response400(
  //       'Request body is not a valid FHIR R4 Bundle.',
  //   );
  // }
  console.log(`Validity of Bundle against FHIR R4: ${valid}.`);

  const isMessage =
    (fhirpath.evaluate(event, 'Bundle.type')[0] === 'message');
  if (!isMessage) {
    return responses.response400(
        'FHIR Bundle is not a Message.',
    );
  }
  console.log('Verified Bundle is a Message.');

  const messageHeader =
    getBundleResourcesByType(event, 'MessageHeader', {}, true);
  const parameters =
    getBundleResourcesByType(event, 'Parameters', {}, true);
  const patient =
    getBundleResourcesByType(event, 'Patient', {}, true);
  if (!(messageHeader && parameters && patient)) {
    return responses.response400(
        'Message does not have all required resources.',
    );
  }
  console.log('Collected MessageHeader, Parameters, and Patient.');

  // Collect all information that we want to store in the database
  // from the MessageHeader, Parameters, and Patient resources
  const bundleId = fhirpath.evaluate(event, 'Bundle.id')[0];
  // TODO: Might want some sort of timestamp field from the Bundle eventually
  const timestamp = fhirpath.evaluate(
      messageHeader,
      'MessageHeader.timestamp',
  )[0];
  const clinicalTrialSite = fhirpath.evaluate(
      parameters,
      'Parameters.parameter.where(name = \'clinicalTrialSite\').valueString',
  )[0];
  const clinicalTrialId = fhirpath.evaluate(
      parameters,
      'Parameters.parameter.where(name = \'clinicalTrialId\').valueString',
  )[0];
  const medicalRecordNumber = fhirpath.evaluate(
      patient,
      'Patient.identifier.where(type.coding.code=\'MR\').value',
  )[0];
  const hasInfo = (bundleId && timestamp && clinicalTrialSite &&
    clinicalTrialId && medicalRecordNumber);
  if (!hasInfo) {
    return responses.response400(
        'Message resources do not contain all required data.',
    );
  };
  console.log('Collected relevant data from Message resources.');

  // Now that we've collected the data, format it so we can put in the database
  const info = {
    site_id: clinicalTrialSite,
    trial_id: clinicalTrialId,
    mrn: medicalRecordNumber,
    capture_time: timestamp,
    bundle_id: bundleId,
    bundle: event,
  };

  console.log('Inserting Message data into the database.');
  // Finally, try to insert the data into the database
  const response = await knex
      .insert([info])
      .into('messages')
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
  return response;
};

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
