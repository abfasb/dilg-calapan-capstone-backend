import express from "express";
import { getAllUsers } from "../controllers/usersController";

const router = express.Router();

router.get("/users", getAllUsers);

export default router;