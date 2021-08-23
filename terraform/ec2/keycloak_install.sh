yum -y install java-1.8.0-openjdk

KEYCLOAK_VERSION=14.0.0
KEYCLOAK_FILENAME=keycloak-$KEYCLOAK_VERSION
KEYCLOAK_ARCHIVE_NAME=$KEYCLOAK_FILENAME.tar.gz
KEYCLOAK_DOWNLOAD_ADDRESS=https://github.com/keycloak/keycloak/releases/download/$KEYCLOAK_VERSION/$KEYCLOAK_ARCHIVE_NAME
#download Postrges driver

#setup the keycloak user
groupadd -r keycloak
useradd -m -d /var/lib/keycloak -s /sbin/nologin -r -g keycloak keycloak

mkdir -p /opt/keycloak/
cd /opt/keycloak/

# https://www.keycloak.org/downloads.html
wget $KEYCLOAK_DOWNLOAD_ADDRESS
wget https://jdbc.postgresql.org/download/postgresql-42.2.23.jar

tar -xzf $KEYCLOAK_ARCHIVE_NAME
ln -s /opt/keycloak/$KEYCLOAK_FILENAME /opt/keycloak/current

cp /tmp/standalone.xml /opt/keycloak/current/standalone/configuration/standalone.xml

read -r -e -p  "Database URL: " db_host
read -r -e -s -p  "Keycloak Password: " kc_pass


sed -i 's/database_host/$db_host/' /opt/keycloak/current/standalone/configuration/standalone.xml
sed -i 's/database_password/$kc_pass/' /opt/keycloak/current/standalone/configuration/standalone.xml

cd /opt/keycloak/current/modules

mkdir -p org/postgresql/main
cp /opt/keycloak/postgresql-42.2.23.jar org/postgresql/main/postgresql-42.2.23.jar

echo '<?xml version="1.0" ?>
<module xmlns="urn:jboss:module:1.3" name="org.postgresql">

    <resources>
        <resource-root path="postgresql-42.2.23.jar"/>
	</resources>

	<dependencies>
		<module name="javax.api"/>
		<module name="javax.transaction.api"/>
	</dependencies>
</module>' > org/postgresql/main/module.xml

chown keycloak: -R /opt/keycloak
sudo -u keycloak chmod 700 /opt/keycloak/current/standalone

mkdir /var/log/keycloak
chown keycloak: -R /var/log/keycloak

chown keycloak: -R /opt/keycloak
sudo -u keycloak chmod 700 /opt/keycloak/current/standalone


echo '[Unit]
Description=Keycloak
After=network.target syslog.target

[Service]
Type=idle
User=keycloak
Group=keycloak
ExecStart=/opt/keycloak/current/bin/standalone.sh -b 0.0.0.0
TimeoutStartSec=600
TimeoutStopSec=600

StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=keycloak

[Install]
WantedBy=multi-user.target
' > /etc/systemd/system/keycloak.service

systemctl daemon-reload
systemctl enable keycloak
systemctl start keycloak


