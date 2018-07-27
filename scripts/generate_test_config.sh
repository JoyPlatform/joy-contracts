#!/usr/bin/env bash

readonly config_path="config.json"
readonly platform_reserve=`cat "test/accounts.json" | python3 -c "import sys, json; print(json.load(sys.stdin)['accounts'][1])"`
readonly game_developer=`cat "test/accounts.json" | python3 -c "import sys, json; print(json.load(sys.stdin)['accounts'][2])"`

if [[ -f "${config_path}" ]]; then
	echo "${config_path} already exist!"
else
	echo "{\"platformReserve\": \"${platform_reserve}\",\"gameDeveloper\": \"${game_developer}\"}" > "${config_path}"
fi
