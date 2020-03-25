
# Local Dev Setup

The `icaredata-platform` repository contains the code for the AWS Lambda functions for the

ICAREdata infrastructure.

## Install Dependencies  

The following instructions assume a MacOS development setup.

Install the [Homebrew](https://brew.sh/) package manager.

Use Homebrew in the command line to install `node` and `yarn`.

```bash
brew install node
brew install yarn
```

After installing these, `yarn` can be used to install all required dependencies for the code in this repository.

```bash
yarn install
```

Finally, install Terraform, an automated build and deployment tool for AWS resources.

`brew install terraform`

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