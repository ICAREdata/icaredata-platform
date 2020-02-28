resource "aws_api_gateway_resource" "authorizer" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_rest_api.gateway.root_resource_id
  path_part   = "metadata"
}

resource "aws_api_gateway_method" "authorizer" {
  rest_api_id   = aws_api_gateway_rest_api.gateway.id
  resource_id   = aws_api_gateway_resource.authorizer.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_lambda_function" "authorizer" {
  filename      = "build/authorizer.zip"
  function_name = "Authorizer"
  handler       = "authorizer/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn
}

resource "aws_api_gateway_integration" "authorizer" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_resource.authorizer.id
  http_method = aws_api_gateway_method.authorizer.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.authorizer.invoke_arn
}

resource "aws_api_gateway_deployment" "authorizer" {
  depends_on = [
    aws_api_gateway_method.authorizer,
    aws_api_gateway_integration.authorizer
  ]

  rest_api_id = aws_api_gateway_rest_api.gateway.id
  stage_name  = "dev"
}

output "authorizer_url" {
  value = "${aws_api_gateway_deployment.authorizer.invoke_url}/${aws_api_gateway_resource.authorizer.path_part}"
}

resource "aws_lambda_permission" "authorizer" {
  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.gateway.execution_arn}/*/*"
}
