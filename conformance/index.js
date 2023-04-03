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
  rest: [
    {
      mode: 'server',
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
      operation: [
        {
          name: 'process-message',
          definition:
            'http://hl7.org/fhir/OperationDefinition/MessageHeader-process-message',
        },
      ],
    },
  ],
  messaging: [
    {
      endpoint: [
        {
          protocol: {
            system: 'http://terminology.hl7.org/CodeSystem/message-transport',
            code: 'http',
          },
          address:
            process.env.ENDPOINT_ADDRESS || 'https://testing.icaredata.org',
        },
      ],
    },
  ],
};

exports.handler = async () => {
  return capabilityStatement;
};
