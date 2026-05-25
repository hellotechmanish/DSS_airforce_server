import type { Request, Response } from "express";

import * as authService from "../services/auth.service.js";

export const signup = async (req: Request, res: Response) => {
  try {
    const result = await authService.signup(req.body);

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.message,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.message,
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = await authService.forgotPassword(req.body);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.message,
    });
  }
};
