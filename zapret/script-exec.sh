#!/bin/sh
# Copyright (c) 2024 remittor
PID_FILE=/tmp/zapret-script-exec.pid
if [ -f $PID_FILE ]; then
	echo "ERROR: file $PID_FILE already exists!" | awk 'NR==1'
	exit 70
fi
LOG_FILE=$1
RC_FILE=$1.rc
SH_FILE=$2
shift 2
if [ ! -f $SH_FILE ]; then
	echo "ERROR: script $SH_FILE not found!" | awk 'NR==1'
	exit 71
fi
: > $LOG_FILE
: > $RC_FILE
start-stop-daemon -S -b -p $PID_FILE -x /bin/sh -- -c '
	LOG_FILE=$1
	RC_FILE=$2
	SH_FILE=$3
	shift 3
	sh $SH_FILE "$@" > $LOG_FILE 2>&1
	RET_CODE=$?
	wc -l $LOG_FILE >/dev/null
	echo $RET_CODE > $RC_FILE
' sh $LOG_FILE $RC_FILE $SH_FILE "$@"
RET_CODE=$?
if [ $RET_CODE != 0 ]; then
	echo "ERROR: script $SH_FILE not executed! ret_code = $RET_CODE" | awk 'NR==1'
	exit $RET_CODE
fi
echo "Script $SH_FILE running..." | awk 'NR==1'
exit 0
