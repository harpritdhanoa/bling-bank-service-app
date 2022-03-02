const express = require('express');
const app = express();
const {pool} = require("./dbConfig");
const dotenv = require('dotenv');
dotenv.config();
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require("passport");
const initializePassport = require("./passportConfig");
const { request } = require('express');
initializePassport(passport);
const PORT = process.env.PORT || 4000;

// middleware
app.set('view engine','ejs');
app.use(express.urlencoded({extended:false}));
app.use(session({
    secret : 'secret', //longer the secure, should be kept as a variable
    resave: false, //
    saveUninitialized:false // do u want save session variables?
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get('/',(req,res)=> {
    res.render("index");
});

app.get('/users/register', checkAuthenticated, (req,res)=>{
    res.render("register");
});

app.get('/users/login',checkAuthenticated,(req,res)=>{
    res.render("login");
})

app.get('/users/dashboard',checkNotAuthenticated, (req,res)=>{
    res.render("dashboard",{user:req.user.name});
})

app.get('/users/logout',(req,res)=>{
    req.logOut();
    req.flash("success_msg","You have successfully logged out");
    res.redirect("/users/login");
})

app.post('/users/register',async (req,res)=>{
    let {name,email, password,password2} = req.body;
    console.log({name,email, password,password2});

    let errors = [];

    if(!name || !email ||!password || !password2)
        errors.push({message: "Please enter all fields"});

    if(password.length < 6)
        errors.push({message: "Password length should be 6 characters"});

    if(password != password2 )
        errors.push({message: "Passwords should match"});   
        
    if(errors.length > 0){
        res.render("register", {errors}) 
    }else {
        let hashedPassword =  await bcrypt.hash(password,10);
        console.log(hashedPassword);
        pool.query(
            `Select * from arch.user where username = $1`, [email], (err,results) =>{
                if(err){
                    throw err
                } 
                if(results.rows.length > 0 ) {
                    console.log(JSON.stringify(results.rows[0]));
                    errors.push({message: "User already exists by the name "+results.rows[0].name}); 
                    res.render("register", {errors});
                } else{
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
        )
    }
});

app.post("/users/login",passport.authenticate('local',{
    successRedirect: '/users/dashboard',
    failureRedirect:'/users/login',
    failureFlash:true
}));

function checkAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return res.redirect("/users/dashboard");
    }
    next();
}

function checkNotAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    return res.redirect("/users/login");;
}

app.listen(PORT,()=>{
    console.log(`Server running on Port ${PORT}`);
});