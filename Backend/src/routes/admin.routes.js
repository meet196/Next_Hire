const {Router} = require("express")
const {authUser} = require("../middleware/auth.middleware");
const {isAdmin} = require("../middleware/admin.middleware");
const adminController = require("../controllers/admin.controller");


const adminRouter = Router()


adminRouter.get("/users",authUser,isAdmin, adminController.getAllUsersController);
adminRouter.delete("/users/:id",authUser,isAdmin, adminController.deleteUserController);



module.exports = adminRouter
