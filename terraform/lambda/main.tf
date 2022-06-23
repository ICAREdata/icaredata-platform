provider "aws" {
  profile = "default"
  region  = "us-east-2"
}

resource "aws_api_gateway_rest_api" "gateway" {
  name = "ApiGateway"
}

data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "lambda_exec"
  path               = "/system/"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}
