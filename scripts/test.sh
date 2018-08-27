#!/usr/bin/env bash
set -o errexit

trap cleanup EXIT

# use json npm package (from dev dependencies)
readonly mnemonic=$(cat test/config.json | node_modules/.bin/json mnemonic)
readonly gasLimit="0xfffffffffff"

cleanup() {
	# Kill the ganache instance that we started (if we started one and if it's still running).
	if [ -n "${pid}" ] && ps -p "${pid}" > /dev/null; then
		kill "${pid}"
	fi
}

running_on_port() {
	local port="${1}"
	nc -z localhost "${port}"
}

run_eth_env() {
	local env_type="${1}"
	local port=$(cat test/config.json | node_modules/.bin/json ${env_type}_port)

	if $(running_on_port "$port"); then
		echo "Using existing ${env_type} instance"
	else
		echo "Starting our own ${env_type} instance"

		if [ "$env_type" = "testrpc" ]; then
			node_modules/.bin/testrpc-sc --port "${port}" --gasLimit "${gasLimit}" --mnemonic "${mnemonic}" > /dev/null &
		elif [ "$env_type" = "ganache" ]; then
			node_modules/.bin/ganache-cli --port "${port}" --gasLimit "${gasLimit}" --mnemonic "${mnemonic}" > /dev/null &
		fi

		# assign ID of process to pid var
		pid="${!}"
	fi
}

if [ "${SOLIDITY_COVERAGE}" = true ]; then
	# run testrpc-sc
	run_eth_env "testrpc"
	node_modules/.bin/solidity-coverage
else
	# run ganache
	run_eth_env "ganache"
	node_modules/.bin/truffle test
fi
