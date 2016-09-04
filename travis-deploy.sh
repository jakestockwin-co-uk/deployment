#!/usr/bin/env bash

echo "Deploying $TRAVIS_COMMIT"

curl -sNX POST https://deployment.jakestockwin.co.uk/deploy --data "project=$TRAVIS_REPO_SLUG&commit=$TRAVIS_COMMIT&email=$EMAIL&password=$PASSWORD" | while IFS= read -r LINE
do
	if [[ ${LINE} == "[SUCCESS]" ]]
	then
		echo "Deployment successful"
		exit 0
	elif [[ ${LINE} == "[FAILURE]" ]]
	then
		echo "Deployment failed"
		exit 1
	else
		echo "$LINE"
	fi
done

exit $?
