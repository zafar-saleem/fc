#!/usr/bin/env node

const blessed = require('blessed');
const weather = require('weather-js');
const contrib = require('blessed-contrib');
const fs = require('fs');
const opn = require('opn');

let screen = blessed.screen({
    smartCSR: true,
    scrollable: true
});

let form, submit, city;

showForm();

screen.title = 'How is weather?';

let todaysWeather = blessed.box({
    top: 'top',
    left: 'left',
    width: '50%',
    height: '20%',
    label: 'Weather',
    border: {
        type: 'line'
    },
    padding: {
        top: 1,
        right: 2,
        bottom: 1,
        left: 2
    }
});

submit.on('press', () => {
    form.submit();
});

form.on('submit', data => {
    screen.remove(form);

    city = data.CityName.replace(/ /g, '-');

    weather.find({
        search: data.CityName,
        degreeType: 'C'
    }, (error, result) => {
        let response = result[0];
        let flag = true;
        let top = 0;

        let contents = 'Current Weather';
            contents += '\n----------------';
            contents += '\n' + response.location.name;
            contents += ' ' + response.current.temperature + '°' + result[0].location.degreetype;
            contents += '\nFeels Like: ' + response.current.feelslike + '°' + result[0].location.degreetype;
            contents += '\n' + response.current.skytext;
            contents += '\nHumidity: ' + response.current.humidity + '%';
            contents += '\nWind Display: ' + response.current.winddisplay;
            contents += '\nWind Speed: ' + response.current.windspeed;

        readStats().then(res => {
            let bar = contrib.bar({
                label: 'Usage Stats',
                barWidth: 12,
                barSpacing: 6,
                xOffset: 0,
                maxHeight: 9,
                width: '50%',
                height: '20%',
                left: '50%',
                align: 'center',
                border: {
                    type: 'line'
                }
            });

            screen.append(bar);

            bar.setData(res);

            response.forecast.forEach((item, index) => {
                let items = '';
                    items += '\n' + item.skytextday;
                    items += '\nLow: ' + item.low + '°C';
                    items += '\nHigh: ' + item.high + '°C';

                let height = '20%';

                if (flag) {
                    top = 11;
                    flag = false;
                } else {
                    top += 14;
                }

                blessed.box({
                    parent: screen,
                    width: '100%',
                    height: '13%',
                    top: top + 10 + '%',
                    left: 'left',
                    border: {
                        type: 'line'
                    },
                    padding: {
                        right: 2,
                        left: 2
                    },
                    label: item.day + ' | ' + item.date,
                    content: items
                });

                screen.render();
            });

            todaysWeather.setContent(contents);
            screen.append(todaysWeather);
            screen.render();

        }).catch(error => {
            console.log(error);
        });
    });
});

let home = process.env['HOME'] + '/weatherStats.json';

function readStats() {
    let date = new Date();

    return new Promise((resolve, reject) => {
        fs.open(home, 'r+', (err, fd) => {
            if (err) {

                let statistics = {
                    "titles": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    "data": [0, 0, 0, 0, 0, 0, 0]
                };

                fs.writeFile(home, JSON.stringify(statistics), (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(statistics);
                    }
                });

            } else {
                readStatisticsFile().then(response => {
                    let stats = JSON.parse(response);

                    for (let i = 0; i < stats.data.length; i++) {
                        if (i === date.getDay()) {
                            stats.data[i]++;

                            fs.writeFile(home, JSON.stringify(stats), (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(stats);
                                }
                            });
                        }
                    }
                }).catch(error => {
                    console.log(error);
                });
            }
        });
    });
}

function readStatisticsFile() {
    return new Promise((resolve, reject) => {
        fs.readFile(home, 'utf8', (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

function showForm() {
    form = blessed.form({
        parent: screen,
        width: '50%',
        height: '22%',
        left: 'center',
        keys: true,
        vi: true,
        border: {
            type: 'line'
        }
    });

    let searchLabel = blessed.text({
        parent: form,
        top: '25%',
        left: '5%',
        content: 'Enter City Name'
    });

    let searchField = blessed.textbox({
        parent: form,
        name: 'CityName',
        width: '90%',
        top: '30%',
        left: '5%',
        height: 3,
        inputOnFocus: true,
        focus: true,
        content: 'City Name',
        border: {
            type: 'line'
        },
        focus: {
            fg: 'blue'
        }
    });

    submit = blessed.button({
        parent: form,
        name: 'submit',
        content: 'Submit',
        top: '50%',
        left: '84%',
        shrink: true,
        padding: {
            top: 1,
            right: 2,
            bottom: 1,
            left: 2
        },
        style: {
            bold: true,
            fg: 'white',
            bg: 'green',
            focus: {
                inverse: true
            }
        }
    });

    screen.render();
}

let footer = blessed.box({
    parent: screen,
    width: '100%',
    height: '5%',
    top: '96%',
    border: {
        type: 'line'
    },
    content: 'Press o(for Open) to enter another city. Press q (for quit) to quit application. Press w(for web) to open weather in website.',
    fg: 'red'
});

screen.key(['W', 'w'], (ch, key) => {
    opn('https://www.msn.com/en-us/weather/today/' + city + '/we-city');
});

screen.key(['O', 'o'], (ch, key) => {
    screen.append(form);
    form.reset();
    form.focus();
});

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], (ch, key) => {
    return process.exit(0);
});

screen.render();

