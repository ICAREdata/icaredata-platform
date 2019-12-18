resource "aws_api_gateway_resource" "bulkdata_first" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_rest_api.gateway.root_resource_id
  path_part   = ".well-known"
}

resource "aws_api_gateway_resource" "bulkdata" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_resource.bulkdata_first.id
  path_part   = "smart-configuration"
}

resource "aws_api_gateway_method" "bulkdata" {
  rest_api_id   = aws_api_gateway_rest_api.gateway.id
  resource_id   = aws_api_gateway_resource.bulkdata.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_lambda_function" "bulkdata" {
  filename      = "build/bulkdata.zip"
  function_name = "Bulkdata"
  handler       = "bulkdata/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn
}

resource "aws_api_gateway_integration" "bulkdata" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_method.bulkdata.resource_id
  http_method = aws_api_gateway_method.bulkdata.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.bulkdata.invoke_arn
}

resource "aws_api_gateway_deployment" "bulkdata" {
  depends_on = [
    aws_api_gateway_method.bulkdata,
    aws_api_gateway_integration.bulkdata
  ]

  rest_api_id = aws_api_gateway_rest_api.gateway.id
  stage_name  = "dev"
}

output "bulkdata_url" {
  value = "${aws_api_gateway_deployment.bulkdata.invoke_url}/${aws_api_gateway_resource.bulkdata_first.path_part}/${aws_api_gateway_resource.bulkdata.path_part}"
}

resource "aws_lambda_permission" "bulkdata" {
  statement_id  = "AllowAPIGatewayInvokeBulkdata"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bulkdata.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.gateway.execution_arn}/*/*"
}
