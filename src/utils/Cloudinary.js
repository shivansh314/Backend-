//File uploading utility 

import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name : process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret : process.env.api_secret,
});


const uploadonCloudinary = async(localfilepath) => {
    try {
        if (!localfilepath)   return null
        // upload on cloudinary 
        const response = await cloudinary.uploader.upload(localfilepath , {
            resource_type : "auto"
        })

        //file has been uploaded successfully
        console.log("file has been uploaded succesfully" , response.url);

        return response

        
    } catch (error) {
        fs.unlinkSync(localfilepath) // remove the locally saved temporary file as the upload operation got failed
        return null


    }
}


export {uploadonCloudinary}