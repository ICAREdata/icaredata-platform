resource "aws_api_gateway_resource" "extraction" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_rest_api.gateway.root_resource_id
  path_part   = "metadata"
}

resource "aws_api_gateway_method" "extraction" {
  rest_api_id   = aws_api_gateway_rest_api.gateway.id
  resource_id   = aws_api_gateway_resource.extraction.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_lambda_function" "extraction" {
  filename      = "build/extraction.zip"
  function_name = "Extraction"
  handler       = "extraction/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn
}

resource "aws_api_gateway_integration" "extraction" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_resource.extraction.id
  http_method = aws_api_gateway_method.extraction.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.extraction.invoke_arn
}

resource "aws_api_gateway_deployment" "extraction" {
  depends_on = [
    aws_api_gateway_method.extraction,
    aws_api_gateway_integration.extraction
  ]

  rest_api_id = aws_api_gateway_rest_api.gateway.id
  stage_name  = "dev"
}

output "extraction_url" {
  value = "${aws_api_gateway_deployment.extraction.invoke_url}/${aws_api_gateway_resource.extraction.path_part}"
}

resource "aws_lambda_permission" "extraction" {
  statement_id  = "AllowAPIGatewayInvokeExtraction"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.extraction.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.gateway.execution_arn}/*/*"
}
