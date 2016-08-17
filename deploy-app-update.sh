appName=$1
appCommit=$2

uptime=15 # May need to adjust for apps with longer startup

cd $appName
source .env
forever stop keystone.js > /dev/null

git fetch

currentCommit=`git rev-parse HEAD` || unset currentCommit

git checkout $appCommit || {
	echo "Commit does not exist"
	git checkout $currentCommit
	forever --minUptime="${uptime}000" start keystone.js > /dev/null
	exit 1
}

npm install 2>&1
forever --minUptime="${uptime}000" start keystone.js > /dev/null
sleep $uptime # Give keystone time to get up and running or fail
if nc -z $IP $PORT
then
	echo "Running successfully"
	exit 0
else # Travis should prevent this situation, but let's handle it anyway.
	echo "Failed to start server"
	forever stop keystone.js > /dev/null # Just in case
	if [ -n "$currentCommit" ]
	then
		echo "Reverting to previous commit"
		git checkout $currentCommit
		forever --minUptime="${uptime}000" start keystone.js > /dev/null
		sleep 10
		if nc -z $IP $PORT
		then
			echo "Previous version back up"
			exit 2
		else
			echo "Previous version also failed"
			echo "Giving up..."
			exit 3
		fi
	else
		echo "Failed on first commit tried"
		echo "Giving up..."
		exit 4
	fi
fi

# Exit codes:
# 	0 - success
# 	1 - no commit
# 	2 - failed, but successfully reverted to previous
# 	3 - failed, and failed to revert to previous
# 	4 - failed on first deployment
