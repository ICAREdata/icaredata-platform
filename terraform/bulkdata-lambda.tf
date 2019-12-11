resource "aws_lambda_function" "bulkdata" {
  filename = "build/bulkdata.zip"
  function_name = "Bulkdata"
  handler = "bulkdata/index.handler"
  runtime = "nodejs10.x"
  role = aws_iam_role.lambda_exec.arn
}