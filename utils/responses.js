module.exports = {
  response200: {
    statusCode: 200,
    body: {
      resourceType: 'OperationOutcome',
      id: 'allok',
      text: {
        status: 'additional',
        div: '<div>\n      <p>All OK</p>\n    </div>',
      },
      issue: [
        {
          severity: 'information',
          code: 'informational',
          details: {
            text: 'All Ok',
          },
        },
      ],
    },
  },
  response400: {
    statusCode: 400,
    body: {
      resourceType: 'OperationOutcome',
      id: 'exception',
      text: {
        status: 'additional',
        div: '<div>\n      <p>Error uploading to database</p>\n    </div>',
      },
      issue: [
        {
          severity: 'error',
          code: 'exception',
          details: {
            text: 'Error uploading to database',
          },
        },
      ],
    },
  },
};
