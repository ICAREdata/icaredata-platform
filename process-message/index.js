'use strict';

const {production} = require('../utils/knexfile.js');
const responses = require('../utils/responses.js');
const schema = require('../utils/fhir.schema.json');
const fhirpath = require('fhirpath');
const fs = require('fs');
const Ajv = require('ajv');
const cloneDeep = require('lodash/cloneDeep');

exports.handler = async (event) => {
  production.connection.ssl = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(__dirname + '/../utils/rds-ca-2019-root.pem'),
  };

  const knex = require('knex')(production);

  // First, verify that this is valid R4
  const ajv = new Ajv({logger: false});
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
  const valid = ajv.addSchema(schema, 'FHIR').validate('FHIR', event);

  // TODO: Return an error if message is invalid, once we have valid
  // FHIR R4 messages to use for testing
  console.log(`Valid: ${valid}`);

  // Next, verify that this is a message
  const isMessage =
    (fhirpath.evaluate(event, 'Bundle.type')[0] === 'message');

  if (!isMessage) return responses.response400;

  // Collect the MessageHeader, Parameters, and Patient resources
  // from within the Message
  const messageHeader =
    getBundleResourcesByType(event, 'MessageHeader', {}, true);

  const parameters =
    getBundleResourcesByType(event, 'Parameters', {}, true);

  const patient =
    getBundleResourcesByType(event, 'Patient', {}, true);

  if (!(messageHeader && parameters && patient)) return responses.response400;


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

  if (!hasInfo) return responses.response400;

  // Now that we've collected the data, format it so we can put in the database
  const info = {
    site_id: clinicalTrialSite,
    trial_id: clinicalTrialId,
    mrn: medicalRecordNumber,
    capture_time: timestamp,
    bundle_id: bundleId,
    bundle: event,
  };

  // Finally, try to insert the data into the database
  const response = await knex
      .insert([info])
      .into('messages')
      .then((r) => {
        // Set the appropriate positive response parameters and send
        const response200 = cloneDeep(responses.response200);
        response200.body.entry[0].resource.response.identifier = bundleId;
        response200.body.entry[0].resource.timestamp =
          new Date().toISOString();
        response200.body = JSON.stringify(response200.body);
        return response200;
      })
      .catch((e) => {
        console.log(e);
        return responses.response500;
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
