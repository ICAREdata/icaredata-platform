
resource "aws_lambda_function" "extraction" {
  filename      = "build/extraction.zip"
  function_name = "Extraction"
  handler       = "extraction/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn
}


