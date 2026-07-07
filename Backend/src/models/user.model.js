const mongoose = require('mongoose')

const userSchema =new mongoose.Schema({
    username:{
        type:String,
        unique:[true,'username already taken'],
        required:true,
    },
    email:{
        type:String,
        unique:[true,'Account already Exists with this Email'],  
        required:true,
    },
    password:{
        type:String,
        required:true
    },
  role: {
         type: String,
         enum: ["user", "admin"],
         default: "user"
}
})

const userModel =mongoose.model('user',userSchema)

module.exports = userModel