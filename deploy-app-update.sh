appName=$1
appCommit=$2

uptime=10 # May need to adjust for apps with longer startup

cd $appName
source .env
forever stop keystone.js > /dev/null

git fetch

currentCommit=`git rev-parse HEAD` || unset currentCommit

git checkout $appCommit || {
	echo "Commit does not exist"
	git checkout $currentCommit
	forever --minUptime="${uptime}000" start keystone.js > /dev/null
	return 1
}

npm install > /dev/null
forever --minUptime="${uptime}000" start keystone.js > /dev/null
sleep $uptime # Give keystone time to get up and running or fail
if nc -z localhost $PORT
then
	echo "Running successfully"
	return 0
else # Travis should prevent this situation, but let's handle it anyway.
	echo "Failed to start server"
	forever stop keystone.js > /dev/null # Just in case
	if [ -n "$currentCommit" ]
	then
		echo "Reverting to previous commit"
		git checkout $currentCommit
		forever --minUptime="${uptime}000" start keystone.js > /dev/null
		sleep 10
		if nc -z localhost $PORT
		then
			echo "Previous version back up"
			return 2
		else
			echo "Previous version also failed"
			echo "Giving up..."
			return 3
		fi
	else
		echo "Failed is first commit tried"
		echo "Giving up..."
		return 4
	fi
fi

# Return codes:
# 	0 - success
# 	1 - no commit
# 	2 - failed, but successfully reverted to previous
# 	3 - failed, and failed to revert to previous
# 	4 - failed on first deployment
