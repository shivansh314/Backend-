//  for - connecting to DB and starting the application 

import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'

// dotenv for security reasons to protect the environment variable 
dotenv.config({
    path: './.env'
})


// connecting to the database  , connectDB() is a async function that returns a promise object 

connectDB()
.then(() => {                      
    // if connection is succesfull -> start the app at port process.env.PORT or 8000
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})




/*
import express from "express"
const app = express()

(  async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        application.on("error"  , (error) => {
            console.log("ERROR: " , error);
            throw error
        })

        app.listen(process.env.PORT , ()=> {
            console.log(`Ap is listening on posr ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("ERROR" , error )
        throw err
    }
})()
*/