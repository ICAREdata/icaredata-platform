
resource "aws_secretsmanager_secret" "extraction_zip" {
  name = "S3-Zip-Password"
}

resource "aws_secretsmanager_secret_version" "extraction_zip_value" {
  secret_id     = aws_secretsmanager_secret.extraction_zip.id
  secret_string = "example-string-to-protect"
}

resource "aws_lambda_function" "extraction" {
  filename      = "build/extraction.zip"
  function_name = "Extraction"
  handler       = "extraction/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      "foo" = "bar"
    }
  }

}


