resource "aws_lambda_function" "conformance" {
  filename = "build/conformance.zip"
  function_name = "Conformance"
  handler = "conformance/index.handler"
  runtime = "nodejs10.x"
  role = aws_iam_role.lambda_exec.arn
}
