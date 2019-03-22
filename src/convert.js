const fs = require('fs')
const path = require('path')
const generateICS = require('./calendar')

function run(inputFilepath, outputFilepath) {
  const input = fs
    .readFileSync(inputFilepath)
    .toString()
    .slice(0, -1)

  generateICS(input, (err, val) => {
    // add newlines between events
    val = val.replace(/BEGIN:VEVENT/g, '\nBEGIN:VEVENT')
    fs.writeFileSync(outputFilepath, val)
  })
}

const input = path.resolve(__dirname, '../temp/calendar.txt')
const output = path.resolve(__dirname, '../temp/calendar.ics')
run(input, output)
