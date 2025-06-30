import express from "express";
import { deleteAccount, freezeAccount, getAllUsers, getSystemHealth, verifySession } from "../controllers/usersController";
import { getUsers } from "../controllers/authController";

const router = express.Router();

router.get("/users", getAllUsers);
router.get("/users/:id", getUsers);

router.get("/system-health", getSystemHealth);


router.put("/freeze-account/:id", freezeAccount);
router.delete("/delete-account/:id", deleteAccount);
router.get("/verify-session", verifySession);

export default router;