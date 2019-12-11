resource "aws_api_gateway_rest_api" "gateway" {
    name = "ApiGateway"
}

resource "aws_api_gateway_resource" "proxy" {
   rest_api_id = aws_api_gateway_rest_api.gateway.id
   parent_id   = aws_api_gateway_rest_api.gateway.root_resource_id
   path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
   rest_api_id   = aws_api_gateway_rest_api.gateway.id
   resource_id   = aws_api_gateway_resource.proxy.id
   http_method   = "ANY"
   authorization = "NONE"
 }

resource "aws_api_gateway_method" "proxy_root" {
   rest_api_id = aws_api_gateway_rest_api.gateway.id
   resource_id = aws_api_gateway_rest_api.gateway.root_resource_id
   http_method = "ANY"
   authorization = "NONE"
}