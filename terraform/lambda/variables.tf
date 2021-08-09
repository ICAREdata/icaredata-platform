variable "database_host" {
  description = "The host address for the rds instance"
}
variable "database_port" {
  description = "The port number for the rds instance"
}
variable "database_name" {
  description = "The name of the database to use (icare)"
}

variable "lambda_db_user" {
  description = "The username that the lambdas will use to connect to the database"
}

variable "lambda_db_password" {
  description = "The password that the lambdas will use to connect to the database"
}

variable "oauth_server_host" {
  description = "The ec2 host that the lambdas will use to communicate with the oauth2 server"
}
variable "oauth_server_port" {
  description = "The ec2 port that the lambdas will use to communicate with the oauth2 server"
}
variable "oauth_server_path" {
  description = "The ec2 server path to use as a base url for the oauth2 server.  "
}

variable "forwarded_host" {
  description = "The proxy lambda forwards requests to the backend oauth2 server and needs to understand what host name the original request is being made to so the oauth2 server can create the correct response"
}

variable "bulk_data_token_endpoint" {
  description = "The endpoint that clients can use to request a token.  This will be "
}

variable "s3_bucket" {
  description = "The S3 bucket that data extracts will be stored in"
}

variable "extraction_password" {
  description = "The password that the encrypted zip file will use for extracts stored in S3"
}

variable "metadata_url" {
  description = "The endpoint at which the FHIR Conformance statement is provided"
}