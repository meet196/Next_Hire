const userModel = require("../models/user.model");

exports.getAllUsersController = async (req, res) => {
  try {
     const users = await userModel.find()
    res.status(200).json({
        message:'All Users Data Fetched Successfully',
        users
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUserController = async (req, res) => {
  try {
      const {id} = req.params

      const deletedUser = await userModel.findByIdAndDelete(id)
      if (!deletedUser) {
        return res.status(404).json({
            message: 'User Not Found'
        })
    }

    res.status(200).json({
        message: 'User Deleted Successfully',
        user: deletedUser
    })

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
