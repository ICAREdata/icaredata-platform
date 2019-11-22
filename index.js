const {local} = require('./utils/knexfile.js');
const responses = require('./utils/responses.js');
const knex = require('knex')(local);
const fhirpath = require('fhirpath');

exports.handler = async (event) => {
  // First, verify that this is a message
  const message = JSON.parse(event.body);

  const isMessage =
      (fhirpath.evaluate(message, 'Bundle.type')[0] === 'message');

  if (!isMessage) return responses.response400;


  // Collect the MessageHeader, Parameters, and Patient resources
  // from within the Message
  const messageHeader =
      getBundleResourcesByType(message, 'MessageHeader', {}, true);

  const parameters =
      getBundleResourcesByType(message, 'Parameters', {}, true);

  const patient =
      getBundleResourcesByType(message, 'Patient', {}, true);

  if (!(messageHeader && parameters && patient)) return responses.response400;


  // Collect all information that we want to store in the database
  // from the MessageHeader, Parameters, and Patient resources
  const bundleId = fhirpath.evaluate(message, 'Bundle.id')[0];

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
  const data = {
    site_id: clinicalTrialSite,
    trial_id: clinicalTrialId,
    mrn: medicalRecordNumber,
    capture_time: timestamp,
    bundle_id: bundleId,
    bundle: message,
  };


  // Finally, try to insert the data into the database
  return knex
      .insert([data])
      .into('messages')
      .then((r) => {
        // Set the appropriate positive response parameters and send
        const response200 = responses.response200;
        response200.body.entry[0].resource.response.identifier = bundleId;
        response200.body.entry[0].resource.timestamp = new Date().toISOString();
        response200.body = JSON.stringify(response200.body);
        return response200;
      })
      .catch((e) => {
        return responses.response500;
      });
};

// Utility function to get the resources of a type from our message bundle
// Optionally get only the first resource of that type via 'first' parameter
getBundleResourcesByType = (message, type, context = {}, first) => {
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
