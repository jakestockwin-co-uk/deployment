#if we just want to echo and write to file ( '>' instead of '| tee' if we don't want to echo but do want to overwrite, '>>' to append)
#curl -sNX POST --data "project=students4students&commit=ad81d42163d4aaf4d57536bdb317cea83d3b2af4" localhost/deploy | tee output.txt 

# TODO: We need to error if the deployment server is unavailable for some reason. 
# TODO: This script needs to actually pull in arguments from travis.

#if we want to do more detailed processing
curl -sNX POST --data "project=students4students&commit=ad81d42163d4aaf4d57536bdb317cea83d3b2af4" localhost:3000/deploy | while read message 
do
  #process message here
  echo $message
done
