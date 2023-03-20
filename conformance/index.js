const capabilityStatement = {
  resourceType: 'CapabilityStatement',
  url: process.env.METADATA_URL || 'https://testing.icaredata.org/metadata',
  version: '1.0.0',
  status: 'active',
  experimental: true,
  date: '2020-09-14',
  kind: 'capability',
  fhirVersion: '4.0.1',
  format: ['application/json+fhir'],
  security: {
    service: [
      {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/restful-security-service',
            code: 'SMART-on-FHIR',
          },
        ],
      },
    ],
  },
  messaging: [
    {
      endpoint: [
        {
          protocol: {
            system: 'http://terminology.hl7.org/CodeSystem/message-transport',
            code: 'http',
          },
          address: 'https://testing.icaredata.org',
        },
      ],
    },
  ],
};

exports.handler = async () => {
  return capabilityStatement;
};
