#!/bin/sh
# Copyright (c) 2024 remittor
PID_FILE=/tmp/$1.pid
LOG_FILE=/tmp/$1.log
ERR_FILE=/tmp/$1.err
shift 1
: > $LOG_FILE
: > $ERR_FILE
(
	exec </dev/null >/dev/null 2>&1
	"$@" >> $LOG_FILE 2>&1
	echo $? > "$ERR_FILE"
	sleep 1
) &
echo $! > $PID_FILE
exit 0
