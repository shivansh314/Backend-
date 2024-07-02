import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user detail from frontend
  const { fullName, email, username, password } = req.body;
  console.log("Email", email);

  //validation
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, " all fields are required");
  }

  // checking if user already exist
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, " user already existed ");
  }

  //check for images and avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  console.log(avatarLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //upload them on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath); // NOTE -  await doesnt proceed with the program untili this is done
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // create user object - databse

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //check for userObject in database
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" // we dont want the user to see this field
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user ");
  }

  //return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered succesfully "));
});

const loginUser = asyncHandler(async (req, res) => {
  //request body from user
  const { email, username, password } = req.body;
  console.log(email, password, username);

  if (!username || !email) {
    throw new ApiError(400, " username or email is required");
  }

  // find the user based on either username or  : $or
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // check if user exist
  if (!user) {
    throw new ApiError(404, " User does not exist");
  }

  // check password
  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid user Credentials");
  }

  // generate access and refresh token - creating a method
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  // send cookies
  const loggedinUser = await User.findById(user._id);
  console.log(loggedinUser);

  const options = {
    // cookies option
    httpOnly: true,
    secure: true,
  };

  //return response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedinUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //find the user and update the refreshtoken

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the value from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  // we dont want the accessToken and refreshToken anymore
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshToken = asyncHandler(async (req, res) => {
  // get the refresh token from the user cookies
  // decode the refreshToken
  // verify if both the accesstoken matches
  // create a new refresh and access token
  // send back this refresh token

  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, " The refresh token is missing or used");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // get new and old password
  const { oldPassword, newPassword } = req.body;

  // get the user
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  // password validation
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  // update and save password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // return response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changes successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // get the info
  const { fullName, email } = req.body;

  // validation
  if (!fullName || !email) {
    throw new ApiError(400, " feild is missing ");
  }

  //finding and updating
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  //return the updated user
  res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated succesfully "));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched succesfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  //get the path of the new image from the user
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  //TODO: delete old image - assignment

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  getCurrentUser,
  updateAccountDetails,
  changeCurrentPassword,
  updateCoverImage,
  updateUserAvatar,
};
