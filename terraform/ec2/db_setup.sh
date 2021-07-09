sudo amazon-linux-extras enable postgresql11
yum -y install postgresql11

#execute psql to create users and passwords 
read -r -e -s -p  "Keycloak Password: " kc_pass
read -r -e -s -p "Lambda Password: " lambda_pass
read -r -e  -p "Database URL: " db_host
read -r -e -p "Database User: " db_user
psql -v keycloak_password=\'$kc_pass\' -v lambda_password=\'$lambda_pass\' --host $db_host --user $db_user  -f schema.sql