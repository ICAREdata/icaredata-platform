resource "aws_api_gateway_resource" "conformance" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_rest_api.gateway.root_resource_id
  path_part   = "metadata"
}

resource "aws_api_gateway_method" "conformance" {
  rest_api_id   = aws_api_gateway_rest_api.gateway.id
  resource_id   = aws_api_gateway_resource.conformance.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_lambda_function" "conformance" {
  filename      = "build/conformance.zip"
  function_name = "Conformance"
  handler       = "conformance/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn
}

resource "aws_api_gateway_integration" "conformance" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_method.conformance.resource_id
  http_method = aws_api_gateway_method.conformance.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.conformance.invoke_arn
}

resource "aws_api_gateway_deployment" "conformance" {
  depends_on = [
    aws_api_gateway_method.conformance,
    aws_api_gateway_integration.conformance
  ]

  rest_api_id = aws_api_gateway_rest_api.gateway.id
  stage_name  = "dev"
}

output "conformance_url" {
  value = "${aws_api_gateway_deployment.conformance.invoke_url}/${aws_api_gateway_resource.conformance.path_part}"
}

resource "aws_lambda_permission" "conformance" {
  statement_id  = "AllowAPIGatewayInvokeConformance"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.conformance.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.gateway.execution_arn}/*/*"
}
