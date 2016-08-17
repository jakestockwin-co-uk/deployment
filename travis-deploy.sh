#!/usr/bin/env sh

echo "Deploying $TRAVIS_COMMIT"

curl -NX POST http://139.59.176.9:3000/deploy --data "project=$TRAVIS_REPO_SLUG&commit=$TRAVIS_COMMIT&email=$EMAIL&password=$PASSWORD"

