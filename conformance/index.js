const capabilityStatement = {
  'resourceType': 'CapabilityStatement',
  'url': process.env.METADATA_URL || 'https://testing.icaredata.org/metadata',
  'version': '1.0.0',
  'status': 'draft',
  'experimental': true,
  'date': '2020-09-11',
  'kind': 'capability',
  'fhirVersion': '4.0.0',
  'format': [
    'application/json+fhir',
  ],
};

exports.handler = async () => {
  return capabilityStatement;
};
