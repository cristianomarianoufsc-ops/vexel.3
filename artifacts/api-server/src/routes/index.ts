import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import platformsRouter from "./platforms";
import postsRouter from "./posts";
import ideasRouter from "./ideas";
import assetsRouter from "./assets";
import statsRouter from "./stats";
import uploadStorageRouter from "./uploadStorage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(platformsRouter);
router.use(postsRouter);
router.use(ideasRouter);
router.use(assetsRouter);
router.use(statsRouter);
router.use(uploadStorageRouter);

export default router;
