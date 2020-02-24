# Local Dev Setup

## Install Dependencies

[localstack](https://github.com/localstack/localstack)

Terraform (e.g. `brew install terraform`). I wouldn't recommend installing through binaries like their website recommends. Use a package manager if possible.

[Docker](https://docs.docker.com/v17.09/docker-for-mac/install/)

[Docker Compose](https://docs.docker.com/compose/install/)

[node/npm/npx e.g. through nvm](https://github.com/nvm-sh/nvm)

## Set up ORY Hydra and the Postgres server

Pull a docker image of hydra

```bash
docker pull oryd/hydra:v1.0.8
```

Set up the services and network
```bash
docker-compose up -d # -d starts the services in the background
```

Check if the hydra server is running

```bash
docker logs ory-hydra
```

## Postgres Client

Installing a postgres client is really only necessary in order to view and interact with the database directly. You can use any client you prefer, e.g. [pgAdmin](https://www.pgadmin.org/download/).

If you do choose to use pgAdmin, once open, right click on servers and choose to create a server. Name the server (e.g. ICAREdata Local). In the connection tab, fill in localhost for the host and docker for the password. Connect to this server.

## Start up the local AWS services

Run `npm install`.

You should have SAM installed from previous steps. Run

```bash
sam local start-api --parameter-overrides 'ParameterKey=DbUser,ParameterValue=postgres ParameterKey=DbPwd,ParameterValue=docker'
```

You should be able to send a post request to http://127.0.0.1:3000/DSTU2/$process-message with a properly formatted FHIR Message in the body. An example of such a FHIR Message Bundle is included in `test/fixtures/messaging/message.json`. This will insert the Message and its associated information into the database.

## Run the Test Suite

In order to run the FHIR Messaging tests successfully, you must set environment variables in your system for `DbUser` and `DbPwd` correctly configured to your username and password for the database (in our local setup, these are just the values above, postgres and docker respectively).

```bash
npm test
```

# Deploying to AWS

Note your access key and secret for your user on your AWS account. See [here](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html) for more information.

[Install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-macOS.html).

```bash
aws configure
# Fill in your access key and secret
# AWS Access Key ID [None]: ********************
# AWS Secret Access Key [None]: ********************
# Default region name [None]: us-east-2
# Default output format [None]: json
```