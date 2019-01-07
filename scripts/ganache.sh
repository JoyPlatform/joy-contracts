#!/usr/bin/env bash

set -o errexit
set -o nounset

readonly gasLimit="0xfffffffffff"

# use json npm package (from dev dependencies)
readonly ganache_port=$(cat test/config.json | node_modules/.bin/json ganache_port)
readonly test_mnemonic=$(cat test/config.json | node_modules/.bin/json mnemonic)

if nc -z localhost "${ganache_port}"; then
	echo "Ganache is already running on port ${ganache_port}."
else
	# run ganache with mnemonic
	node_modules/.bin/ganache-cli --port "${ganache_port}" --gasLimit "${gasLimit}" --mnemonic "${test_mnemonic}"
fi

