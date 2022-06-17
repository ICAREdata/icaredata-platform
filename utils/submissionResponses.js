const { v4 } = require('uuid');

module.exports = {
  response200: (originalMessageId) => {
    const bundleId = v4();
    const messageHeaderId = v4();
    const messageTimeStamp = new Date().toISOString();
    return JSON.stringify({
      resourceType: 'Bundle',
      id: bundleId,
      type: 'message',
      entry: [
        {
          fullUrl: `urn:uuid:${messageHeaderId}`,
          resource: {
            resourceType: 'MessageHeader',
            id: messageHeaderId,
            timestamp: messageTimeStamp,
            event: {
              system: 'urn:ICAREdataStudy',
              code: 'icare-data-submission',
            },
            response: {
              identifier: originalMessageId,
              code: 'ok',
            },
          },
        },
      ],
    });
  },
  response400: (originalMessageId, errorMessage) => {
    // Takes a message argument
    const bundleId = v4();
    const messageHeaderId = v4();
    const messageTimeStamp = new Date().toISOString();
    const operationOutcomeId = v4();
    return JSON.stringify({
      resourceType: 'Bundle',
      id: bundleId,
      type: 'message',
      entry: [
        {
          fullUrl: `urn:uuid:${messageHeaderId}`,
          resource: {
            resourceType: 'MessageHeader',
            id: messageHeaderId,
            timestamp: messageTimeStamp,
            event: {
              system: 'urn:ICAREdataStudy',
              code: 'icare-data-submission',
            },
            response: {
              identifier: originalMessageId,
              code: 'fatal-error',
              details: {
                reference: `OperationOutcome/${operationOutcomeId}`,
              },
            },
          },
        },
        {
          fullUrl: `urn:uuid:${operationOutcomeId}`,
          resource: {
            resourceType: 'OperationOutcome',
            id: `urn:uuid:${operationOutcomeId}`,
            issue: {
              severity: 'error',
              code: 'required',
              details: {
                text: errorMessage,
              },
            },
          },
        },
      ],
    });
  },
  response500: (originalMessageId) => {
    const bundleId = v4();
    const messageHeaderId = v4();
    const messageTimeStamp = new Date().toISOString();
    const operationOutcomeId = v4();
    return JSON.stringify({
      resourceType: 'Bundle',
      id: bundleId,
      type: 'message',
      entry: [
        {
          fullUrl: `urn:uuid:${messageHeaderId}`,
          resource: {
            resourceType: 'MessageHeader',
            id: messageHeaderId,
            timestamp: messageTimeStamp,
            event: {
              system: 'urn:ICAREdataStudy',
              code: 'icare-data-submission',
            },
            response: {
              identifier: originalMessageId,
              code: 'fatal-error',
              details: {
                reference: `OperationOutcome/${operationOutcomeId}`,
              },
            },
          },
        },
        {
          fullUrl: `urn:uuid:${operationOutcomeId}`,
          resource: {
            resourceType: 'OperationOutcome',
            id: `urn:uuid:${operationOutcomeId}`,
            issue: {
              severity: 'fatal',
              code: 'required',
              details: {
                text: 'Internal Server Error',
              },
            },
          },
        },
      ],
    });
  },
};
