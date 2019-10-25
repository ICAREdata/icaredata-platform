# Local Dev Setup

## Postgres Server

[source](https://hackernoon.com/dont-install-postgres-docker-pull-postgres-bee20e200198)

[Install SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-mac.html) in order to have docker for this step and for usage later.

You should now have docker installed through the SAM installation

Pull down an image for LTS version of Postgres

```bash
docker pull postgres
```

Create a local mount point to persist the data beyond the container's lifecycle

```bash
mkdir -p $HOME/docker/volumes/icaredata/main-db
```

Start the container

```bash
docker run --rm --name icd-pg-docker -e POSTGRES_PASSWORD=docker -d -p 5432:5432 -v $HOME/docker/volumes/icaredata/main-db:/var/lib/postgresql/data postgres
```

## Postgres Client

I use [pgAdmin](https://www.pgadmin.org/download/), but you can use whichever client you prefer.

Once open, right click on servers and choose to create a server. Name the server (I called it ICAREdata Local). In the connection tab, fill in localhost for the host and docker for the password. Connect to this server.

Once connected, right click on the server and create a new database (I called this dev).

## Install Node

[Install node/npm/npx through nvm](https://github.com/nvm-sh/nvm)

Run `npm install`.

## SAM CLI

You should have SAM installed from previous steps. Run

```bash
sam local start-api --parameter-overrides 'ParameterKey=DbUser,ParameterValue=username ParameterKey=DbPwd,ParameterValue=password'
```

You should be able to send a get request to http://127.0.0.1:3000/test. It should log a statement to the terminal showing the database time.
