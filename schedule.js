//import statements
const { client } = require('./db/db')
let cron = require('node-cron');
let nodemailer = require('nodemailer');
var fs = require('fs');

//declaration
var email = []
var mailformat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

client.connect()

// fetching email ids from db 

client.query('SELECT * from employees', (err, res) => {

    console.log('fetching email ids')

    res.rows.map(item => {
        //email validation
        if (mailformat.test(item.emailid.trim())) {
            email.push(item.emailid)
        } else {
            let err = 'Invalid email' + item.emailid
            console.log(err);
            errorLog(err, 'email validation')

        }
    })
    schedulingEmail()
})



function schedulingEmail() {
    //reading mail credentials from file
    fs.readFile('./mail.json', 'utf8', (err, data) => {
        if (err) {
            errorLog(err, 'file reader')
        } else {
            console.log('reading mail credentials from file')

            const mail_credentials = JSON.parse(data)
            // e-mail transport configuration
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: mail_credentials[0].user,
                    pass: mail_credentials[0].password
                }
            });


            // e-mail message options
            let mailOptions = {
                from: mail_credentials[0].user,
                to: email,
                subject: mail_credentials[0].subject,
                text: mail_credentials[0].text
            };

            console.log('starting cron')

            // cron configuration for every 8 hr -> 0 */8 * * *

            //creating a cron for running every minitue
            cron.schedule('* * * * *', () => {
                // Send e-mail
                console.log('scheduling email')
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        errorLog(error, 'schedule')
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            });

        }

    });
}



//insering error to db
function errorLog(error, area) {
    var today = new Date();
    client.query(
        `INSERT INTO schedule_error(message, datetime,error_area)VALUES('${error}','${today}','${area}')`,
        (err, res) => {
            if (err) {
                console.log(err)
            }
        }
    );
}
