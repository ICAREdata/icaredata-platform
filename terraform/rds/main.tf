resource "aws_db_parameter_group" "default" {
  name   = "rds-pg"
  family = "postgres11"


  parameter {
    name  = "ssl"
    value = "1"
  }

}

resource "aws_db_instance" "icare-database" {
    identifier                = "icare-database"
    allocated_storage         = 20
    storage_type              = "gp2"
    engine                    = "postgres"
    engine_version            = "11.10"
    instance_class            = "db.t2.small"
    name                      = "icare"
    username                  = "${var.database_username}"
    password                  = "${var.database_password}"
    port                      = 5432
    publicly_accessible       = false
    security_group_names      = []
    parameter_group_name      = "rds-pg"
    multi_az                  = false
    backup_retention_period   = 7
    backup_window             = "10:23-10:53"
    maintenance_window        = "sat:09:38-sat:10:08"
    final_snapshot_identifier = "icare-database-final"
}



resource "aws_secretsmanager_secret" "lambda-rds-login" {
  name = "Lambda-RDS-Login"
}

resource "aws_secretsmanager_secret_version" "lambda-rds-login_value" {
  secret_id     = aws_secretsmanager_secret.lambda-rds-login.id
  secret_string = "example-string-to-protect"
}