require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
var multer = require('multer')


//Connection to Sqlite database
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./news.db', (err) => {
    if (err) console.log(err);
    else { console.log("Connected to database") }
});

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, new Date().getTime() + "-" + req.session.admin_id + file.originalname);
    }
})


var upload = multer({ storage: storage })
const saltRounds = 10;


const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));  //Serving static files from public folder like css and js files
app.use(bodyParser.urlencoded({ extended: true }));


//Session initialiazation
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));


//Home Route
app.get('/', (req, res) => {
    //fetching news in descending priority so that higher priority news comes first
    var query = "select * from News order by priority desc;";
    db.all(query, [], (err, rows) => {
        if (err) console.log(err);
        res.render('index.ejs', { news: rows });
    });

});

//Sports route
app.get('/Sports',(req,res)=>{
    var query = "select * from News natural join Category where category='sports';";
    db.all(query, [], (err, rows) => {
        if (err) console.log(err);
        res.render('index.ejs', { news: rows });
    });
});


//Login Route
app.route('/Login')
    .get((req, res) => {
        res.render('login.ejs', { loginStatus: "Enter to Authenticate" });
    })
    .post((req, res) => {
        var query1 = 'select admin_id,pass from Admin where username =?;';
        db.get(query1, [req.body.userName], (error, row) => {
            //no such entry in the database
            if (row == undefined)
                res.render('login.ejs', { loginStatus: "Wrong Email or Password. Try Again! " });

            else if (error) throw error;

            else {
                //entry found now comparing the passwords
                bcrypt.compare(req.body.password, row.pass, function (err, result) {
                    // result == true
                    if (result == true) {
                        console.log('Authenticated successfully');
                        console.log(row.admin_id);
                        req.session.admin_id = row.admin_id;
                        res.redirect('/newPost');
                    }
                    else {
                        res.render('login.ejs', { loginStatus: "Wrong Email or Password. Try Again! " });
                    }
                });
            }



        });
    });



//Register Route
app.route('/Register')
    .get((req, res) => {
        res.render('register.ejs');
    })
    .post((req, res) => {
        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            // Store hash in your DB.
            if (err) throw err;
            var query1 = 'insert into Admin (username,pass) values (?,?);';
            db.run(query1, [req.body.userName, hash], (error) => {
                if (error) throw error;
                console.log('Value inserted successfuly');
            });

            //counting the number of users to get the uid of latest added user and storing it in the session variable
            //there can be mush efficient way but this is what I thought of
            db.get('SELECT count(*) as aid from Admin', [], function (error, row) {
                if (error) throw error;
                req.session.admin_id = row.aid;
                console.log("Admin id is " + req.session.admin_id);
                res.redirect('/newPost');
            });
        });
    });



//News Route
app.use('/news/:b_id', express.static('public')); //for serving static files at dynamic routes as its not by default
app.get('/news/:b_id', (req, res) => {
    var b_id = req.params.b_id;
    db.get('select * from News where b_id=?', [b_id], (error, result) => {
        if (error) console.log(error);

        res.render('news', { news: result });
    });

});
app.delete('/News/:b_id', (req, res) => {
    db.get('select * from News where b_id=?', [req.params.b_id], (error, row) => {
        if (error) console.log(error);

        //if someone else is trying to delete the post other than admin then send unauthorized
        if (req.session.admin_id == undefined) {
            res.json({ message: "Not Authorized" });
        }
        else {
            //delete the row from database
            db.run('DELETE FROM News WHERE b_id=?;', [req.params.b_id], (error) => {
                if (error) console.log(error);
                console.log("Deleted the Post");

                //Delete the file from uploads folder
                fs.unlink('./public/uploads/' + row.photo, function (err) {
                    if (err) throw err;
                    // if no error, file has been deleted successfully
                    console.log('File deleted!');
                });
                res.json({ message: "success" });

            });
        }
    });

});


//New Post Route
app.route('/newPost')
    .get((req, res) => {
        //Only logged in users can add new post
        if (req.session.admin_id == null) {
            res.redirect('/Login');
        }
        else {
            res.render("newpost.ejs");
        }
    })
    .post(upload.single('img'), (req, res) => {
        var query = "insert into News(title,postBody,photo,dateandTime,author,priority,admin_id,cat_id) values (?,?,?,datetime('now', 'localtime'),?,?,?,?);";
        db.run(query, [req.body.title, req.body.postBody, req.file.filename, req.body.author, req.body.priority, req.session.admin_id, req.body.category], (error) => {
            if (error) console.log(error)
            console.log("Inserted Succesfully");
            res.redirect('/');
        });
    });



app.listen(process.env.PORT || 3000, () => {
    console.log("Server started ");
})
