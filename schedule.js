//import statements
const { client } = require('./db/db')
let cron = require('node-cron');
let nodemailer = require('nodemailer');
var fs = require('fs');

//environment file
const dotenv = require('dotenv');
dotenv.config();

//declaration
var email = []
var mailformat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

//db connection
client.connect()

// fetching email ids from db 
function empDataCollection() {
    client.query('SELECT * from employees', (err, res) => {

        if (err) {
            errorLog(err, 'data fetching issue', 'Pending')
        } else {

            console.log('fetching email ids')
            res.rows.map(item => {
                //email validation
                if (mailformat.test(item.emailid.trim())) {
                    email.push(item.emailid)
                } else {
                    let err = 'Invalid email ' + item.emailid
                    console.log(err);
                    errorLog(err, 'email validation', 'Pending')

                }
            })



        }
    })
}


// e-mail transport configuration
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: `${process.env.USER}`,
        pass: `${process.env.PASSWORD}`
    }
});


// e-mail message options
let mailOptions = {
    from: `${process.env.USER}`,
    to: email,
    subject: `${process.env.SUBJECT}`,
    text: `${process.env.TEXT}`,
    dsn: {
        id: 'some random message specific id',
        return: 'headers',
        notify: ['failure', 'delay'],
        recipient: `${process.env.USER}`
    }
};

console.log('starting cron')
// cron configuration for every 8 hr -> 0 */8 * * *

//creating a cron for running every 5 minitue
cron.schedule('*/5 * * * *', () => {
    console.log('insideCron');
    //data fetching
    empDataCollection()
    // Send e-mail
    emailGeneration()
});

//cron for rescheduling
cron.schedule('*/8 * * * *', () => {
    console.log('inside rerunCron');

    //data fetching
    errorDataCollection()

});

//fetching data from errorlog table for rerun the scheduler
function errorDataCollection() {
    let today = new Date()
    let pendingSchedule = ['']
    let currentTime = new Date()
    let timePeriod = new Date(currentTime.setMinutes(currentTime.getMinutes() - 8));

    client.query(`SELECT * from schedule_error WHERE error_area != 'email validation' AND status != 'Success' AND datetime <= '${today}' AND datetime >= '${timePeriod}'`,
        (err, res) => {
            if (err) {
                errorLog(err, 'reschedule', 'Pending')

            } else {
                pendingSchedule = res.rows
                for (let errorrow of pendingSchedule) {
                    reScheduling(errorrow);
                }
            }

            //   console.log(res.rows);
        })
}

//sending email
function emailGeneration() {
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            errorLog(error, 'schedule', 'Pending')
        } else {
            console.log('Email sent: ' + info.response);
            // client.end()
        }
    });
}

//rescheduling cron 
function reScheduling(row) {
    console.log('resceduling mails');
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            update(row, 'Success')
        } else {
            console.log('Email resent: ' + info.response);
            update(row, 'Failed')
            client.end()
        }
    });
}


//insering error to db

function errorLog(error, area, status) {
    var today = new Date();
    client.query(
        `INSERT INTO schedule_error(message, datetime,error_area,status)VALUES('${error}','${today}','${area}','${status}')`,
        (err, res) => {
            if (err) {

                console.log(err)
            }
        }
    );
}

//updating db status after rescheduling the cron
function update(row, status) {
    let errorId = parseInt(row.errorId)
    client.query(
        `UPDATE  schedule_error SET status = '${status}' WHERE "errorId"= '${errorId}'`,
        (err, res) => {
            console.log(`UPDATE  schedule_error SET status = '${status}' WHERE "errorId"= '${errorId}'`);
            if (err) {

                errorLog(err, 'rescheduling updation failed', 'Failed')
            }else {
                console.log('successfully updated');
            }
        }
    );
}
