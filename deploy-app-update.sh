appName=$1
appCommit=$2

uptime=15 # May need to adjust for apps with longer startup

cd $appName
source .env
forever stop keystone.js > /dev/null

git fetch

currentCommit=`git rev-parse HEAD` || unset currentCommit

git checkout $appCommit || {
	echo "Checkout failed. Panicking."
	git checkout $currentCommit
	forever --minUptime="${uptime}000" start keystone.js > /dev/null
	exit 2
}

npm install --production 2>&1
forever --minUptime="${uptime}000" start keystone.js > /dev/null
sleep $uptime # Give keystone time to get up and running or fail
if nc -z $IP $PORT
then
	echo "Running successfully"
	exit 0
else # Travis should prevent this situation, but let's handle it anyway.
	echo "Failed to start server:"
	forever logs keystone.js
	forever stop keystone.js > /dev/null # Just in case
	exit 1
fi

# Exit codes:
# 	0 - success
# 	1 - failure
# 	2 - can't checkout

