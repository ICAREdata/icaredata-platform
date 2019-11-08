# Local Dev Setup

## Postgres Server

[source](https://hackernoon.com/dont-install-postgres-docker-pull-postgres-bee20e200198)

[Install SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-mac.html) now in order to have docker for this step and for usage later.

You should now have docker installed through the SAM installation

Create a local mount point to persist the data beyond the container's lifecycle

```bash
mkdir -p $HOME/docker/volumes/icaredata/postgres-data
```

Create a network for the docker containers

```bash
docker network create icaredata
```

Go to the database directory. From there, create the docker image with by running

```bash
docker build -t icd-pg .
```

Start the container

```bash
docker run --rm --name icd-pg --network icaredata -e POSTGRES_PASSWORD=docker -d -p 5432:5432 -v $HOME/docker/volumes/icaredata/postgres-data:/var/lib/postgresql/data icd-pg
```

## Postgres Client

Installing a postgres client is really only necessary in order to view and interact with the database directly. I use [pgAdmin](https://www.pgadmin.org/download/), but you can use whichever client you prefer.

Once open, right click on servers and choose to create a server. Name the server (I called it ICAREdata Local). In the connection tab, fill in localhost for the host and docker for the password. Connect to this server.

## ORY Hydra

[source](https://www.ory.sh/docs/hydra/configure-deploy)

You should have created a docker network while creating the postgres server. The database should be running on that network.

Pull a docker image of hydra

```bash
docker pull oryd/hydra:v1.0.8
```

Run a database migration for hydra against the database server

```bash
docker run -it --rm --network icaredata oryd/hydra:v1.0.8 migrate sql --yes postgres://postgres:docker@icd-pg/hydra?sslmode=disable
```

Run the hydra server

```bash
docker run -d --name ory-hydra --network icaredata -p 9000:4444 -p 9001:4445 -e SECRETS_SYSTEM=testtesttesttest -e DSN=postgres://postgres:docker@icd-pg/hydra?sslmode=disable -e URLS_SELF_ISSUER=https://localhost:9000/ -e URLS_CONSENT=http://localhost:9020/consent -e URLS_LOGIN=http://localhost:9020/login oryd/hydra:v1.0.8 serve all
```

Check if the hydra server is running

```bash
docker logs ory-hydra
```

## Install Node

[Install node/npm/npx through nvm](https://github.com/nvm-sh/nvm)

Run `npm install`.

## SAM CLI

You should have SAM installed from previous steps. Run

```bash
sam local start-api --parameter-overrides 'ParameterKey=DbUser,ParameterValue=postgres ParameterKey=DbPwd,ParameterValue=docker'
```

You should be able to send a post request to http://127.0.0.1:3000/DSTU2/$process-message with a properly formatted FHIR Message in the body. An example of such a FHIR Message Bundle is included in `test/fixtures/message.json`. This will insert the Message and its associated information into the database.

## Running the Test Client

To register the test client with the local hydra server, send a post request to `https://localhost:9001/clients` with the sample public jwk set in the test-client folder. The headers should be 

```
Content-Type:application/json
Accept:application/json
```
and the body should be

```json
{
    "client_id": "test-client",
    "jwks": {
	    "keys": [
	        {
	            "kty": "RSA",
	            "e": "AQAB",
	            "use": "sig",
	            "kid": "test-client",
	            "alg": "RS384",
	            "n": "nXVWf4RARJ64E7DdTOz07Hfl48eCmXL6GgJjVlLVXKdXh0qPs-icNIoLd9uqdvND_6Yi7PkUsg6ZtIqSECApgeYIneitA2JyE9bF9YpyFU8968Oo9d53UTEATHkxjOMHuDrYxzSAFtRW3oLAQ8OoU353WlVdyi4N2yY0rSEaZG6rhPqPWycFpcl6shh4ku50Or_YNjKFHduH-xY6GKKJL6bY1sS7_5RodTh5MLInfkDm7RS8evzJqcV5FYzYdcpd0qrd_t-XM2fll1WeOfpYjQuEHUS-yLL-HFcyr2aQqsM2i61TAVYoNeMweqejKjB0wpcBT3G76zJVz_NcqQJ53w"
	        }
	    ]
    }
}
```