const conformanceStatement = {
  'resourceType': 'Conformance',
  'url': process.env.METADATA_URL || 'https://testing.icaredata.org/metadata',
  'version': '0.0.0',
  'experimental': true,
  'date': '2019-10-29',
  'kind': 'capability',
  'fhirVersion': '4.0.0',
  'acceptUnknown': 'no',
  'format': [
    'application/json+fhir',
  ],
};

exports.handler = async () => {
  return conformanceStatement;
};
