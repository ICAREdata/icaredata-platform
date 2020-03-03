module.exports = {
  response200: {
    statusCode: 200,
    body: JSON.stringify({
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
            source: {
              name: 'ICAREdata',
              endpoint: 'https://testing.icaredata.org/$process-message',
            },
          },
        },
      ],
    }),
  },
  response400: (errorMessage) => { // Takes a message argument
    return {
      statusCode: 400,
      body: JSON.stringify({
        resourceType: 'OperationOutcome',
        id: 'error',
        text: {
          status: 'additional',
          div: `<div>\n      <p>${errorMessage}</p>\n    </div>`,
        },
        issue: [
          {
            severity: 'error',
            code: 'exception',
            details: {
              text: errorMessage,
            },
          },
        ],
      }),
    };
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
