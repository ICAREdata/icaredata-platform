module.exports = {
  response200: {
    statusCode: 200,
    body: { // Need to JSON.stringify later after we mutate it
      resourceType: 'Bundle',
      id: 'ok',
      type: 'message',
      entry: [
        {
          resource: {
            resourceType: 'MessageHeader',
            event: {
              system: 'urn:ICAREdataStudy',
              code: 'ICAREdataReport',
              display: 'ICAREdata report',
            },
            response: {
              code: 'ok',
            },
          },
        },
      ],
    },
  },
  response400: {
    statusCode: 400,
    body: JSON.stringify({
      resourceType: 'OperationOutcome',
      id: 'error',
      text: {
        status: 'additional',
        div: '<div>\n      <p>Error processing FHIR Message</p>\n    </div>',
      },
      issue: [
        {
          severity: 'error',
          code: 'exception',
          details: {
            text: 'Error processing FHIR Message',
          },
        },
      ],
    }),
  },
  response500: {
    statusCode: 500,
    body: JSON.stringify({
      resourceType: 'OperationOutcome',
      id: 'fatal',
      text: {
        status: 'additional',
        div: '<div>\n      <p>Internal Server Error</p>\n    </div>',
      },
      issue: [
        {
          severity: 'fatal',
          code: 'exception',
          details: {
            text: 'Internal Server Error',
          },
        },
      ],
    }),
  },
};
