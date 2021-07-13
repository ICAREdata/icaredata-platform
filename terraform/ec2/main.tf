data "aws_ami" "amazon-linux-2" {
 most_recent = true


 filter {
   name   = "owner-alias"
   values = ["amazon"]
 }


 filter {
   name   = "name"
   values = ["amzn2-ami-hvm*"]
 }
}


resource "aws_instance" "test" {
 depends_on = ["aws_internet_gateway.test"]


 ami                         = "${data.aws_ami.amazon-linux-2.id}"
 associate_public_ip_address = true
 iam_instance_profile        = "${aws_iam_instance_profile.test.id}"
 instance_type               = "t2.micro"
 key_name                    = "bflad-20180605"
 vpc_security_group_ids      = ["${aws_security_group.test.id}"]
 subnet_id                   = "${aws_subnet.test.id}"
 
  provisioner "file" {
    source      = "install.sh"
    destination = "/tmp/install_keycloak.sh"
  }

 # Copies the myapp.conf file to /etc/myapp.conf
  provisioner "file" {
    source      = "standalone.xml"
    destination = "/opt/standalone.xml"
  }

  # Copies the string in content into /tmp/file.log
  provisioner "file" {
    content     = "ami used: ${self.ami}"
    destination = "/tmp/file.log"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/init.sh",
      "/tmp/init.sh args",
    ]
  }
}