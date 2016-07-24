appName=$1
appGit=$2

mkdir $appName
cd $appName

git init
git remote add origin "git@github.com:${appGit}.git"
git fetch
