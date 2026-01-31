#!/bin/sh
# Copyright (c) 2024 remittor
awk -V
PID_FILE=/tmp/zapret-script-exec.pid
[ -f $PID_FILE ] && exit 70
LOG_FILE=$1
RC_FILE=$1.rc
SH_FILE=$2
shift 2
[ ! -f $SH_FILE ] && exit 71
: > $LOG_FILE
: > $RC_FILE
start-stop-daemon -S -b -p $PID_FILE -x /bin/sh -- -c '
	LOG_FILE=$1
	RC_FILE=$2
	SH_FILE=$3
	shift 3
	sh $SH_FILE "$@" > $LOG_FILE 2>&1
	RET_CODE=$?
	sleep 1
	echo $RET_CODE > $RC_FILE
' sh $LOG_FILE $RC_FILE $SH_FILE "$@"
exit 0
