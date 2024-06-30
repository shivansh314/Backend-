import { Router } from "express";
import { loginUser, logoutUser, registerUser } from '../controllers/user.controller.js';
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js"

const router = Router();


//adding multer middleware for file handling 

router.route("/register").post(
    upload.fields([{
        name: "avatar",
        maxCount : 1
    },
    {
        name : "coverImage",
        maxCount : 1
    }     
    ]),
    registerUser);

  router.route("/login").post(loginUser)

  //secured routes 
  router.route("/logout").post(verifyJWT  , logoutUser)

export default router; 