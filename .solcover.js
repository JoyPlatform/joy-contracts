module.exports = {
  testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
  copyPackages: ['openzeppelin-solidity'],
  compileCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle compile --network coverage'
}
