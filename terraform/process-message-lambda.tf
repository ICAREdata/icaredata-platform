resource "aws_api_gateway_resource" "process_message" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  parent_id   = aws_api_gateway_rest_api.gateway.root_resource_id
  path_part   = "$process-message"
}

resource "aws_api_gateway_method" "process_message" {
  rest_api_id   = aws_api_gateway_rest_api.gateway.id
  resource_id   = aws_api_gateway_resource.process_message.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_lambda_function" "process_message" {
  filename      = "build/process-message.zip"
  function_name = "ProcessMessage"
  handler       = "process-message/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn
}

resource "aws_api_gateway_integration" "process_message" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_method.process_message.resource_id
  http_method = aws_api_gateway_method.process_message.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.process_message.invoke_arn
}

resource "aws_api_gateway_deployment" "process_message" {
  depends_on = [
    aws_api_gateway_method.process_message,
    aws_api_gateway_integration.process_message
  ]

  rest_api_id = aws_api_gateway_rest_api.gateway.id
  stage_name  = "dev"
}

output "process_message_url" {
  value = "${aws_api_gateway_deployment.process_message.invoke_url}/${aws_api_gateway_resource.process_message.path_part}"
}

resource "aws_lambda_permission" "process_message" {
  statement_id  = "AllowAPIGatewayInvokeProcessMessage"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_message.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.gateway.execution_arn}/*/*"
}
