cd `dirname $0`
SERVER_NAME=`awk 'END{print $1}' /etc/hosts`
sed -i -e "s/localhost/$SERVER_NAME/g" src/config.js
