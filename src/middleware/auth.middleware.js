import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"


export const verifyJWT = asyncHandler( async(req , res , next) => {
    try {

        // getting the access token from the cookies 
        const accessToken = req.cookies?.accessToken || req.header
        ("Authorization")?.replace("Bearer ", "")
    
        // if access token is not found 
        if (!accessToken) {
            throw new ApiError(401 , "Unauthorized user")
        }
        
        // checking if the token in server and sent from user matches 
        const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)

        // returns the user after authentication is done based on the token 
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        // if user not found 
        if (!user){
            throw new ApiError(401 , "Invalid Access Token")
        }

        // the authenticated user is attached to the request body 
        req.user = user;

        // move to next operation 
        next() 
    } catch (error) {
        throw new ApiError(401 , error?.message || "INVALID ACCESS TOKEN")
    }

})