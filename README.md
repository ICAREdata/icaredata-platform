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

Create the docker image with the files in the database folder. Inside that folder, run

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

To register a client, send a post request to `https://localhost:9001/clients` with headers

```
Content-Type:application/json
Accept:application/json
```

and body

```javascript
{
    "client_id": "test2",
    "token_endpoint_auth_method": "none"
}
```

## Install Node

[Install node/npm/npx through nvm](https://github.com/nvm-sh/nvm)

Run `npm install`.

## SAM CLI

You should have SAM installed from previous steps. Run

```bash
sam local start-api --parameter-overrides 'ParameterKey=DbUser,ParameterValue=postgres ParameterKey=DbPwd,ParameterValue=docker'
```

You should be able to send a get request to http://127.0.0.1:3000/test. It should log a statement to the terminal showing the database time.