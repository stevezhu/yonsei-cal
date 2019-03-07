const fs = require('fs')
const moment = require('moment-timezone')
const ics = require('ics')

const LABELS = [
  'group',
  'code',
  'sec',
  'lab',
  null, // syllabus button
  'title',
  'credit',
  'instructor',
  'time',
  'location',
  'withdrawal',
  'reference',
]

const LOCATIONS = require('./locations.json')
const DATES = require('./dates.json')

// collects the data into an object for each line
function processLine(line) {
  const values = line.split('\t')
  const data = {}
  for (let [i, value] of values.entries()) {
    const label = LABELS[i]
    if (label) {
      data[label] = value
    }
  }
  return data
}

// /**
//  * Convert period to hour.
//  * Period 1 is 09:00-09:50, period 9 is 17:00-17:50, etc.
//  */
// function periodToHour(period) {
//   // just add 8 to get the hour
//   return period + 8
// }

const LOC_RE = /([a-zA-Z]+?)(\d+)/
function parseLocationInfo(location) {
  const res = location.split(' ')
  if (res.length === 2) return res

  const [loc, building, room] = LOC_RE.exec(location)
  return [building, room]
}

function getNextWeekday(time, weekday) {
  weekday = moment()
    .day(weekday)
    .isoWeekday()
  return time.isoWeekday() <= weekday
    ? time.isoWeekday(weekday)
    : time.add(1, 'weeks').isoWeekday(weekday)
}

const TIMEZONE = 'Asia/Seoul'
function startToUTC(weekday, periods) {
  const [startDate, endDate] = DATES['2019'][0]

  // period 1 is 09:00-09:50, period 9 is 17:00-17:50, etc.
  // just add 8 to get the hour from the period
  const startPeriod = periods[0]
  const hour = parseInt(startPeriod) + 8
  const time = moment.tz(`${startDate} ${hour}`, 'YYYY-MM-DD H', TIMEZONE)
  return getNextWeekday(time, weekday).utc()
}

function getRecurrenceRule(weekday) {
  const [startDate, endDate] = DATES['2019'][0]
  const until = moment(endDate)
    .add(1, 'days')
    .utc()
    .format()
    .replace(/[-:]/g, '')
  // need to turn input (Tue) to ics format (TU)
  weekday = weekday.slice(0, 2).toUpperCase()
  return `FREQ=WEEKLY;UNTIL=${until};BYDAY=${weekday}`
}

const TIME_RE = /([a-zA-Z]{3})([0-9,]+)/g

function run(filepath, outputFilepath) {
  const text = fs
    .readFileSync(filepath)
    .toString()
    .slice(0, -1)

  const events = []

  for (const line of text.split('\n')) {
    const data = processLine(line)

    const loc = data.location
    const [building, room] = parseLocationInfo(loc)

    const event = {
      title: data.title.replace('*', ''),
      description: `${data.code}-${data.sec}-${data.lab} - ${data.instructor}`,
      location: `${loc} - ${LOCATIONS[building].name}, Room ${room}`,
      productId: 'yonsei-cal/ics',
    }

    const time = data.time
    while (true) {
      const result = TIME_RE.exec(time)
      if (result === null) break

      const weekday = result[1]
      const periods = result[2].replace(/,$/, '').split(',')

      const start = startToUTC(weekday, periods)
        .format('YYYY-M-D-H-m')
        .split('-')
      // 1 period is 50 minutes and add 1 hour for each extra period
      const duration = { minutes: 50, hours: periods.length - 1 }

      // const day = result[1]
      const recurrenceRule = getRecurrenceRule(weekday)

      events.push(Object.assign({ start, duration, recurrenceRule }, event))
    }
  }

  ics.createEvents(events, (err, val) => {
    fs.writeFileSync(outputFilepath, val)
  })
}

run('./temp/calendar.txt', './temp/calendar.ics')
