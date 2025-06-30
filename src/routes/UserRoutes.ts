import express from "express";
import { deleteAccount, freezeAccount, getAllUsers, getSystemHealth } from "../controllers/usersController";
import { getUsers } from "../controllers/authController";

const router = express.Router();

router.get("/users", getAllUsers);
router.get("/users/:id", getUsers);

router.get("/system-health", getSystemHealth);


router.put("/freeze-account", freezeAccount);
router.delete("/delete-account", deleteAccount);

export default router;