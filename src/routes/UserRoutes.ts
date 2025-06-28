import express from "express";
import { getAllUsers, getSystemHealth } from "../controllers/usersController";
import { getUsers } from "../controllers/authController";

const router = express.Router();

router.get("/users", getAllUsers);
router.get("/users/:id", getUsers);

router.get("/system-health", getSystemHealth);

export default router;