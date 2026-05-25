import cors from "cors";

const corsConfig = cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],

  credentials: true,

  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],

  allowedHeaders: ["Content-Type", "Authorization"],
});

export default corsConfig;
