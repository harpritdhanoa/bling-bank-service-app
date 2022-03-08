const LocalStrategy = require("passport-local").Strategy;
const{pool} = require("./dbConfig");
const bcrypt = require("bcrypt");

function initialize(passport) {

    const authenticateUser = (email,password,done) => {
        pool.query(
            `Select * from arch.user where username = $1`,
            [email],
            (err,results) => {
                if(err) {
                    throw err;
                }
                //console.log('results >>> '+JSON.stringify(results));
                if(results.rows.length > 0) {
                    const user = results.rows[0];
                    //console.log('password >>> '+password+' user.password >>> '+results.rows[0].password__c);
                    bcrypt.compare(password,results.rows[0].password__c, (err,isMatch)=>{
                        if(err) {
                            throw err;
                        }
                        if(isMatch) {
                            return done(null,user);
                        } else {
                            return done(null,false,{message: "Password is incorrect"});
                        }
                    })
                }  else {
                    return done(null,false,{message: "Email not registered"});    
                }                 

            }
        );
    };

    passport.use(
        new LocalStrategy({
            usernameField:"email",
            passwordField:"password"
        },
        authenticateUser
        )
    );
    
    // stores user id in session cookie
    passport.serializeUser((user,done) => done(null,user.id));
    
    // uses id to obtain user details from db and store it in front end
    passport.deserializeUser((id,done)=>{
        pool.query(
            `Select * from arch.user where id = $1`,
            [id],
            (err,results) => {
                if(err) {
                    throw err;
                }
                return done(null,results.rows[0]);    
            }
        );
    })
}
module.exports = initialize;