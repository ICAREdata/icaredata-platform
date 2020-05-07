const conformanceStatement = {
  'resourceType': 'Conformance',
  'url': process.env.METADATA_URL || 'https://testing.icaredata.org/metadata',
  'version': '0.0.0',
  'experimental': true,
  'date': '2019-10-29',
  'kind': 'capability',
  'fhirVersion': '1.0.2',
  'acceptUnknown': 'no',
  'format': [
    'application/json+fhir',
  ],
};

exports.handler = async () => {
  return JSON.stringify(conformanceStatement);
};
