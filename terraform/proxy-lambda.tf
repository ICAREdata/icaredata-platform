resource "aws_api_gateway_resource" "auth_proxy" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_rest_api.gateway.root_resource_id
  path_part   = "metadata"
}

resource "aws_api_gateway_method" "auth_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.gateway.id
  resource_id   = aws_api_gateway_resource.auth_proxy.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_lambda_function" "auth_proxy" {
  filename      = "build/auth_proxy.zip"
  function_name = "AuthProxy"
  handler       = "auth_proxy/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn
}

resource "aws_api_gateway_integration" "auth_proxy" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_resource.auth_proxy.id
  http_method = aws_api_gateway_method.auth_proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_proxy.invoke_arn
}

resource "aws_api_gateway_deployment" "auth_proxy" {
  depends_on = [
    aws_api_gateway_method.auth_proxy,
    aws_api_gateway_integration.auth_proxy
  ]

  rest_api_id = aws_api_gateway_rest_api.gateway.id
  stage_name  = "dev"
}

output "auth_proxy_url" {
  value = "${aws_api_gateway_deployment.auth_proxy.invoke_url}/${aws_api_gateway_resource.auth_proxy.path_part}"
}

resource "aws_lambda_permission" "auth_proxy" {
  statement_id  = "AllowAPIGatewayInvokeAuthProxy"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_proxy.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.gateway.execution_arn}/*/*"
}
