
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js';
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user =  await User.findById(userId)

    const accecssToken = user.generateAccessToken()
    const refreshToken  = user.generateRefreshToken()

    user.refreshToken = refreshToken
    //  no need for validation we are just adding refresh token 
    await user.save({validateBeforeSave : false }) 

    return { accecssToken , refreshToken }
  } catch (error) {
    throw new ApiError(500 , "something went wrong while generating access and refresh tokens ")
  }
}

const registerUser = asyncHandler( async (req, res) => {
  
  // get user detail from frontend 
  const { fullName, email, username, password } = req.body;
  console.log("Email" , email);

  //validation 
  if (
    [fullName , email , username , password].some( (field)=> field?.trim() === "")
  ){
    throw new ApiError( 400 , " all fields are required")
  }

  // checking if user already exist 
  const existedUser = await User.findOne({
    $or: [ {username} , {email}]
  })

  if ( existedUser) {
    throw new ApiError( 409 , " user already existed ")
  }


  //check for images and avatar 
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  console.log(avatarLocalPath);
  

  if(!avatarLocalPath){
    throw new ApiError( 400 , "Avatar file is required")
  }

  //upload them on cloudinary   
  const avatar = await uploadOnCloudinary(avatarLocalPath)          // NOTE -  await doesnt proceed with the program untili this is done 
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  

  // create user object - databse

  const user = await User.create({
    fullName ,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    email ,
    password,
    username : username.toLowerCase(),
  })

  //check for userObject in database
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"                                // we dont want the user to see this field 
   )

   if(!createdUser) { 
    throw new ApiError(  500 , "Something went wrong while registering the user ")
   }

   //return response 
   return res.status(201).json(
    new ApiResponse(200 , createdUser , "User registered succesfully ")
   )

});

const loginUser = asyncHandler( async(req , res) => {

  //request body from user
  const { email , username, password  } = req.body

  if ( !username || !email) {
    throw new ApiError(400 , " username or email is required")
  }

  // find the user based on either username or  : $or 
  const user = await User.findOne({
    $or : [{username} , {email}]
  } )

  // check if user exist 
  if ( !user){
    throw new ApiError( 404 , " User does not exist")
  }

  // check password 
  const isPasswordCorrect =  await user.isPasswordCorrect( password )

  if( !isPasswordCorrect){
    throw new ApiError( 401 , "Invalid user Credentials")
  }

  // generate access and refresh token - creating a method 
  const { accessToken , refreshToken } = await generateAccessAndRefreshTokens(user._id)

  // send cookies 
  const loggedinUser = User.findById(user._id).select("-password -refreshToken")

  const options = {                      // cookies option
    httpOnly : true,
    secure : true ,

  }


  //return response 
  return res
  .status(200)
  .cookie("accessToken" , accessToken , options)
  .cookie("refreshToken" , refreshToken , options)
  .json(
    new ApiResponse(
      200 , 
      {
        user: loggedinUser , accessToken , refreshToken
      } ,
      "User logged in succesfully"
    )
  )

   
})

const logoutUser = asyncHandler(async(req , res) => {
  //find the user
})

export { registerUser ,
        loginUser ,
        logoutUser
};
 
