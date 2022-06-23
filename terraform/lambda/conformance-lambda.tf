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
  runtime       = "nodejs12.x"
  role          = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      "METADATA_URL" = "${var.metadata_url}"
    }
  }


}

resource "aws_api_gateway_integration" "conformance" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_resource.conformance.id
  http_method = aws_api_gateway_method.conformance.http_method

  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = aws_lambda_function.conformance.invoke_arn
}

resource "aws_api_gateway_method_response" "conformance_response_200" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_resource.conformance.id
  http_method = aws_api_gateway_method.conformance.http_method
  status_code = "200"

}

resource "aws_api_gateway_integration_response" "conformance_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.gateway.id
  resource_id = aws_api_gateway_resource.conformance.id
  http_method = aws_api_gateway_method.conformance.http_method
  status_code = aws_api_gateway_method_response.conformance_response_200.status_code
  depends_on = [aws_api_gateway_integration.conformance]
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
