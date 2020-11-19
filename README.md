# Local Dev Setup

The `icaredata-platform` repository contains the code for the AWS Lambda functions for the ICAREdata infrastructure.
## Install Dependencies  

Use `npm` to install dependencies.

```bash
npm install
```

## Run the Test Suite

*NOTE* The test suite as currently implemented is outdated. There will be an updated test suite providing unit tests for the individual Lambda functions in the near future.

To run the test suite for this repository, run the following command.

```bash
npm test
```

## Deploying to AWS

Currently, the Terraform scripts are not configured for automatic deployment. The Lambda functions are manually deployed through the AWS console instead, by uploading a `.zip` file.

In order to build the relevant .zip files to deploy the Lambda functions, the following commands are provided:

Command | Effect
--- | ---
`npm run build-all` | Builds all Lambdas to a .zip file in the `terraform/build` directory.
`npm run build-authorizer` | Builds Keycloak Authorizer Lambda to a .zip file in the `terraform/build` directory.
`npm run build-bulkdata` | Builds SMART Configuration Lambda to a .zip file in the `terraform/build` directory.
`npm run build-conformance` | Builds Conformance Lambda to a .zip file in the `terraform/build` directory.
`npm run build-extraction` | Builds Data Extraction Lambda to a .zip file in the `terraform/build` directory.
`npm run build-message` | Builds Process Message Lambda to a .zip file in the `terraform/build` directory.
`npm run build-proxy` | Builds Keycloak Proxy Lambda to a .zip file in the `terraform/build` directory.

## Setting Environment Variables

The environment variables in each Lambda will need to be set based on the environment that the Lambdas are deployed in. The values for these
environment variables can be set directly in the "Environment Variables" section of the AWS Lambda console.

Details for the values of each environment variable for each Lambda are broken down below.

### Conformance Lambda

Command | Effect
--- | ---
METADATA_URL | The endpoint at which the FHIR Conformance statement is provided.

### SMART Configuration Lambda

Command | Effect
--- | ---
TOKEN_ENDPOINT | The token endpoint for the OAuth server, at which a client can obtain an access token.

### Keycloak Authorizer Lambda

Command | Effect
--- | ---
CA_FILE | A CA file to use for SSL connection through the authorization process if NODE_TLS_REJECT_UNAUTHORIZED is not '0'.
FORWARDED_HOST | The host URL for the infrastructure to use as the 'X-Forwarded-Host' header for the authorization request.
NODE_TLS_REJECT_UNAUTHORIZED | A Node environment variable to set to disable strict SSL if set to '0'.
OAUTH_SERVER_HOST | The host URL for the OAuth server used for authorization.
OAUTH_SERVER_PATH | The path following the host URL for the OAuth server used for authorization.
OAUTH_SERVER_PORT | The port to connect to the OAuth server at its endpoint.
REGION | The AWS region in which the infrastructure is located. Used in `utils/getSecret.js`.

### Keycloak Proxy Lambda

Command | Effect
--- | ---
CA_FILE | A CA file to use for SSL connection through the authorization process if NODE_TLS_REJECT_UNAUTHORIZED is not '0'.
FORWARDED_HOST | The host URL for the infrastructure to use as the 'X-Forwarded-Host' header for the authorization request.
NODE_TLS_REJECT_UNAUTHORIZED | A Node environment variable to set to disable strict SSL if set to '0'.
OAUTH_SERVER_HOST | The host URL for the OAuth server used for authorization.
OAUTH_SERVER_PATH | The path following the host URL for the OAuth server used for authorization.
OAUTH_SERVER_PORT | The port to connect to the OAuth server at its endpoint.

### Process Message Lambda

Command | Effect
--- | ---
CA_FILE_NAME | The file name of the CA file to use for SSL connection to the RDS resource in AWS. Used in `utils/databaseUtils.js`.
DATABASE_HOST | The host URL for the RDS resource in AWS. Used in `utils/databaseUtils.js`.
DATABASE_NAME | The name of the database in the RDS resource to connect to. Used in `utils/databaseUtils.js`.
DATABASE_PORT | The port to connect to the RDS resource in AWS. Used in `utils/databaseUtils.js`.
REGION | The AWS region in which the infrastructure is located. Used in `utils/getSecret.js`.

### Data Extraction Lambda

Command | Effect
--- | ---
CA_FILE_NAME | The file name of the CA file to use for SSL connection to the RDS resource in AWS. Used in `utils/databaseUtils.js`.
DATABASE_HOST | The host URL for the RDS resource in AWS. Used in `utils/databaseUtils.js`.
DATABASE_NAME | The name of the database in the RDS resource to connect to. Used in `utils/databaseUtils.js`.
DATABASE_PORT | The port to connect to the RDS resource in AWS. Used in `utils/databaseUtils.js`.
REGION | The AWS region in which the infrastructure is located. Used in `utils/getSecret.js`.
S3_BUCKET | The name of the AWS S3 bucket in which to place the extracted data.

# License

Copyright 2019, 2020 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
