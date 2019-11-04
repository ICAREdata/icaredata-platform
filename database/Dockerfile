FROM postgres
ENV POSTGRES_PASSWORD docker
ENV POSTGRES_DB dev
COPY CreateUsersAndRoles.sql /docker-entrypoint-initdb.d/
COPY CreateTrialDataTable.sql /docker-entrypoint-initdb.d/