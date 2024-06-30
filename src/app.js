// for - routing , cors , necessary  middleware 


import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

// app.use() - this is used to define middleware that runs on every request regardless of the method 


// To avoid CORS error 
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    // credentials are cookies , or authentication headers like username password 
    credentials: true
}))

// parses the incoming json data 
app.use(express.json({limit: "16kb"}))

// allows parsing of the url encoded data 
app.use(express.urlencoded({extended: true, limit: "16kb"}))

// this middleware serve static files such as images , css 
app.use(express.static("public"))

// this middleware parses coookies attached to the request - req.cookies
app.use(cookieParser())


//routing
import router from './routes/user.routes.js'

app.use("/api/v1/users", router)


export { app }