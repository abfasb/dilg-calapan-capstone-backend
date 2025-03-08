import express from "express";
import { getAllUsers } from "../controllers/usersController";
import { getUsers } from "../controllers/authController";

const router = express.Router();

router.get("/users", getAllUsers);
router.get("/users/:id", getUsers);

export default router;