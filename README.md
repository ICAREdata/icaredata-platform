# Local Dev Setup

## Install SAM, Docker, Docker Compose, and Node

[source](https://hackernoon.com/dont-install-postgres-docker-pull-postgres-bee20e200198)

[Install SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-mac.html). In the process, you will install docker as well.

[Install Docker Compose](https://docs.docker.com/compose/install/)

[Install node/npm/npx through nvm](https://github.com/nvm-sh/nvm)

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

## Run the Test Client

In order to run the FHIR Messaging tests successfully, you must set environment variables in your system for `DbUser` and `DbPwd` correctly configured to your username and password for the database.

```bash
npm test
```