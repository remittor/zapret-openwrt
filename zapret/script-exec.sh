#!/bin/sh
# Copyright (c) 2024 remittor
LOG_FILE=$1
PID_FILE=$2
shift 2
: > $LOG_FILE
(
	exec </dev/null >/dev/null 2>&1
	"$@" >> $LOG_FILE 2>&1
) &
echo $! > $PID_FILE
exit 0
