appName=$1

uptime=30 # May need to adjust for apps with longer startup

cd $appName
source .env

echo "Stopping keystone"
forever stop keystone.js > /dev/null

echo "Restarting keystone"
forever --minUptime="${uptime}000" start keystone.js > /dev/null

echo "Waiting for keystone to start"
sleep $uptime # Give keystone time to get up and running or fail
if nc -z $IP $PORT
then
	echo "Running successfully"
	exit 0
else
	echo "Failed to start server:"
	forever logs keystone.js
	forever stop keystone.js > /dev/null # Just in case
	exit 1
fi

# Exit codes:
# 	0 - success
# 	1 - failure

