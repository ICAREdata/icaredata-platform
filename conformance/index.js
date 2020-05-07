exports.handler = async () => {
  return {
    'resourceType': 'Conformance',
    'url': (process.env['CONFROMANCE_ENDPOINT'] || 'https://testing.icaredata.org/metadata'),
    'version': '0.0.0',
    'experimental': true,
    'date': '2019-10-29',
    'kind': 'capability',
    'fhirVersion': '4',
    'acceptUnknown': 'no',
    'format': [
      'application/json+fhir',
    ],
  };
};
