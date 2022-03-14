const express = require("express");
const app = express();
const { pool } = require("./dbConfig");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const initializePassport = require("./passportConfig");
const { request } = require("express");
initializePassport(passport);
//const SLDS_DIR = "/node_modules/@salesforce-ux/design-system/assets";
var bodyParser = require("body-parser");
var multer = require("multer");
//const { DeleteCompositeSubrequestBuilder } = require("@salesforce/salesforce-sdk/dist/api/unit-of-work/CompositeSubrequest");
var forms = multer();
const PORT = process.env.PORT || 4000;

var oldCase = {};
var caseObj = [];
var caseFields = {
  id: "Case Id",
  origin: "Origin",
  subject: "Subject",
  status: "Status",
  description: "Description",
};

// middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "secret", //longer the secure, should be kept as a variable
    resave: false, //
    saveUninitialized: false, // do u want save session variables?
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//app.use("/slds", express.static(__dirname + SLDS_DIR));

// for parsing application/json
app.use(bodyParser.json());
// for parsing application/xwww-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(forms.array());

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/users/register", checkAuthenticated, (req, res) => {
  res.render("register");
});

app.get("/users/login", checkAuthenticated, (req, res) => {
  res.render("login");
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {
  res.render("dashboard", { user: req.user.name });
});

app.get("/cases", checkNotAuthenticated, fetchCases, (req, res) => {
  //res.render("cases", { user: req.user.name });
});

app.get("/case/:id", checkNotAuthenticated, fetchCase, (req, res) => {
});

app.post("/case/:id", checkNotAuthenticated, updateCase, (req, res) => {
});

app.get("/newCase", checkNotAuthenticated, (req, res) => {
  console.log(" before render");
  this.caseObj = [];
  for (var key in caseFields) {
    this.caseObj.push({
      apiName: key,
      label: caseFields[key],
      value: '',
    });
  }
  res.render("newCase", { caseObj: this.caseObj });
});

app.post("/newCase", checkNotAuthenticated, createCase, (req, res) => {
});

app.get("/users/logout", (req, res) => {
  req.logOut();
  req.flash("success_msg", "You have successfully logged out");
  res.redirect("/users/login");
});

app.post("/users/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;
  console.log({ name, email, password, password2 });

  let errors = [];

  if (!name || !email || !password || !password2)
    errors.push({ message: "Please enter all fields" });

  if (password.length < 6)
    errors.push({ message: "Password length should be 6 characters" });

  if (password != password2) errors.push({ message: "Passwords should match" });

  if (errors.length > 0) {
    res.render("register", { errors });
  } else {
    let hashedPassword = await bcrypt.hash(password, 10);
    //console.log(hashedPassword);
    pool.query(
      `Select * from arch.user where username = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        if (results.rows.length > 0) {
          console.log(JSON.stringify(results.rows[0]));
          errors.push({
            message: "User already exists by the name " + results.rows[0].name,
          });
          res.render("register", { errors });
        } else {
          pool.query(
            `INSERT INTO arch.user (name, username, email, password__c)
                            VALUES ($1, $2, $2, $3)
                            RETURNING id, password__c`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash("success_msg", "You are now registered. Please log in");
              res.redirect("/users/login");
            }
          );
        }
      }
    );
  }
});

app.post(
  "/users/login",
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  console.log(" checkNotAuthenticated ");
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect("/users/login");
}

function fetchCases(req, res, next) {
  console.log(" Am executed" + req.user.id);
  pool.query(
    "select " +
      Object.keys(caseFields).join(",") +
      " from getcases(" +
      req.user.id +
      ");",
    (err, results) => {
      if (err) {
        throw err;
      }
      if (results.rows.length > 0) {
        //console.log(results.rows);
        req.flash("success_msg", "Cases retreived");
        res.render("cases", { cases: results.rows });
      }
      if (results.rows.length == 0) {
        console.log(JSON.stringify(results.rows[0]));
        errors.push({ message: "No Cases found" });
        res.render("cases", { errors });
      }
      //pool.end();
    }
  );
}

function fetchCase(req, res, next) {
  console.log(
    "fetch case >> " +
      req.params.id +
      "req.body.body >> " +
      JSON.stringify(req.body)
  );

  pool.query(
    "select " +
      Object.keys(caseFields).join(",") +
      " from getcase(" +
      req.user.id +
      "," +
      req.params.id +
      ");",
    (err, results) => {
      if (err) {
        throw err;
      }
      if (results.rows.length > 0) {
        this.caseObj = [];
        for (var key in caseFields) {
          this.caseObj.push({
            apiName: key,
            label: caseFields[key],
            value: results.rows[0][key],
          });
        }
        console.log(" this.caseObj >>>> " + JSON.stringify(this.caseObj));
        res.render("case", { caseObj: this.caseObj, caseId:results.rows[0].id  }, function (err, html) {
          if (err) {
            throw err;
          }
          this.oldCase = results.rows[0];
          res.send(html);
        });
      }
      if (results.rows.length == 0) {
        errors.push({ message: "No Case found" });
        res.render("case", { errors });
      }
      //pool.end();
    }
  );
}

function updateCase(req, res, next) {
  console.log(" ++ update case ++");
  console.log(
    "update case >> " +
      req.params.id +
      " Stringified req >> " +
      JSON.stringify(req.body)
  );
  const part1 = "UPDATE arch.case SET ";
  let part2 = "";
  const part3 =
    "WHERE id = " +
    req.params.id +
    " RETURNING " +
    Object.keys(caseFields).join(",") +
    ";";

  // Only add fields if their values have changed
  for (var key in req.body) {
    part2 += ` ${key} = '${req.body[key]}',`;
  }
  // Clean the comma at the end!
  if (part2 != "") part2 = part2.substring(0, part2.length - 1);

  console.log(" SQL query --> ");
  console.log(part1);
  console.log(part2);
  console.log(part3);

  if (part2 != "") {
    pool.query(part1 + part2 + part3, (err, results) => {
      if (err) {
        throw err;
      }
      //console.log(JSON.stringify(results));
      if (results.rows && results.rows.length == 1) {
        console.log(' ------record updated ' );
        req.flash("success_msg", "Case Updated");
        res.redirect('/case/'+results.rows[0].id);
      }
      if (results.rows.length == 0) {
        errors.push({ message: "Case not updated" });
        res.render("case", { errors });
      }
      //pool.end();
    });
  }
}

function createCase(req, res, next) {
  console.log(" ++ createCase ++");

  const part1 = "INSERT INTO arch.case ("+Object.keys(req.body).join(",")+") ";
  const part2 = "VALUES ("+Object.values(req.body).map(str => `'${str}'`).join(",")+") ";
  const part3 = "RETURNING * ";

  console.log(" SQL query --> ");
  console.log(part1);
  console.log(part2);
  console.log(part3);

  if (Object.keys(req.body).length > 0) {
    pool.query(part1 + part2 + part3, (err, results) => {
      if (err) {
        throw err;
      }
      if (results.rows && results.rows.length == 1) {
        console.log(' ------record created with id '+results.rows[0]['id'] );
        req.flash("success_msg", "case created");
        res.redirect("/case/"+results.rows[0]['id']);
      }
      if (results.rows.length == 0) {
        errors.push({ message: "Case not created" });
        res.render("case", { errors });
      }
      //pool.end();
    });
  }
}

app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
