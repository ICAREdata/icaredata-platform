data "aws_iam_policy_document" "lambda-assume-role-policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec"
  path = "/system/"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-role-policy.json
}

resource "aws_lambda_function" "process-message" {
  filename = "build/process-message.zip"
  function_name = "ProcessMessage"
  handler = "process-message/index.handler"
  runtime = "nodejs10.x"
  role = aws_iam_role.lambda_exec.arn
}

resource "aws_lambda_function" "conformance" {
  filename = "build/conformance.zip"
  function_name = "Conformance"
  handler = "conformance/index.handler"
  runtime = "nodejs10.x"
  role = aws_iam_role.lambda_exec.arn
}

resource "aws_lambda_function" "bulkdata" {
  filename = "build/bulkdata.zip"
  function_name = "Bulkdata"
  handler = "bulkdata/index.handler"
  runtime = "nodejs10.x"
  role = aws_iam_role.lambda_exec.arn
}