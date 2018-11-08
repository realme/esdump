#!/bin/bash
root_dir=$1
if [ "x$root_dir" = "x" ]; then 
	echo "usage: $0 dir"
	exit 
fi 

#config 
index_url="http://host:port/index/_search?scroll=10m"
auth="Basic ZFUdkcx"
max_count=10

now_time=$(date +%Y%m%d%H%M%S)
data_dir="$root_dir/es_dump.$now_time"
for dir in $data_dir "logs"
do
	mkdir -p $dir
done

echo "ES Export Dir: $root_dir" 
max=$max_count
for ((n=0; n<$max; n++))
do
	echo node esdump.js --input=$index_url --auth="$auth" --output=$data_dir --id=$n --max=$max --limit=10000  logs/esdump.$now_time.$n.log 
	nohup node esdump.js --input=$index_url --auth="$auth" --output=$data_dir --id=$n --max=$max --limit=10000 >> logs/esdump.$now_time.$n.log &
done
