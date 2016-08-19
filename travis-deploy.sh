#!/usr/bin/env sh

echo "Deploying $TRAVIS_COMMIT"

curl -NX POST https://deployment.jakestockwin.co.uk/deploy --data "project=$TRAVIS_REPO_SLUG&commit=$TRAVIS_COMMIT&email=$EMAIL&password=$PASSWORD"

