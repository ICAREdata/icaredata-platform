resource "aws_api_gateway_authorizer" "authorizer" {
  name                   = "authorizer"
  rest_api_id            = aws_api_gateway_rest_api.gateway.id
  authorizer_uri         = aws_lambda_function.authorizer.invoke_arn
  identity_source        = "method.request.header.Authorization"
  type                   = "REQUEST"
}



resource "aws_lambda_function" "authorizer" {
  filename      = "build/authorizer.zip"
  function_name = "AuthProxy"
  handler       = "authorizer/index.handler"
  runtime       = "nodejs10.x"
  role          = aws_iam_role.lambda_exec.arn
}


resource "aws_lambda_permission" "authorizer" {
  statement_id  = "AllowAPIGatewayInvokeAuthProxy"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.gateway.execution_arn}/*/*"
}


