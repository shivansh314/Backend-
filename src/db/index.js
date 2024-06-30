import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// async function to connect to the database 
const connectDB = async() => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        console.log(`\n MongoDB connected !! DB HOST : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Mongodb connection failed" , error);
        
        // this method is provided by node.js to stop the current process as the database connection has failed 
        process.exit(1)
    }
}

export default connectDB 


// if we are talking with the database use await 