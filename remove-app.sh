appName=$1

cd $appName

echo "Stopping $appName server"
forever stop keystone.js > /dev/null

cd ..

echo "Removing $appName directory"
rm -rf $appName
