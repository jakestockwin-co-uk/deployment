#!/usr/bin/env bash

STATUS=0

echo "Deploying $TRAVIS_COMMIT"

curl -sNX POST https://deployment.jakestockwin.co.uk/deploy --data "project=$TRAVIS_REPO_SLUG&commit=$TRAVIS_COMMIT&email=$EMAIL&password=$PASSWORD" | while IFS= read -r LINE
do
	if [[ ${LINE} == "[SUCCESS]" ]]
	then
		echo "Deployment successful"
		STATUS=0
	elif [[ ${LINE} == "[FAILURE]" ]]
	then
		echo "Deployment failed"
		STATUS=1
	else
		echo "$LINE"
	fi
done

exit $STATUS
