import express from "express";
import { Request, Response } from "express";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  try {
    // const response = await fetch('https://api.bankfxapi.com/v1/bank/NBET', {
    //     headers: {
    //         'Authorization': `Bearer ${process.env.BANKFX_API_KEY}`
    //     }
    // });

    const response = await fetch(
      `https://api.bankfxapi.com/v1/bank/NBET?api_key=${process.env.BANKFX_API_KEY}`
    );
    const data = await response.json();
    //  console.log("Backend data: ", data)
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

export default router;
