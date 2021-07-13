



resource "aws_api_gateway_resource" "proxy_first" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_rest_api.gateway.root_resource_id
  path_part   = "oauth"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_resource.proxy_first.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.gateway.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_lambda_function" "proxy" {
  filename      = "build/proxy.zip"
  function_name = "proxy"
  handler       = "proxy/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      "OAUTH_SERVER_HOST" = "${var.oauth_server_host}"
      "OAUTH_SERVER_PORT" = "${var.oauth_server_port}"
      "OAUTH_SERVER_PATH" = "${var.oauth_server_path}"
      "FORWARDED_HOST" = "${var.forwarded_host}"
    }
  }

}

resource "aws_api_gateway_integration" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.proxy.invoke_arn
}

resource "aws_api_gateway_deployment" "proxy" {
  depends_on = [
    aws_api_gateway_method.proxy,
    aws_api_gateway_integration.proxy
  ]

  rest_api_id = aws_api_gateway_rest_api.gateway.id
  stage_name  = "dev"
}

output "proxy_url" {
  value = "${aws_api_gateway_deployment.proxy.invoke_url}/${aws_api_gateway_resource.proxy.path_part}"
}

resource "aws_lambda_permission" "proxy" {
  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.proxy.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.gateway.execution_arn}/*/*"
}
